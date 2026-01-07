import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

// Web Push implementation using web-push protocol
async function sendWebPushNotification(
  subscription: WebPushSubscription,
  payload: NotificationPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    // For Web Push, we need to use the Web Push protocol
    // This is a simplified implementation - in production, use web-push library
    const payloadString = JSON.stringify(payload);
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400', // 24 hours
      },
      body: payloadString,
    });

    if (!response.ok) {
      console.error('Push notification failed:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
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
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@bookwise.com';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, data, notification_id } = await req.json();

    console.log('Processing push notification for user:', user_id);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw new Error('Failed to fetch push subscriptions');
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', user_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No push subscriptions found for user' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const payload: NotificationPayload = {
      title,
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: data || {},
      tag: notification_id || `notification-${Date.now()}`,
    };

    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      const subscription: WebPushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys as { p256dh: string; auth: string },
      };

      const success = await sendWebPushNotification(
        subscription,
        payload,
        vapidPublicKey,
        vapidPrivateKey,
        vapidSubject
      );

      if (success) {
        successCount++;
        console.log('Push sent successfully to:', sub.endpoint.substring(0, 50) + '...');
      } else {
        failCount++;
        failedEndpoints.push(sub.endpoint);
        console.log('Failed to send push to:', sub.endpoint.substring(0, 50) + '...');
      }
    }

    // Clean up failed endpoints (expired subscriptions)
    if (failedEndpoints.length > 0) {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);

      if (deleteError) {
        console.error('Error cleaning up expired subscriptions:', deleteError);
      } else {
        console.log('Cleaned up', failedEndpoints.length, 'expired subscriptions');
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
