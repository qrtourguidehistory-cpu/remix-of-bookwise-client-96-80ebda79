# ✅ Comandos Correctos - Capacitor Sync

## 🔴 ERROR COMÚN

**NO ejecutes desde el directorio `android`:**
```powershell
cd android
npx cap sync android  # ❌ ERROR: android platform has not been added yet
```

## ✅ SOLUCIÓN CORRECTA

**SIEMPRE ejecuta desde la raíz del proyecto:**
```powershell
# Asegúrate de estar en la raíz
Set-Location "C:\Users\laptop\Desktop\Bookwise cliente\remix-of-bookwise-client-96-80ebda79-main"

# O simplemente verifica que estás en la raíz
Get-Location
# Debe mostrar: ...\remix-of-bookwise-client-96-80ebda79-main

# Luego ejecuta los comandos
npm run build
npx cap sync android
```

## 📋 FLUJO COMPLETO CORRECTO

```powershell
# 1. Ir a la raíz del proyecto
Set-Location "C:\Users\laptop\Desktop\Bookwise cliente\remix-of-bookwise-client-96-80ebda79-main"

# 2. Verificar que estás en la raíz (debe existir package.json y android/)
Test-Path "package.json"  # Debe ser True
Test-Path "android"        # Debe ser True

# 3. Build del proyecto
npm run build

# 4. Sincronizar Capacitor (desde la raíz)
npx cap sync android

# 5. Limpiar Gradle (desde android/)
cd android
.\gradlew.bat clean
cd ..

# 6. Abrir en Android Studio (desde la raíz)
npx cap open android
```

## 🎯 REGLA DE ORO

**`npx cap sync android` SIEMPRE se ejecuta desde la raíz del proyecto, NO desde `android/`**

## ✅ VERIFICACIÓN

Si el comando funciona correctamente, deberías ver:
```
√ Copying web assets from dist to android\app\src\main\assets\public
√ Creating capacitor.config.json in android\app\src\main\assets
√ copy android
√ Updating Android plugins
[info] Found X Capacitor plugins for android
√ update android
[info] Sync finished in X.XXXs
```

Si ves el error "android platform has not been added yet", significa que estás ejecutando desde el directorio incorrecto.

