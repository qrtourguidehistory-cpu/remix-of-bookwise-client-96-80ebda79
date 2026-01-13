package com.bookwise.client;

import android.content.Intent;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "🚀 ===== MainActivity onCreate ===== ");
        Log.d(TAG, "📱 Inicializando FCM Token Manager...");
        
        // Solicitar token FCM al iniciar la app
        // El token se enviará al backend cuando el usuario inicie sesión
        FCMTokenManager.getFCMToken(this);
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Intentionally left blank. This method signals that MainActivity has been modified
        // to support the SocialLogin plugin when using custom scopes or offline mode.
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        try {
            Object pluginHandle = this.getBridge().getPlugin("SocialLogin");
            if (pluginHandle != null) {
                try {
                    // Capacitor versions return a PluginHandle: try to get the actual plugin instance first
                    java.lang.reflect.Method getInstance = pluginHandle.getClass().getMethod("getInstance");
                    Object pluginInstance = getInstance.invoke(pluginHandle);
                    if (pluginInstance != null) {
                        java.lang.reflect.Method handleMethod = pluginInstance.getClass().getMethod("handleGoogleLoginIntent", int.class, Intent.class);
                        handleMethod.invoke(pluginInstance, Integer.valueOf(requestCode), data);
                    } else {
                        // Fallback: try to call the handler directly on the plugin handle
                        java.lang.reflect.Method handleMethod = pluginHandle.getClass().getMethod("handleGoogleLoginIntent", int.class, Intent.class);
                        handleMethod.invoke(pluginHandle, Integer.valueOf(requestCode), data);
                    }
                } catch (NoSuchMethodException nsme) {
                    // Fallback: try direct method on pluginHandle
                    try {
                        java.lang.reflect.Method handleMethod = pluginHandle.getClass().getMethod("handleGoogleLoginIntent", int.class, Intent.class);
                        handleMethod.invoke(pluginHandle, Integer.valueOf(requestCode), data);
                    } catch (Exception inner) {
                        // ignore
                    }
                } catch (Exception ignored) {
                    // ignore other reflection errors
                }
            }
        } catch (Exception e) {
            // Ignore exceptions here. Plugin may not be installed or initialized yet.
        }
    }
}
