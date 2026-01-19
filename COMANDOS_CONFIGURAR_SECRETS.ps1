# ============================================================================
# SCRIPT DE CONFIGURACIÓN DE SECRETS PARA send-push-notification
# ============================================================================
# Este script configura todos los secrets necesarios para la Edge Function
# Fecha: 26 de Enero 2026
# Proyecto: rdznelijpliklisnflfm (Turnow Booking App)
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CONFIGURACIÓN DE SECRETS - send-push-notification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Supabase CLI
Write-Host "[1/5] Verificando Supabase CLI..." -ForegroundColor Yellow
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "  ❌ Supabase CLI no encontrado" -ForegroundColor Red
    Write-Host "  📦 Instalando Supabase CLI..." -ForegroundColor Yellow
    npm install -g supabase
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Error instalando Supabase CLI" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✅ Supabase CLI instalado" -ForegroundColor Green
Write-Host ""

# Autenticarse
Write-Host "[2/5] Autenticando en Supabase..." -ForegroundColor Yellow
supabase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Error en autenticación" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Autenticación exitosa" -ForegroundColor Green
Write-Host ""

# Vincular proyecto
Write-Host "[3/5] Vinculando proyecto..." -ForegroundColor Yellow
supabase link --project-ref rdznelijpliklisnflfm
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Proyecto ya vinculado o error en vinculación" -ForegroundColor Yellow
}
Write-Host "  ✅ Proyecto vinculado" -ForegroundColor Green
Write-Host ""

# Configurar SUPABASE_URL
Write-Host "[4/5] Configurando SUPABASE_URL..." -ForegroundColor Yellow
supabase secrets set SUPABASE_URL="https://rdznelijpliklisnflfm.supabase.co" --project-ref rdznelijpliklisnflfm
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ SUPABASE_URL configurado" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Error configurando SUPABASE_URL (puede que ya esté configurado)" -ForegroundColor Yellow
}
Write-Host ""

# Configurar SUPABASE_SERVICE_ROLE_KEY
Write-Host "[5/5] Configurando SUPABASE_SERVICE_ROLE_KEY..." -ForegroundColor Yellow
Write-Host "  ⚠️  IMPORTANTE: Necesitas obtener el Service Role Key desde:" -ForegroundColor Yellow
Write-Host "     https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api" -ForegroundColor Cyan
Write-Host ""
$serviceRoleKey = Read-Host "  Por favor, ingresa el SUPABASE_SERVICE_ROLE_KEY (o presiona Enter para omitir)"
if ($serviceRoleKey -ne "") {
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$serviceRoleKey" --project-ref rdznelijpliklisnflfm
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ SUPABASE_SERVICE_ROLE_KEY configurado" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error configurando SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Omitido. Configura manualmente desde el Dashboard." -ForegroundColor Yellow
}
Write-Host ""

# Configurar FIREBASE_SERVICE_ACCOUNT (CRÍTICO)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CONFIGURACIÓN CRÍTICA: FIREBASE_SERVICE_ACCOUNT" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Esta variable es CRÍTICA para que la función funcione." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pasos para obtener el Service Account JSON:" -ForegroundColor Yellow
Write-Host "  1. Ve a: https://console.firebase.google.com/" -ForegroundColor Cyan
Write-Host "  2. Selecciona proyecto: mi-turnow-cliente" -ForegroundColor Cyan
Write-Host "  3. Ve a: Project Settings → Service Accounts" -ForegroundColor Cyan
Write-Host "  4. Haz clic en: Generate new private key" -ForegroundColor Cyan
Write-Host "  5. Descarga el archivo JSON (mi-turnow-cliente-firebase-adminsdk.json)" -ForegroundColor Cyan
Write-Host ""
$jsonPath = Read-Host "  Ingresa la ruta completa al archivo JSON (o presiona Enter para configurar manualmente)"

if ($jsonPath -ne "" -and (Test-Path $jsonPath)) {
    try {
        $jsonContent = Get-Content $jsonPath -Raw
        # Validar que sea JSON válido
        $jsonObj = $jsonContent | ConvertFrom-Json
        Write-Host "  ✅ JSON válido. Project ID: $($jsonObj.project_id)" -ForegroundColor Green
        
        if ($jsonObj.project_id -ne "mi-turnow-cliente") {
            Write-Host "  ⚠️  ADVERTENCIA: Project ID es '$($jsonObj.project_id)', pero debería ser 'mi-turnow-cliente'" -ForegroundColor Yellow
            $continue = Read-Host "  ¿Continuar de todas formas? (S/N)"
            if ($continue -ne "S" -and $continue -ne "s") {
                Write-Host "  ⚠️  Configuración cancelada" -ForegroundColor Yellow
                exit 0
            }
        }
        
        # Escapar comillas dobles para PowerShell
        $jsonEscaped = $jsonContent.Replace('"', '\"').Replace('`', '\`').Replace('$', '`$')
        supabase secrets set FIREBASE_SERVICE_ACCOUNT="$jsonEscaped" --project-ref rdznelijpliklisnflfm
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ FIREBASE_SERVICE_ACCOUNT configurado correctamente" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Error configurando FIREBASE_SERVICE_ACCOUNT" -ForegroundColor Red
            Write-Host "  💡 Intenta configurarlo manualmente desde el Dashboard:" -ForegroundColor Yellow
            Write-Host "     https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions/send-push-notification/secrets" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "  ❌ Error leyendo archivo JSON: $_" -ForegroundColor Red
        Write-Host "  💡 Verifica que el archivo sea un JSON válido" -ForegroundColor Yellow
    }
} else {
    if ($jsonPath -ne "") {
        Write-Host "  ❌ Archivo no encontrado: $jsonPath" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  💡 Configuración Manual desde Dashboard:" -ForegroundColor Yellow
    Write-Host "     1. Ve a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions/send-push-notification/secrets" -ForegroundColor Cyan
    Write-Host "     2. Haz clic en 'Add Secret'" -ForegroundColor Cyan
    Write-Host "     3. Nombre: FIREBASE_SERVICE_ACCOUNT" -ForegroundColor Cyan
    Write-Host "     4. Valor: Pega el contenido completo del JSON del Service Account" -ForegroundColor Cyan
    Write-Host "     5. Haz clic en 'Save'" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN DE SECRETS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Listando secrets configurados..." -ForegroundColor Yellow
supabase secrets list --project-ref rdznelijpliklisnflfm
Write-Host ""

Write-Host "✅ Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Verifica que todos los secrets estén configurados:" -ForegroundColor Cyan
Write-Host "     - SUPABASE_URL" -ForegroundColor Cyan
Write-Host "     - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Cyan
Write-Host "     - FIREBASE_SERVICE_ACCOUNT" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Verifica en Firebase Console:" -ForegroundColor Cyan
Write-Host "     - SHA-1 del keystore de producción está registrado" -ForegroundColor Cyan
Write-Host "     - Package com.miturnow.cliente está configurado" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Prueba la función enviando una notificación de prueba" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Ver logs en:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions/send-push-notification/logs" -ForegroundColor Cyan

