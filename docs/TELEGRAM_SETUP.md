# Configurar Telegram para recordatorios

Pasos para que Nuray Workspace envíe recordatorios al chat correcto.

## 1. Crear el bot

1. Abre Telegram y busca [`@BotFather`](https://t.me/BotFather).
2. Envía `/newbot`.
3. Elige un nombre (visible) y un username (debe terminar en `bot`).
4. BotFather te devuelve un **token** del tipo
   `123456789:AAH...`. **Cópialo**, esto es `TELEGRAM_BOT_TOKEN`.

## 2. Empezar conversación con el bot

Telegram no permite que un bot escriba primero. Tienes que iniciar el chat:

1. Abre el bot que acabas de crear.
2. Pulsa **Start** o envía `/start`.
3. Si quieres recibir los recordatorios en un grupo, añade el bot al grupo y
   envía cualquier mensaje.

## 3. Obtener el `chat_id`

Hay dos formas:

### Opción A: con `getUpdates`

1. En el navegador, visita:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   Sustituye `<TOKEN>` por el token del paso 1.
2. Busca en la respuesta JSON el bloque `"chat":{"id": ...}`. Ese número es tu
   `chat_id`.

> Si no aparece nada, asegúrate de haber escrito al bot al menos una vez.

### Opción B: bot auxiliar

Habla con `@userinfobot` para ver tu `chat_id` personal.

## 4. Configurar variables

En `.env.local` (o en Vercel → Project Settings → Environment Variables):

```
TELEGRAM_BOT_TOKEN=123456789:AAH...
TELEGRAM_CHAT_ID=12345678
REMINDER_CRON_SECRET=algo-largo-y-aleatorio
```

`REMINDER_CRON_SECRET` es el valor que protege el endpoint que dispara los
envíos. Genera algo aleatorio:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Probar el envío

Con la app corriendo (local o desplegada):

```bash
curl -X POST "https://TU-APP/api/reminders/send-due?secret=TU_SECRET"
# o con header:
curl -X POST https://TU-APP/api/reminders/send-due \
  -H "Authorization: Bearer TU_SECRET"
```

Pasos para probar de verdad:

1. Crea un recordatorio en la app con canal **Telegram** y `Fecha y hora` en el
   pasado (por ejemplo, hace 1 minuto).
2. Lanza el `curl` de arriba.
3. La respuesta JSON debería ser algo como
   `{"processed":1,"sent":1,"failed":0}`.
4. El mensaje debe llegar a tu chat de Telegram.
5. En la app, el recordatorio aparece como **enviado**.

## 6. Vercel Cron

`vercel.json` ya está configurado para llamar al endpoint cada 5 minutos:

```json
{
  "crons": [
    { "path": "/api/reminders/send-due", "schedule": "*/5 * * * *" }
  ]
}
```

Como Vercel Cron no permite cabeceras personalizadas, hay dos opciones:

- **Cambiar el `path`** al formato con query param:
  `/api/reminders/send-due?secret=TU_SECRET`. Es lo más sencillo.
- O configurar un **schedule externo** (cron-job.org, GitHub Actions, etc.) que
  envíe el header `Authorization: Bearer TU_SECRET`.

El endpoint acepta ambas formas.

## 7. Depurar errores

- **`unauthorized`**: el secret enviado no coincide con `REMINDER_CRON_SECRET`,
  o la variable no está definida en el server.
- **`TELEGRAM_BOT_TOKEN no configurado`**: añade la variable y vuelve a
  desplegar.
- **`Bad Request: chat not found`**: el `chat_id` está mal, o aún no has
  escrito al bot desde tu cuenta.
- **`processed: 0`**: no había recordatorios con
  `status='scheduled'`, `channel='telegram'` y `remind_at <= now()`.

Cualquier error de Telegram queda guardado en la fila del recordatorio
(`error_message`) y la página de Recordatorios lo muestra.
