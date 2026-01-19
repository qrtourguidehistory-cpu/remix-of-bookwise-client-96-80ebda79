import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FCMPayload {
  user_id: string;
  user_type: 'client' | 'partner';
  title: string;
  body: string;
  // ❌ NO usar 'data' - convierte el mensaje en DATA message
  // data?: Record<string, string>;
}

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

  // Create JWT parts
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = arrayBufferToBase64Url(signature);
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
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
// PAYLOAD MÍNIMO: Exactamente igual que Firebase Console
async function sendFCMMessage(
  token: string,
  title: string,
  body: string,
  projectId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  // PAYLOAD MÍNIMO ABSOLUTO - Sin android, sin data, sin extras
  // Idéntico a Firebase Console "Send test message"
  const fcmPayload = {
    message: {
      token,
      notification: {
        title,
        body
      }
    }
  };
  
  console.log('📤 FCM Payload (MÍNIMO):', JSON.stringify(fcmPayload, null, 2));
  console.log('📤 Token (first 30 chars):', token.substring(0, 30) + '...');

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
      
      // Check if token is invalid
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📬 send-fcm-notification: Starting...');

    // Parse request body
    // ❌ NO recibir 'data' - solo title y body para NOTIFICATION message puro
    const { user_id, user_type, title, body }: FCMPayload = await req.json();
    
    console.log('📬 Request:', { user_id, user_type, title });

    if (!user_id || !user_type || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: user_id, user_type, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get service account based on user_type
    // Use FIREBASE_SERVICE_ACCOUNT_CLIENT for clients, FIREBASE_SERVICE_ACCOUNT_PARTNER for partners
    const serviceAccountSecretName = user_type === 'partner' 
      ? 'FIREBASE_SERVICE_ACCOUNT_PARTNER' 
      : 'FIREBASE_SERVICE_ACCOUNT_CLIENT';
    
    console.log(`📬 Using Firebase service account: ${serviceAccountSecretName}`);
    
    const serviceAccountJson = Deno.env.get(serviceAccountSecretName);
    if (!serviceAccountJson) {
      console.error(`❌ ${serviceAccountSecretName} not configured`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Firebase service account not configured for role: ${user_type || 'client'}. Please configure ${serviceAccountSecretName}.` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
    console.log('📬 Firebase project:', serviceAccount.project_id);

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Select correct table based on user_type
    const tableName = user_type === 'partner' ? 'partner_devices' : 'client_devices';
    console.log(`📬 Fetching tokens from ${tableName} for user ${user_id}`);

    // Get FCM tokens for the user
    const { data: devices, error: devicesError } = await supabase
      .from(tableName)
      .select('id, fcm_token')
      .eq('user_id', user_id);

    if (devicesError) {
      console.error('❌ Database error:', devicesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch devices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!devices || devices.length === 0) {
      console.log('⚠️ No devices found for user');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No devices registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📬 Found ${devices.length} device(s)`);
    
    // Log tokens for verification
    for (const device of devices) {
      console.log(`📬 Device token (first 30 chars): ${device.fcm_token.substring(0, 30)}...`);
      console.log(`📬 Device token length: ${device.fcm_token.length}`);
      console.log(`📬 Device ID: ${device.id}`);
    }

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken(serviceAccount);

    // Send to all devices
    let successCount = 0;
    const invalidTokenIds: string[] = [];

    for (const device of devices) {
      console.log(`📤 Sending to device ${device.id}...`);
      console.log(`📤 Token being used: ${device.fcm_token.substring(0, 30)}...`);
      
      const result = await sendFCMMessage(
        device.fcm_token,
        title,
        body,
        serviceAccount.project_id,
        accessToken
      );
      
      console.log(`📤 Result for device ${device.id}:`, result);

      if (result.success) {
        successCount++;
      } else if (result.error === 'invalid_token') {
        invalidTokenIds.push(device.id);
      }
    }

    // Clean up invalid tokens
    if (invalidTokenIds.length > 0) {
      console.log(`🧹 Cleaning up ${invalidTokenIds.length} invalid token(s)`);
      await supabase
        .from(tableName)
        .delete()
        .in('id', invalidTokenIds);
    }

    console.log(`✅ Send complete: ${successCount}/${devices.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: devices.length,
        cleaned: invalidTokenIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
