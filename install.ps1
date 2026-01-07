# Script de instalación de dependencias para Bookwise
# Este script evita problemas con Cursor ejecutando npm install directamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalando dependencias de Bookwise" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json no encontrado" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ package.json encontrado" -ForegroundColor Green
Write-Host ""

# Verificar Node.js y npm
Write-Host "Verificando Node.js y npm..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
$npmVersion = npm --version 2>$null

if (-not $nodeVersion -or -not $npmVersion) {
    Write-Host "❌ Error: Node.js o npm no están instalados" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
Write-Host ""

# Limpiar caché (opcional, comentado por defecto)
# Write-Host "Limpiando caché de npm..." -ForegroundColor Yellow
# npm cache clean --force
# Write-Host "✅ Caché limpiada" -ForegroundColor Green
# Write-Host ""

# Instalar dependencias
Write-Host "Instalando dependencias (esto puede tomar varios minutos)..." -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
npm install

if ($LASTEXITCODE -eq 0) {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Instalación completada exitosamente!" -ForegroundColor Green
    Write-Host "  Tiempo: $([math]::Round($duration, 2)) segundos" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
    # Verificar node_modules
    if (Test-Path "node_modules") {
        $moduleCount = (Get-ChildItem node_modules -Directory | Measure-Object).Count
        Write-Host "✅ $moduleCount paquetes instalados en node_modules" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ Error en la instalación" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa los logs en:" -ForegroundColor Yellow
    Write-Host "  $env:LOCALAPPDATA\npm-cache\_logs\" -ForegroundColor Yellow
    exit 1
}

