# 📤 Ejemplo de Payload FCM HTTP v1

## ✅ Formato Correcto para Notificaciones Push

Este es el formato que tu backend DEBE usar para enviar notificaciones push a Android.

## 🔑 Requisitos del Payload

1. **DEBE incluir `notification`** (para que Android muestre la notificación automáticamente)
2. **DEBE incluir `android.priority: "high"`** (para que funcione con app cerrada)
3. **DEBE usar `notification_channel_id: "default_channel"`** (el canal que creamos)

## 📋 Ejemplo Completo (HTTP v1 API)

```bash
POST https://fcm.googleapis.com/v1/projects/TU_PROJECT_ID/messages:send
Authorization: Bearer TU_ACCESS_TOKEN
Content-Type: application/json
```

### Payload JSON:

```json
{
  "message": {
    "token": "FCM_TOKEN_DEL_DISPOSITIVO",
    "notification": {
      "title": "Nueva Reservación",
      "body": "Tu reservación ha sido confirmada"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "default_channel",
        "sound": "default",
        "priority": "high"
      }
    },
    "data": {
      "type": "reservation_confirmed",
      "reservation_id": "123",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    }
  }
}
```

## 🔴 Formato INCORRECTO (NO usar)

### ❌ Solo data (sin notification)
```json
{
  "message": {
    "token": "FCM_TOKEN",
    "data": {
      "title": "Título",
      "body": "Mensaje"
    }
  }
}
```
**Problema:** Android NO muestra la notificación automáticamente. Requiere que la app esté abierta.

### ❌ Sin android.priority
```json
{
  "message": {
    "token": "FCM_TOKEN",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    }
  }
}
```
**Problema:** La notificación puede no llegar cuando la app está cerrada.

### ❌ Canal incorrecto
```json
{
  "message": {
    "token": "FCM_TOKEN",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    },
    "android": {
      "notification": {
        "channel_id": "otro_canal"
      }
    }
  }
}
```
**Problema:** Si el canal no existe o tiene baja importancia, la notificación no se muestra.

## ✅ Formato Mínimo Correcto

```json
{
  "message": {
    "token": "FCM_TOKEN",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "default_channel"
      }
    }
  }
}
```

## 🔧 Código de Ejemplo (Node.js)

```javascript
const admin = require('firebase-admin');

async function sendPushNotification(fcmToken, title, body, data = {}) {
  const message = {
    token: fcmToken,
    notification: {
      title: title,
      body: body,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default_channel',
        sound: 'default',
        priority: 'high',
      },
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // Para compatibilidad
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notificación enviada:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error al enviar:', error);
    return { success: false, error: error.message };
  }
}
```

## 🔧 Código de Ejemplo (Python)

```python
from firebase_admin import messaging

def send_push_notification(fcm_token, title, body, data=None):
    message = messaging.Message(
        token=fcm_token,
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                channel_id='default_channel',
                sound='default',
                priority='high',
            ),
        ),
        data=data or {},
    )
    
    try:
        response = messaging.send(message)
        print(f'✅ Notificación enviada: {response}')
        return {'success': True, 'message_id': response}
    except Exception as error:
        print(f'❌ Error al enviar: {error}')
        return {'success': False, 'error': str(error)}
```

## 🔧 Código de Ejemplo (cURL)

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/TU_PROJECT_ID/messages:send \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "FCM_TOKEN_DEL_DISPOSITIVO",
      "notification": {
        "title": "Nueva Reservación",
        "body": "Tu reservación ha sido confirmada"
      },
      "android": {
        "priority": "high",
        "notification": {
          "channel_id": "default_channel",
          "sound": "default",
          "priority": "high"
        }
      },
      "data": {
        "type": "reservation_confirmed",
        "reservation_id": "123"
      }
    }
  }'
```

## 📝 Notas Importantes

1. **`notification` es obligatorio** para que Android muestre la notificación automáticamente
2. **`android.priority: "high"` es obligatorio** para que funcione con app cerrada
3. **`channel_id: "default_channel"` debe coincidir** con el canal creado en la app
4. **`data` es opcional** pero útil para pasar información adicional a la app
5. **El token FCM** se obtiene del listener `registration` y se guarda en `client_devices`

## ✅ Checklist para Backend

- [ ] Payload incluye `notification` con `title` y `body`
- [ ] Payload incluye `android.priority: "high"`
- [ ] Payload incluye `android.notification.channel_id: "default_channel"`
- [ ] Backend usa HTTP v1 API de Firebase
- [ ] Backend tiene acceso token válido de Firebase
- [ ] Backend obtiene el token FCM de la tabla `client_devices`

