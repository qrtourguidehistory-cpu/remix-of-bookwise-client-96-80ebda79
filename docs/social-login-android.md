Android — Social Login (Google) ⚠️

Problema

- Si llamas a SocialLogin.login({ provider: 'google', options: { scopes: [...] } }) en Android, el plugin requiere que `MainActivity` esté modificada para soportar scopes personalizados.
- Si no se modifica, el plugin devuelve: `You CANNOT use scopes without modifying the main activity. Please follow the docs!`

Solución (rápida y segura)

- Evitar pasar `scopes` explícitos al llamar a `SocialLogin.login()` para Google. El plugin añadirá por defecto `email`, `profile` y `openid`.
- En este repositorio ya hemos eliminado el envío explícito de `scopes` y añadido un reintento automático sin `scopes` para mayor robustez.

Si necesitas scopes personalizados (p. ej. autorizaciones adicionales)

1. Modifica `android/app/src/main/java/<your-package>/MainActivity.java` y añade lo siguiente:

- Implementa la interfaz del plugin y el método marcador:

```java
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Señal para el plugin
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        try {
            SocialLoginPlugin plugin = (SocialLoginPlugin) this.getBridge().getPlugin("SocialLogin");
            if (plugin != null) {
                plugin.handleGoogleLoginIntent(requestCode, data);
            }
        } catch (Exception e) {
            // Ignorar si el plugin no está presente
        }
    }
}
```

2. Ejecuta:

```bash
npx cap sync android
# luego rebuild en Android Studio
```

Notas

- Si ves el mensaje en un dispositivo de usuario, el build instalado probablemente no tenga la modificación de `MainActivity`. Actualiza la app o evita pasar `scopes`.
- Si seguimos viendo problemas tras estos pasos, revisa la versión del plugin (`@capgo/capacitor-social-login`) y los pasos de instalación.
