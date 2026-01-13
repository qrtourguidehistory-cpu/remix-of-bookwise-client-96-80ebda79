package com.bookwise.client;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import androidx.annotation.NonNull;
import org.json.JSONObject;
import java.io.IOException;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import java.util.concurrent.TimeUnit;

/**
 * Manager para obtener y enviar tokens FCM al backend
 */
public class FCMTokenManager {
    
    private static final String TAG = "FCMTokenManager";
    private static final String SUPABASE_URL = "https://rdznelijpliklisnflfm.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkem5lbGlqcGxpa2xpc25mbGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjY4MzAsImV4cCI6MjA3ODIwMjgzMH0.o8G-wYYIN0Paw20YP4dSJcL5mf2mUdrfcWRfMauFjGQ";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    /**
     * Obtiene el token FCM actual de Firebase
     */
    public static void getFCMToken(Context context) {
        Log.d(TAG, "🚀 ===== SOLICITANDO TOKEN FCM ===== ");
        
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(new OnCompleteListener<String>() {
                @Override
                public void onComplete(@NonNull Task<String> task) {
                    if (!task.isSuccessful()) {
                        Log.e(TAG, "❌ Error al obtener token FCM", task.getException());
                        return;
                    }
                    
                    String token = task.getResult();
                    if (token != null && !token.isEmpty()) {
                        Log.d(TAG, "✅ Token FCM obtenido: " + token.substring(0, Math.min(30, token.length())) + "...");
                        Log.d(TAG, "📱 Token completo: " + token);
                        
                        // Guardar token en SharedPreferences
                        SharedPreferences prefs = context.getSharedPreferences("bookwise_fcm", Context.MODE_PRIVATE);
                        prefs.edit()
                            .putString("fcm_token", token)
                            .putBoolean("token_pending_sync", true)
                            .apply();
                        
                        Log.d(TAG, "💾 Token guardado en SharedPreferences");
                        
                        // Intentar enviar al backend si hay usuario logueado
                        sendTokenToBackend(context, token);
                    } else {
                        Log.w(TAG, "⚠️ Token FCM vacío o nulo");
                    }
                }
            });
    }
    
    /**
     * Envía el token FCM al backend (Supabase client_devices)
     * Solo se ejecuta si hay un userId válido
     */
    public static void sendTokenToBackend(Context context, String fcmToken) {
        SharedPreferences prefs = context.getSharedPreferences("bookwise_auth", Context.MODE_PRIVATE);
        String userId = prefs.getString("user_id", null);
        String accessToken = prefs.getString("access_token", null);
        
        Log.d(TAG, "🔍 ===== VERIFICANDO CREDENCIALES ===== ");
        Log.d(TAG, "📱 userId desde SharedPreferences: " + (userId != null ? userId : "null"));
        Log.d(TAG, "📱 accessToken presente: " + (accessToken != null && !accessToken.isEmpty()));
        
        if (userId == null || userId.isEmpty()) {
            Log.w(TAG, "⚠️ No hay userId, token se enviará después del login");
            Log.w(TAG, "💾 Token guardado: " + fcmToken.substring(0, Math.min(30, fcmToken.length())) + "...");
            return;
        }
        
        Log.d(TAG, "📤 ===== ENVIANDO TOKEN A BACKEND ===== ");
        Log.d(TAG, "📱 userId: " + userId);
        Log.d(TAG, "📱 fcm_token: " + fcmToken.substring(0, Math.min(30, fcmToken.length())) + "...");
        Log.d(TAG, "📱 platform: android");
        
        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("user_id", userId);
                payload.put("fcm_token", fcmToken);
                payload.put("platform", "android");
                payload.put("device_info", new JSONObject()
                    .put("timestamp", System.currentTimeMillis())
                    .put("app_version", "1.0.0"));
                payload.put("updated_at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                    .format(new java.util.Date()));
                
                OkHttpClient client = new OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .writeTimeout(30, TimeUnit.SECONDS)
                    .build();
                
                RequestBody body = RequestBody.create(payload.toString(), JSON);
                Request.Builder requestBuilder = new Request.Builder()
                    .url(SUPABASE_URL + "/rest/v1/client_devices")
                    .addHeader("Content-Type", "application/json")
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Prefer", "resolution=merge-duplicates,return=representation") // UPSERT y retornar registro
                    .post(body);
                
                // Agregar token de autenticación si existe
                if (accessToken != null && !accessToken.isEmpty()) {
                    requestBuilder.addHeader("Authorization", "Bearer " + accessToken);
                    Log.d(TAG, "🔐 Usando token de autenticación");
                } else {
                    Log.w(TAG, "⚠️ No hay access_token, usando anon key");
                }
                
                Request request = requestBuilder.build();
                
                Log.d(TAG, "🌐 Enviando request a: " + request.url());
                Log.d(TAG, "📦 Payload: " + payload.toString());
                
                Response response = client.newCall(request).execute();
                String responseBody = response.body() != null ? response.body().string() : "";
                
                if (response.isSuccessful()) {
                    Log.d(TAG, "✅ ===== TOKEN REGISTRADO EXITOSAMENTE ===== ");
                    Log.d(TAG, "✅ Status code: " + response.code());
                    Log.d(TAG, "✅ Response: " + responseBody);
                    
                    // Marcar token como sincronizado
                    prefs.edit()
                        .putBoolean("token_pending_sync", false)
                        .apply();
                } else {
                    Log.e(TAG, "❌ ===== ERROR AL REGISTRAR TOKEN ===== ");
                    Log.e(TAG, "❌ Status code: " + response.code());
                    Log.e(TAG, "❌ Response: " + responseBody);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Excepción al enviar token al backend", e);
                e.printStackTrace();
            }
        }).start();
    }
    
    /**
     * Método llamado después del login para sincronizar el token pendiente
     */
    public static void onUserLoggedIn(Context context, String userId, String accessToken) {
        Log.d(TAG, "🔐 ===== USUARIO LOGEADO, SINCRONIZANDO TOKEN ===== ");
        Log.d(TAG, "📱 userId: " + userId);
        
        // Guardar credenciales
        SharedPreferences authPrefs = context.getSharedPreferences("bookwise_auth", Context.MODE_PRIVATE);
        authPrefs.edit()
            .putString("user_id", userId)
            .putString("access_token", accessToken)
            .apply();
        
        // Obtener token FCM guardado o solicitar uno nuevo
        SharedPreferences fcmPrefs = context.getSharedPreferences("bookwise_fcm", Context.MODE_PRIVATE);
        String savedToken = fcmPrefs.getString("fcm_token", null);
        
        if (savedToken != null && !savedToken.isEmpty()) {
            Log.d(TAG, "📱 Token FCM encontrado en cache, enviando al backend...");
            sendTokenToBackend(context, savedToken);
        } else {
            Log.d(TAG, "📱 No hay token en cache, solicitando nuevo token...");
            getFCMToken(context);
        }
    }
    
    /**
     * Método llamado después del logout para limpiar datos
     */
    public static void onUserLoggedOut(Context context) {
        Log.d(TAG, "👋 Usuario cerró sesión, limpiando datos de autenticación");
        SharedPreferences prefs = context.getSharedPreferences("bookwise_auth", Context.MODE_PRIVATE);
        prefs.edit()
            .remove("user_id")
            .remove("access_token")
            .apply();
    }
}

