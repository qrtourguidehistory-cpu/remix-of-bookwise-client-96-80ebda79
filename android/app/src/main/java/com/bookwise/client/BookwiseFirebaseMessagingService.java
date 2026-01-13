package com.bookwise.client;

import android.util.Log;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Firebase Cloud Messaging Service para Bookwise Client App
 * Maneja la recepción de notificaciones push y la actualización de tokens FCM
 */
public class BookwiseFirebaseMessagingService extends FirebaseMessagingService {
    
    private static final String TAG = "BookwiseFCMService";
    
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        
        Log.d(TAG, "🎉 ===== NUEVO TOKEN FCM GENERADO ===== ");
        Log.d(TAG, "✅ Token FCM recibido: " + token.substring(0, Math.min(30, token.length())) + "...");
        Log.d(TAG, "📱 Longitud del token: " + token.length());
        Log.d(TAG, "📱 Token completo: " + token);
        
        // El token se enviará al backend cuando el usuario inicie sesión
        // Guardamos el token en SharedPreferences para enviarlo después del login
        getSharedPreferences("bookwise_fcm", MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .putBoolean("token_pending_sync", true)
            .apply();
        
        Log.d(TAG, "💾 Token guardado en SharedPreferences, pendiente de sincronización");
        
        // Intentar enviar el token si ya hay un usuario logueado
        FCMTokenManager.sendTokenToBackend(this, token);
    }
    
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "📬 ===== NOTIFICACIÓN PUSH RECIBIDA ===== ");
        Log.d(TAG, "📱 From: " + remoteMessage.getFrom());
        Log.d(TAG, "📱 Message ID: " + remoteMessage.getMessageId());
        
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "📱 Title: " + remoteMessage.getNotification().getTitle());
            Log.d(TAG, "📱 Body: " + remoteMessage.getNotification().getBody());
        }
        
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "📱 Data payload: " + remoteMessage.getData());
        }
        
        // La notificación se manejará automáticamente por Capacitor PushNotifications
        // Este método solo registra los logs para debugging
    }
}

