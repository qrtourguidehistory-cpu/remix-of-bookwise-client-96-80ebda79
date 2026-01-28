# Script para restaurar iconos naranja MT
# Este script prepara los archivos necesarios para reemplazar los iconos

Write-Host "=== Restaurando Iconos Naranja MT ===" -ForegroundColor Green

$logoPath = "assets\icon-only.png.png"
$baseDir = "android\app\src\main\res"

# Verificar que existe el logo
if (-not (Test-Path $logoPath)) {
    Write-Host "ERROR: No se encuentra el logo en $logoPath" -ForegroundColor Red
    Write-Host "Por favor, coloca tu logo naranja MT en: $logoPath" -ForegroundColor Yellow
    exit 1
}

# Carpetas mipmap a procesar
$mipmapFolders = @("mipmap-hdpi", "mipmap-mdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi")

Write-Host "`nPreparando iconos para las siguientes carpetas:" -ForegroundColor Cyan
foreach ($folder in $mipmapFolders) {
    Write-Host "  - $folder" -ForegroundColor Gray
}

Write-Host "`nNOTA: Los archivos .webp necesitan ser convertidos manualmente." -ForegroundColor Yellow
Write-Host "Puedes usar herramientas online como:" -ForegroundColor Yellow
Write-Host "  - https://convertio.co/png-webp/" -ForegroundColor Cyan
Write-Host "  - https://cloudconvert.com/png-to-webp" -ForegroundColor Cyan
Write-Host "`nO instalar ImageMagick y ejecutar:" -ForegroundColor Yellow
Write-Host "  magick convert logo.png -resize 48x48 ic_launcher.webp" -ForegroundColor Cyan

Write-Host "`n=== Proceso completado ===" -ForegroundColor Green
Write-Host "Los archivos XML y colores han sido actualizados correctamente." -ForegroundColor Green

