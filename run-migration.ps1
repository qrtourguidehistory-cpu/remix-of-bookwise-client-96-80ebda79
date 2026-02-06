# Script para ejecutar la migración de Supabase
# Requiere el Service Role Key de Supabase

$SUPABASE_URL = "https://rdznelijpliklisnflfm.supabase.co"
$MIGRATION_FILE = "supabase\migrations\20260127000000_add_is_active_to_client_devices.sql"

Write-Host "🚀 Ejecutando migración: add_is_active_to_client_devices" -ForegroundColor Cyan
Write-Host ""

# Verificar si el archivo existe
if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ Error: No se encontró el archivo de migración: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

# Leer el contenido del archivo SQL
$sqlContent = Get-Content $MIGRATION_FILE -Raw

Write-Host "📄 Archivo de migración encontrado" -ForegroundColor Green
Write-Host "📝 Contenido del SQL:" -ForegroundColor Yellow
Write-Host ""
Write-Host $sqlContent
Write-Host ""

# Solicitar Service Role Key si no está en variables de entorno
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SERVICE_ROLE_KEY) {
    Write-Host "⚠️  SUPABASE_SERVICE_ROLE_KEY no está configurada en variables de entorno" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Para ejecutar esta migración, tienes dos opciones:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OPCIÓN 1: Ejecutar manualmente desde Supabase Dashboard (RECOMENDADO)" -ForegroundColor Green
    Write-Host "   1. Ve a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/sql/new" -ForegroundColor White
    Write-Host "   2. Copia el contenido del archivo: $MIGRATION_FILE" -ForegroundColor White
    Write-Host "   3. Pégalo en el SQL Editor" -ForegroundColor White
    Write-Host "   4. Haz clic en RUN" -ForegroundColor White
    Write-Host ""
    Write-Host "OPCIÓN 2: Configurar Service Role Key y ejecutar este script" -ForegroundColor Green
    Write-Host "   1. Obtén tu Service Role Key desde:" -ForegroundColor White
    Write-Host "      https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api" -ForegroundColor White
    Write-Host "   2. Ejecuta: `$env:SUPABASE_SERVICE_ROLE_KEY='tu-key-aqui'" -ForegroundColor White
    Write-Host "   3. Ejecuta este script nuevamente" -ForegroundColor White
    Write-Host ""
    
    # Intentar abrir el dashboard automáticamente
    $openDashboard = Read-Host "¿Quieres abrir el Supabase Dashboard ahora? (S/N)"
    if ($openDashboard -eq "S" -or $openDashboard -eq "s") {
        Start-Process "https://supabase.com/dashboard/project/rdznelijpliklisnflfm/sql/new"
        Write-Host "✅ Dashboard abierto en tu navegador" -ForegroundColor Green
    }
    
    exit 0
}

Write-Host "✅ Service Role Key encontrada" -ForegroundColor Green
Write-Host ""

# Intentar ejecutar la migración usando la API REST de Supabase
# Nota: Supabase no permite ejecutar SQL arbitrario desde la API REST por seguridad
# Por lo tanto, mostraremos las instrucciones

Write-Host "⚠️  Supabase no permite ejecutar SQL arbitrario desde scripts por seguridad" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 La mejor forma de ejecutar esta migración es:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Ve a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/sql/new" -ForegroundColor White
Write-Host "   2. Copia y pega el siguiente SQL:" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host $sqlContent -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Intentar abrir el dashboard automáticamente
$openDashboard = Read-Host "¿Quieres abrir el Supabase Dashboard ahora? (S/N)"
if ($openDashboard -eq "S" -or $openDashboard -eq "s") {
    Start-Process "https://supabase.com/dashboard/project/rdznelijpliklisnflfm/sql/new"
    Write-Host "✅ Dashboard abierto en tu navegador" -ForegroundColor Green
    Write-Host "📋 El SQL está listo para copiar y pegar arriba" -ForegroundColor Cyan
}

