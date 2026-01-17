# 🚀 Prueba GPS - 3 Pasos

## ✅ Código Actualizado

La función ahora es **ULTRA SIMPLE**:
- ✅ Toma `latitude` y `longitude` del negocio
- ✅ Construye URL: `https://www.google.com/maps/search/?api=1&query=LAT,LNG`
- ✅ Abre Google Maps en el PIN exacto
- ❌ NO busca el nombre de la calle
- ❌ NO usa texto de dirección

---

## 🧪 Probar Ahora

### 1️⃣ Ejecuta
```bash
npm run dev
```

### 2️⃣ Abre Consola
```
F12 → Console
```

### 3️⃣ Ve al perfil de Barbería Tonny y haz clic en la dirección

---

## 📊 Resultados

### ✅ Si ves esto → TODO BIEN:
```
📍 NAVEGANDO A COORDENADAS GPS: {lat: 19.797139, lng: -70.690559}
🔗 URL: https://www.google.com/maps/search/?api=1&query=19.797139,-70.690559
```
**→ Google Maps abre en el PIN exacto** ✅

---

### ❌ Si ves esto → FALTAN COORDENADAS:
```
❌ ERROR: El negocio no tiene coordenadas en la DB
📊 Datos del negocio: {name: "Barbería Tonny", latitude: undefined, longitude: undefined}
```
**→ Necesitas agregar coordenadas en Supabase**

---

## 🔧 Agregar Coordenadas (si faltan)

### 1. Obtener coordenadas reales
- Ve a Google Maps
- Busca la barbería
- Click derecho → "¿Qué hay aquí?"
- Copia las coordenadas (ej: `19.797139, -70.690559`)

### 2. Actualizar en Supabase
```sql
UPDATE businesses
SET 
  latitude = 19.797139,    -- ← Tus coordenadas reales
  longitude = -70.690559   -- ← Tus coordenadas reales
WHERE business_name ILIKE '%tonny%';
```

### 3. Recarga la página y prueba de nuevo

---

## 🎯 Eso es Todo

**Si hay coordenadas → Funciona perfecto** ✅
**Si no hay → Error claro + sabes qué hacer** ✅

¡Pruébalo ahora! 🚀

