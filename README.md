# Backend de notificaciones push

API REST para registrar dispositivos FCM de usuarios autenticados por Firebase y enviar notificaciones push individuales a todos los dispositivos de un destinatario.

## Requisitos y configuracion

- Node.js 20 o superior.
- Un proyecto Firebase con Firebase Authentication, Cloud Firestore y Firebase Cloud Messaging habilitados.
- Una cuenta de servicio que pueda acceder a esos servicios para desarrollo local, o una identidad de servicio de Google Cloud para Cloud Run.

Instala las dependencias y prepara el entorno:

```bash
npm install
cp .env.example .env
```

Configura `GOOGLE_APPLICATION_CREDENTIALS` con la ruta absoluta al JSON de la cuenta de servicio para desarrollo local. No subas ese archivo ni `.env` al repositorio.

| Variable | Requerida | Descripcion |
| --- | --- | --- |
| `PORT` | No | Puerto HTTP; predeterminado: `3000`. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local | Ruta absoluta a la cuenta de servicio de Firebase. Cloud Run usa la identidad de servicio adjunta. |
| `LOG_LEVEL` | No | Nivel Pino; predeterminado: `info`. |
| `NOTIFICATION_RATE_LIMIT_MAX` | No | Maximo de envios por uid y minuto; predeterminado: `30`. |

## Comandos

```bash
npm start
npm run dev
npm test
npm test -- test/app.test.js
npm test -- -t "registers a normalized username"
npm run test:watch
npm run lint
```

## API

Las rutas protegidas requieren `Authorization: Bearer <Firebase ID Token>`. El uid siempre se extrae de ese token.

La documentacion interactiva esta disponible en [`/api-docs`](http://localhost:3000/api-docs) y la especificacion OpenAPI JSON en [`/api-docs.json`](http://localhost:3000/api-docs.json) cuando el servidor esta en ejecucion. Usa el boton **Authorize** de Swagger UI para proporcionar un Firebase ID Token antes de probar las rutas protegidas.

### `GET /health`

Devuelve `{ "status": "ok" }` y no requiere autenticacion.

### `POST /api/tokens/register`

Registra el token en el perfil del usuario autenticado y reclama su username de forma transaccional.

```json
{
  "token": "fcm-token-del-dispositivo",
  "mobileNumber": "+51999999999",
  "username": "juan_perez"
}
```

Los usernames se normalizan a minusculas y deben tener 3-30 caracteres `[a-z0-9_]`. Los numeros deben cumplir E.164. Responde `409` si otro uid ya posee el username.

### `POST /api/tokens/remove`

Elimina de forma idempotente un token del usuario autenticado.

```json
{ "token": "fcm-token-del-dispositivo" }
```

### `POST /api/notifications/send`

Envía una notificacion a todos los dispositivos registrados de `toUserId`.

```json
{
  "toUserId": "uid-del-destinatario",
  "title": "Nuevo mensaje",
  "body": "Juan te envio un mensaje",
  "data": { "chatId": "123" }
}
```

`data` acepta pares string-string para cumplir con FCM. La respuesta incluye los conteos de intentos, envios y tokens eliminados, sin exponer tokens. Los tokens con los errores `invalid-registration-token` o `registration-token-not-registered` se eliminan automaticamente.

## Modelo Firestore

`users/{uid}` almacena `fcmTokens`, `mobileNumber`, `username` y `updatedAt`. `usernames/{username}` guarda el uid propietario y hace que la unicidad se mantenga bajo concurrencia mediante una transaccion.

## Regla de envio actual

En este MVP cualquier usuario autenticado puede enviar a cualquier `toUserId`. Debe añadirse una autorizacion basada en contactos o membresia de chat antes de usar el servicio en produccion.
