import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Base64URL encode helper
function base64UrlEncode(data: string): string {
  const base64 = btoa(data);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

// Parse PEM private key
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Get Firebase access token using Service Account
async function getFirebaseAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  console.log('🔑 Getting Firebase access token...');
  
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = arrayBufferToBase64Url(signature);
  const jwt = `${unsignedToken}.${signatureB64}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OAuth token error:', errorText);
    throw new Error(`Failed to get Firebase access token: ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Firebase access token obtained');
  return data.access_token;
}

// Send FCM notification via HTTP v1 API
async function sendFCMMessage(
  token: string,
  title: string,
  body: string,
  projectId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  const fcmPayload = {
    message: {
      token,
      notification: {
        title,
        body
      }
    }
  };
  
  console.log('📤 Sending FCM message to token:', token.substring(0, 30) + '...');

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FCM send error:', errorText);
      
      if (errorText.includes('UNREGISTERED') || errorText.includes('INVALID_ARGUMENT')) {
        return { success: false, error: 'invalid_token' };
      }
      
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('✅ FCM message sent:', result.name);
    return { success: true };
  } catch (error) {
    console.error('❌ FCM send exception:', error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, data, notification_id, role } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📬 Processing push notification for user:', user_id);
    console.log('📬 User role (raw):', role || 'client (default)');

    // CRÍTICO: Normalizar role a minúsculas ANTES de determinar el servicio
    // Esto asegura que siempre use el servicio correcto independientemente de mayúsculas/minúsculas
    const normalizedRole = (role || 'client').toLowerCase().trim();
    console.log('📬 User role (normalized):', normalizedRole);

    // Determine which Firebase service account to use based on normalized role
    const isPartner = normalizedRole === 'partner';
    // CRÍTICO: Usar el nombre exacto del secreto: FIREBASE_SERVICE_ACCOUNT_CLIENT (no CLIENTE)
    const serviceAccountSecretName = isPartner 
      ? 'FIREBASE_SERVICE_ACCOUNT_PARTNER' 
      : 'FIREBASE_SERVICE_ACCOUNT_CLIENT';
    
    console.log('📬 Using Firebase service account:', serviceAccountSecretName);

    // Get Firebase service account based on role
    const serviceAccountJson = Deno.env.get(serviceAccountSecretName);
    if (!serviceAccountJson) {
      console.error(`❌ ${serviceAccountSecretName} not configured`);
      console.error(`❌ Available env vars: ${Object.keys(Deno.env.toObject()).filter(k => k.includes('FIREBASE')).join(', ')}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Firebase service account not configured for role: ${normalizedRole}. Please configure ${serviceAccountSecretName}.` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
    console.log('📬 Firebase project:', serviceAccount.project_id);
    console.log('📬 Firebase project ID from service account:', serviceAccount.project_id);
    
    // Use the project_id from the correct Service Account (already determined by role)
    const firebaseProjectId = serviceAccount.project_id;

    // Determine user type from request (role takes precedence over data.user_type)
    const user_type = role || data?.user_type || 'client';
    // CRÍTICO: Normalizar a minúsculas para asegurar match exacto con la tabla
    // La tabla client_devices usa 'client' y 'partner' en minúsculas
    const normalizedUserType = (user_type || '').toLowerCase().trim();
    const userRole = normalizedUserType === 'partner' ? 'partner' : 'client';
    
    // CRÍTICO: Log específico para diagnóstico - ANTES de buscar en la tabla
    console.log(`DEBUG: Buscando token para user ${user_id} con el rol exacto: ${userRole}`);
    
    console.log(`📬 User type determined: ${user_type}`);
    console.log(`📬 Normalized role: ${userRole} (original: ${user_type})`);
    console.log(`📬 Using table: client_devices (unified table)`);
    console.log(`📬 Filtering by role: ${userRole}`);
    
    // DEBUG: Log justo antes de la consulta SQL
    console.log(`DEBUG: Consultando client_devices para user: ${user_id} y role: ${userRole}`);
    
    // Get FCM tokens from client_devices table (unified table for both clients and partners)
    // Filter by user_id AND role to get the correct devices
    // CRÍTICO: Asegurar que el role sea exactamente 'client' o 'partner' en minúsculas
    const { data: devices, error: devicesError } = await supabase
      .from('client_devices')
      .select('id, fcm_token, platform')
      .eq('user_id', user_id)
      .eq('role', userRole);  // userRole ya está normalizado a 'client' o 'partner' en minúsculas

    if (devicesError) {
      console.error('❌ Error fetching devices:', devicesError);
      console.error('❌ Error details:', JSON.stringify(devicesError, null, 2));
      throw new Error(`Failed to fetch devices from client_devices: ${devicesError.message}`);
    }

    if (!devices || devices.length === 0) {
      console.log(`⚠️ No devices found in client_devices for user ${user_id} with role ${userRole}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          sent: 0,
          message: `No devices registered in client_devices for this user with role ${userRole}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`✅ Found ${devices.length} device(s) for user ${user_id}`);

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken(serviceAccount);

    // Send FCM notifications to all devices
    let successCount = 0;
    let failCount = 0;
    const invalidTokenIds: string[] = [];

    for (const device of devices) {
      console.log(`📤 Sending FCM to device ${device.id} (platform: ${device.platform})...`);
      
      // Use project_id from the Service Account (already determined by role)
      const result = await sendFCMMessage(
        device.fcm_token,
        title,
        body,
        firebaseProjectId, // Uses project_id from the correct Service Account based on role
        accessToken
      );

      if (result.success) {
        successCount++;
        console.log(`✅ FCM sent successfully to device ${device.id}`);
      } else {
        failCount++;
        if (result.error === 'invalid_token') {
          invalidTokenIds.push(device.id);
          console.log(`⚠️ Invalid token for device ${device.id}, will be cleaned up`);
        } else {
          console.error(`❌ Failed to send FCM to device ${device.id}:`, result.error);
        }
      }
    }

    // Clean up invalid tokens
    if (invalidTokenIds.length > 0) {
      console.log(`🧹 Cleaning up ${invalidTokenIds.length} invalid token(s)`);
      const { error: deleteError } = await supabase
        .from('client_devices')
        .delete()
        .in('id', invalidTokenIds);

      if (deleteError) {
        console.error('❌ Error cleaning up invalid tokens:', deleteError);
      } else {
        console.log(`✅ Cleaned up ${invalidTokenIds.length} invalid token(s)`);
      }
    }

    // Update notification status if notification_id provided
    if (notification_id) {
      await supabase
        .from('client_notifications')
        .update({ read: false }) // Mark as sent but not read
        .eq('id', notification_id);
    }

    console.log(`Push notification results: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        message: `Sent to ${successCount} devices, ${failCount} failed`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
