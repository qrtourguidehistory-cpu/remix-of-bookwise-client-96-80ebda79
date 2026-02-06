import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Obtener credenciales de Supabase
// Puedes obtenerlas desde: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rdznelijpliklisnflfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada.');
  console.error('Por favor, configura la variable de entorno SUPABASE_SERVICE_ROLE_KEY');
  console.error('Obtén tu Service Role Key desde: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api');
  process.exit(1);
}

// Crear cliente de Supabase con Service Role Key (bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Leer el archivo de migración
const migrationPath = join(__dirname, 'supabase', 'migrations', '20260127000000_add_is_active_to_client_devices.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('🚀 Ejecutando migración: add_is_active_to_client_devices');
console.log('📄 Archivo:', migrationPath);
console.log('');

// Ejecutar la migración
async function runMigration() {
  try {
    // Dividir el SQL en statements individuales (separados por ;)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Ejecutando ${statements.length} statement(s)...`);
    console.log('');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`[${i + 1}/${statements.length}] Ejecutando statement...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });

        // Si exec_sql no existe, intentar ejecutar directamente con query
        if (error && error.message?.includes('exec_sql')) {
          // Intentar ejecutar directamente usando la API REST
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql_query: statement + ';' })
          });

          if (!response.ok) {
            // Si exec_sql no funciona, usar el método directo de PostgREST
            // Ejecutar directamente usando el cliente de Supabase
            const { error: directError } = await supabase
              .from('_migrations')
              .select('*')
              .limit(0); // Esto es solo para verificar conexión

            // Ejecutar SQL directamente usando fetch a la API de PostgREST
            // Nota: PostgREST no ejecuta SQL arbitrario, necesitamos usar la API de Supabase
            console.log('⚠️  No se puede ejecutar SQL directamente desde aquí.');
            console.log('💡 Por favor, ejecuta la migración manualmente desde el Supabase Dashboard:');
            console.log('   1. Ve a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/sql/new');
            console.log('   2. Copia el contenido del archivo de migración');
            console.log('   3. Pégalo en el SQL Editor');
            console.log('   4. Haz clic en RUN');
            process.exit(1);
          }
        } else if (error) {
          console.error(`❌ Error en statement ${i + 1}:`, error);
          throw error;
        } else {
          console.log(`✅ Statement ${i + 1} ejecutado correctamente`);
        }
      }
    }

    console.log('');
    console.log('✅ Migración ejecutada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error);
    console.error('');
    console.error('💡 Alternativa: Ejecuta la migración manualmente desde el Supabase Dashboard:');
    console.error('   1. Ve a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/sql/new');
    console.error('   2. Copia el contenido del archivo: supabase/migrations/20260127000000_add_is_active_to_client_devices.sql');
    console.error('   3. Pégalo en el SQL Editor');
    console.error('   4. Haz clic en RUN');
    process.exit(1);
  }
}

runMigration();

