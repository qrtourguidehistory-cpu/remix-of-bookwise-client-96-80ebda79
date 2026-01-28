

## Plan: Unificar Icono MT Naranja y Eliminar Splash Duplicados

### Objetivo
Mantener el icono naranja MT (`ic_launcher_foreground.png`) como unico icono en toda la app Android, eliminando todos los splash.png duplicados y asegurando que Android Studio no imponga sus propios recursos.

---

## Seccion Tecnica

### Archivos a ELIMINAR

**Splash screens duplicados (11 archivos):**
- `android/app/src/main/res/drawable/splash.png`
- `android/app/src/main/res/drawable-land-hdpi/splash.png`
- `android/app/src/main/res/drawable-land-mdpi/splash.png`
- `android/app/src/main/res/drawable-land-xhdpi/splash.png`
- `android/app/src/main/res/drawable-land-xxhdpi/splash.png`
- `android/app/src/main/res/drawable-land-xxxhdpi/splash.png`
- `android/app/src/main/res/drawable-port-hdpi/splash.png`
- `android/app/src/main/res/drawable-port-mdpi/splash.png`
- `android/app/src/main/res/drawable-port-xhdpi/splash.png`
- `android/app/src/main/res/drawable-port-xxhdpi/splash.png`
- `android/app/src/main/res/drawable-port-xxxhdpi/splash.png`

**Vector XML del icono viejo (evitar conflicto):**
- `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml`

**Archivos webp que Android Studio genera (conflicto con PNG):**
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.webp`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.webp`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher_temp.png`
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.webp`
- `android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.webp`
- `android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.webp`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp`

---

### Archivos a MODIFICAR

**1. `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`**

Cambiar para que use `@drawable/ic_launcher_foreground` en lugar de `@mipmap/ic_launcher_foreground`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

**2. `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`**

Mismo cambio:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

**3. `android/app/src/main/res/values/styles.xml`**

Modificar el splash screen para usar el icono correcto y evitar doble splash:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:windowSplashScreenBackground">@color/splash_background</item>
        <item name="android:windowSplashScreenAnimatedIcon">@drawable/ic_launcher_foreground</item>
        <item name="android:windowSplashScreenAnimationDuration">200</item>
        <item name="android:background">@color/splash_background</item>
    </style>
</resources>
```

---

### Archivos que se MANTIENEN (fuente unica del icono)

- `android/app/src/main/res/drawable/ic_launcher_foreground.png` - El icono naranja MT (PNG)
- `android/app/src/main/res/drawable/ic_launcher_background.xml` - Fondo naranja
- `android/app/src/main/res/values/ic_launcher_background.xml` - Color de fondo
- `android/app/src/main/res/values/colors.xml` - Colores de la app
- `public/favicon.png` - Favicon web (tambien MT naranja)

---

### Estructura Final Esperada

```
res/
  drawable/
    ic_launcher_foreground.png  (UNICO icono)
    ic_launcher_background.xml
  mipmap-anydpi-v26/
    ic_launcher.xml        (apunta a drawable/)
    ic_launcher_round.xml  (apunta a drawable/)
  mipmap-hdpi/   (vacia o eliminada)
  mipmap-mdpi/   (vacia o eliminada)
  mipmap-xhdpi/  (vacia o eliminada)
  mipmap-xxhdpi/ (vacia o eliminada)
  mipmap-xxxhdpi/(vacia o eliminada)
  drawable-land-*/  (sin splash.png)
  drawable-port-*/  (sin splash.png)
```

---

### Beneficios

1. **Un solo archivo de icono** - `ic_launcher_foreground.png` en drawable/
2. **Sin conflictos** - Eliminados webp y XML vectorial que competian
3. **Sin doble splash** - Eliminados todos los splash.png redundantes
4. **Android Studio no sobreescribe** - Los mipmap apuntan a drawable/ centralizado
5. **Splash limpio** - Usa el icono foreground directamente, no recursos duplicados

---

### Despues de Implementar

Ejecutar en tu proyecto local:

```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

Luego en Android Studio: Build > Clean Project > Rebuild Project

