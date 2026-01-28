# Consulta Correcta para App Partner - Mostrar Nombres de Clientes

## PROBLEMA ACTUAL
La app Partner está mostrando el mismo nombre ("pedro" o "Mariano") para todas las citas, ignorando el `client_name` específico de cada cita.

## SOLUCIÓN: Consulta Correcta para App Partner

### 1. Para el Calendario (DayView) - Mostrar Beneficiario

La app Partner debe consultar las citas así:

```typescript
const { data: appointments, error } = await supabase
  .from("appointments")
  .select(`
    *,
    businesses:business_id (id, business_name),
    staff:staff_id (id, full_name),
    clients:client_id (id, first_name, last_name, email, phone)
  `)
  .eq("business_id", businessId)
  .eq("date", selectedDate)
  .order("start_time", { ascending: true });
```

### 2. IMPORTANTE: Usar `client_name` para el Beneficiario

En el componente DayView, para mostrar el nombre en el calendario:

```typescript
// ✅ CORRECTO - Usar client_name de la cita
const displayName = appointment.client_name || "Cliente";

// ❌ INCORRECTO - NO usar clients.first_name o clients.last_name aquí
// const displayName = appointment.clients?.first_name || "Cliente"; // MAL
```

### 3. Para "Reservado por" - Mostrar Dueño de Cuenta

Si la app Partner necesita mostrar "Reservado por", debe usar:

```typescript
// Para "Reservado por" (dueño de cuenta que hizo la reserva)
const reservedBy = appointment.clients 
  ? `${appointment.clients.first_name || ''} ${appointment.clients.last_name || ''}`.trim()
  : appointment.user_id || "Usuario";
```

### 4. Separación de Identidades

- **Beneficiario (encabezado/calendario)**: `appointment.client_name` 
  - Este es el nombre de la persona PARA QUIEN es la cita
  - Se guarda directamente en la columna `client_name` de la tabla `appointments`
  - Ejemplo: "Miguel el calvo", "Pedro", "Mariano"

- **Dueño de cuenta (Reservado por)**: `appointment.clients.first_name + last_name`
  - Este es el nombre del usuario que hizo la reserva
  - Se obtiene de la tabla `clients` usando `client_id`
  - Ejemplo: "Jordan Cliente", "Juan Jose"

### 5. Verificación de Datos

Para verificar que los datos están correctos, la app Partner puede hacer:

```typescript
console.log("Appointment data:", {
  id: appointment.id,
  client_name: appointment.client_name, // ← Beneficiario
  client_id: appointment.client_id,
  clients: appointment.clients, // ← Dueño de cuenta
  user_id: appointment.user_id
});
```

## ESTRUCTURA DE DATOS ESPERADA

```typescript
interface Appointment {
  id: string;
  client_name: string | null; // ← NOMBRE DEL BENEFICIARIO (para calendario)
  client_id: string | null; // ← ID del cliente en tabla clients
  user_id: string | null; // ← ID del usuario que reservó
  clients?: {
    first_name: string | null; // ← NOMBRE DEL DUEÑO DE CUENTA
    last_name: string | null;
    email: string | null;
  } | null;
}
```

## CÓDIGO DE EJEMPLO PARA APP PARTNER

```typescript
// En el componente DayView de la app Partner
const AppointmentBlock = ({ appointment }) => {
  // ✅ CORRECTO: Usar client_name para el beneficiario
  const beneficiaryName = appointment.client_name || "Cliente";
  
  // ✅ CORRECTO: Usar clients para "Reservado por"
  const reservedByName = appointment.clients
    ? `${appointment.clients.first_name || ''} ${appointment.clients.last_name || ''}`.trim()
    : "Usuario";
  
  return (
    <div>
      <div className="appointment-name">
        {beneficiaryName} {/* ← Muestra "Miguel el calvo", "Pedro", etc. */}
      </div>
      <div className="reserved-by">
        Reservado por: {reservedByName} {/* ← Muestra "Jordan Cliente", etc. */}
      </div>
    </div>
  );
};
```

## CHECKLIST PARA APP PARTNER

- [ ] La consulta incluye `client_name` en el SELECT
- [ ] El componente DayView usa `appointment.client_name` para mostrar el nombre en el calendario
- [ ] NO se está usando `clients.first_name` para el nombre del beneficiario
- [ ] Cada cita muestra su propio `client_name` (no se comparte entre citas)
- [ ] No hay variables globales o estado compartido que sobrescriba el nombre

## NOTA CRÍTICA

El problema NO está en la app Cliente. La app Cliente está guardando correctamente:
- `client_name`: Nombre del beneficiario (ej: "Miguel el calvo")
- `client_id`: ID del cliente en tabla clients
- `user_id`: ID del usuario que reservó

El problema está en cómo la **APP PARTNER** está leyendo y mostrando estos datos.

