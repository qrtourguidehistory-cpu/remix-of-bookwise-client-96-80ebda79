# Script para obtener SHA-1 y SHA-256 del keystore de debug de Android

$keystorePath = "$env:USERPROFILE\.android\debug.keystore"

if (-not (Test-Path $keystorePath)) {
    Write-Host "❌ No se encontró el keystore en: $keystorePath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Keystore encontrado: $keystorePath" -ForegroundColor Green

# Buscar keytool en ubicaciones comunes
$keytoolPaths = @(
    "$env:JAVA_HOME\bin\keytool.exe",
    "C:\Program Files\Java\*\bin\keytool.exe",
    "C:\Program Files (x86)\Java\*\bin\keytool.exe",
    "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr\bin\keytool.exe",
    "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe"
)

$keytool = $null
foreach ($path in $keytoolPaths) {
    $found = Get-ChildItem $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $keytool = $found.FullName
        Write-Host "✅ keytool encontrado: $keytool" -ForegroundColor Green
        break
    }
}

if (-not $keytool) {
    Write-Host "❌ No se encontró keytool.exe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Yellow
    Write-Host "1. Instala Java JDK desde: https://adoptium.net/" -ForegroundColor Yellow
    Write-Host "2. O usa Android Studio: Gradle > Tasks > android > signingReport" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Obteniendo SHA-1 y SHA-256..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar keytool
& $keytool -list -v -keystore $keystorePath -alias androiddebugkey -storepass android -keypass android

