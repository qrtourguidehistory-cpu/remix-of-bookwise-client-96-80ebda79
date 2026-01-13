package com.bookwise.client;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin de Capacitor para sincronizar token FCM después del login
 * Se llama desde JavaScript cuando el usuario inicia sesión
 */
@CapacitorPlugin(name = "FCMTokenSync")
public class FCMTokenPlugin extends Plugin {
    
    private static final String TAG = "FCMTokenPlugin";

    @PluginMethod
    public void syncTokenAfterLogin(PluginCall call) {
        try {
            String userId = call.getString("userId");
            String accessToken = call.getString("accessToken");
            
            if (userId == null || userId.isEmpty()) {
                call.reject("userId es requerido");
                return;
            }
            
            Log.d(TAG, "🔐 ===== syncTokenAfterLogin llamado desde JS ===== ");
            Log.d(TAG, "📱 userId: " + userId);
            Log.d(TAG, "📱 accessToken: " + (accessToken != null ? "presente" : "no presente"));
            
            // Llamar al manager para sincronizar el token
            FCMTokenManager.onUserLoggedIn(getContext(), userId, accessToken != null ? accessToken : "");
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Token sync iniciado");
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error en syncTokenAfterLogin", e);
            call.reject("Error al sincronizar token: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void onUserLoggedOut(PluginCall call) {
        try {
            Log.d(TAG, "👋 onUserLoggedOut llamado desde JS");
            FCMTokenManager.onUserLoggedOut(getContext());
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error en onUserLoggedOut", e);
            call.reject("Error al limpiar datos: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void getCurrentToken(PluginCall call) {
        try {
            android.content.SharedPreferences prefs = getContext().getSharedPreferences("bookwise_fcm", android.content.Context.MODE_PRIVATE);
            String token = prefs.getString("fcm_token", null);
            
            JSObject result = new JSObject();
            result.put("token", token);
            result.put("hasToken", token != null && !token.isEmpty());
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error en getCurrentToken", e);
            call.reject("Error al obtener token: " + e.getMessage());
        }
    }
}

