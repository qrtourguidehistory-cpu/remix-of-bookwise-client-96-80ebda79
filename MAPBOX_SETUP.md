# Configuración de Mapbox para MiTurnow

## Token de Mapbox

El componente `MiTurnowMap.tsx` utiliza Mapbox GL JS para mostrar negocios aprobados en un mapa interactivo.

### Token Actual

El token ya está configurado en el código:
```
pk.eyJ1IjoibWl0b3Vybm93IiwiYSI6ImNta2hzYnN3aTBtaHIzZHB1MHgydTZ1OWMifQ.I90chYaZczEFiJ33M7hdxw
```

### Variables de Entorno (Opcional)

Si deseas usar un token diferente, puedes crear un archivo `.env` en la raíz del proyecto:

```env
VITE_MAPBOX_ACCESS_TOKEN=tu_token_aqui
```

## Características Implementadas

### ✅ Mapa Dinámico Nativo
- Usa Mapbox GL JS v3.17.0 (ya instalado)
- Estilo adaptativo: `streets-v12` (light) o `dark-v11` (dark mode)
- 100% marca blanca (sin menciones de Google)

### ✅ Conexión a Supabase
- Consulta la tabla `businesses`
- Filtra solo negocios aprobados: `is_public = true AND is_active = true`
- Muestra: `business_name`, `latitude`, `longitude`, `address`, `category`

### ✅ Marcadores Personalizados
- Diseño personalizado con colores del tema
- Animación hover
- Icono de ubicación integrado

### ✅ Popups Interactivos
- Muestra nombre del negocio
- Categoría y dirección
- Botón "Reservar cita" que navega al perfil del negocio
- Estilos consistentes con Shadcn UI

### ✅ Geolocalización
- Control de GPS integrado
- Muestra ubicación del usuario (punto azul)
- Se activa automáticamente al cargar el mapa
- Tracking en tiempo real

### ✅ Privacidad y Marca Blanca
- Sin atribuciones de Mapbox visibles
- Sin rastros de Google
- Sin fotos de perfil externas
- Sin nombres de propietarios

### ✅ Responsive y Adaptativo
- Width y height al 100%
- Sin espacios en blanco
- Controles de zoom y navegación
- Tema claro/oscuro automático

## Estructura de Archivos

```
src/
├── components/
│   └── MiTurnowMap.tsx          # Componente del mapa (NUEVO)
└── pages/
    └── MapPage.tsx               # Página que usa el mapa (ACTUALIZADO)
```

## Uso del Componente

```tsx
import MiTurnowMap from "@/components/MiTurnowMap";

function MyPage() {
  return (
    <div className="h-screen">
      <MiTurnowMap className="h-full" />
    </div>
  );
}
```

## Dependencias Requeridas

Todas las dependencias ya están instaladas en `package.json`:

- ✅ `mapbox-gl`: ^3.17.0
- ✅ `@types/mapbox-gl`: ^3.4.1
- ✅ `@supabase/supabase-js`: ^2.86.2
- ✅ Componentes Shadcn UI (Button, etc.)

## Próximos Pasos

1. **Prueba el mapa**: Navega a `/map` en tu aplicación
2. **Verifica negocios**: Asegúrate de que hay negocios con `latitude` y `longitude` en Supabase
3. **Personaliza estilos**: Modifica los estilos del marcador y popup según tus necesidades
4. **Ajusta centro del mapa**: La ubicación por defecto es Santo Domingo, RD

## Solución de Problemas

### El mapa no se muestra
- Verifica que el token de Mapbox sea válido
- Revisa la consola del navegador para errores

### No aparecen marcadores
- Verifica que los negocios tengan `latitude` y `longitude` no nulos
- Confirma que `is_public = true` y `is_active = true` en Supabase

### Errores de geolocalización
- Asegúrate de que el usuario haya dado permisos de ubicación
- Verifica que la aplicación esté en HTTPS (excepto localhost)

## Notas Técnicas

- El mapa se renderiza con el hook `useRef` para evitar re-renders
- Los marcadores se recrean cuando cambia la lista de negocios
- El estilo del mapa se actualiza automáticamente con el tema
- La geolocalización se activa en el evento `load` del mapa

