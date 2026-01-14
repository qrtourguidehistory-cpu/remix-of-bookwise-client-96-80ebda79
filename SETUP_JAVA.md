# Configuración de Java para Android Build

## Opción 1: Usar Android Studio (RECOMENDADO)

Android Studio incluye su propio JDK, así que no necesitas configurar JAVA_HOME manualmente.

1. Abre Android Studio
2. Abre el proyecto: `File → Open → Selecciona la carpeta "android"`
3. Espera a que sincronice Gradle
4. Build → Clean Project
5. Build → Rebuild Project
6. Run → Run 'app' (o conecta dispositivo y ejecuta)

## Opción 2: Instalar Java Manualmente

### Windows

1. **Descargar JDK:**
   - Ve a: https://adoptium.net/
   - Descarga JDK 17 o superior (LTS recomendado)
   - Instala en: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`

2. **Configurar JAVA_HOME:**
   ```powershell
   # Temporal (solo esta sesión)
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot"
   $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
   
   # Permanente (para todas las sesiones)
   [System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot", "User")
   [System.Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$env:JAVA_HOME\bin", "User")
   ```

3. **Verificar:**
   ```powershell
   java -version
   echo $env:JAVA_HOME
   ```

### Ubicaciones comunes de Java en Windows:

```powershell
# Buscar Java instalado
Get-ChildItem "C:\Program Files\Java" -ErrorAction SilentlyContinue
Get-ChildItem "C:\Program Files (x86)\Java" -ErrorAction SilentlyContinue
Get-ChildItem "C:\Program Files\Eclipse Adoptium" -ErrorAction SilentlyContinue
Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk" -ErrorAction SilentlyContinue

# Si tienes Android Studio instalado, Java puede estar aquí:
# C:\Users\<tu-usuario>\AppData\Local\Android\Sdk
# O dentro de Android Studio:
# C:\Program Files\Android\Android Studio\jbr
```

## Opción 3: Usar el JDK de Android Studio

Si Android Studio está instalado, puedes usar su JDK:

```powershell
# Buscar JDK de Android Studio
$androidStudioJdk = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $androidStudioJdk) {
    $env:JAVA_HOME = $androidStudioJdk
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    java -version
}
```

## Comandos después de configurar Java

```powershell
# Limpiar proyecto
cd android
.\gradlew.bat clean

# Sincronizar Capacitor
cd ..
npx cap sync android

# Rebuild
cd android
.\gradlew.bat assembleDebug

# Instalar en dispositivo
adb install app\build\outputs\apk\debug\app-debug.apk
```

## Verificar que todo funciona

```powershell
# Verificar Java
java -version

# Verificar Gradle
cd android
.\gradlew.bat --version

# Verificar que el plugin está registrado
npx cap sync android
```

