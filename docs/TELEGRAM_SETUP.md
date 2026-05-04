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

## 6. Programar el envío

El endpoint `/api/reminders/send-due` está siempre disponible.

**Métodos**: acepta `GET` y `POST` indistintamente. El comportamiento es
idéntico: procesa los recordatorios `status=scheduled, channel=telegram,
remind_at <= now()` y devuelve JSON.

**Autenticación**: en cada llamada hay que pasar el secret de una de estas
dos formas:

- Header: `Authorization: Bearer <REMINDER_CRON_SECRET>`
- Query param: `?secret=<REMINDER_CRON_SECRET>`

Sin secret válido devuelve `HTTP 401 {"error":"unauthorized"}`.

**Respuesta** (HTTP 200): `{"processed":N,"sent":X,"failed":Y}`.

### Vercel Hobby (plan gratuito) — sin cron sub-diario

El plan Hobby de Vercel limita los cron jobs a **uno al día como máximo**.
Por eso el `vercel.json` de este proyecto está vacío (`{}`): el cron no se
declara en Vercel.

#### Recomendado: cron-job.org

1. Regístrate en <https://cron-job.org/> (gratis, basta email).
2. **Create cronjob**:
   - **Title**: `Nuray reminders`
   - **URL**: `https://nuray-organizador.vercel.app/api/reminders/send-due?secret=<REMINDER_CRON_SECRET>`
   - **Schedule**: every 5 minutes (preset).
   - **Request method**: `POST` o `GET` (cualquiera funciona; preferir `POST` por
     semántica — está cambiando estado en la base de datos).
   - **Request timeout**: `30` segundos.
   - **Notifications** (opcional): activar "Send notification on failure".
   - **Save**.
3. Pulsa **Run now** una vez para validar. Espera HTTP 200 con
   `{"processed":N,"sent":...,"failed":...}`.
4. Listo. Cada 5 min cron-job.org llama al endpoint y los recordatorios
   `scheduled+telegram` con `remind_at <= now()` se procesan.

> **Importante**: el `REMINDER_CRON_SECRET` va en la URL como query param. No lo
> compartas. cron-job.org guarda la URL cifrada en su lado. Si necesitas
> rotarlo, regenera el secret en `.env.local` + Vercel y actualiza la URL en
> cron-job.org.

#### Alternativas equivalentes

- **GitHub Actions scheduled workflow**: workflow con `cron: '*/5 * * * *'` que
  haga `curl` al endpoint. Guarda `REMINDER_CRON_SECRET` como secret del repo,
  nunca en el yaml.
- **UptimeRobot** (gratis para 5 min de intervalo): apunta un monitor HTTP
  `GET` al endpoint con la query del secret.

### Vercel Pro

Restaura el cron en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/reminders/send-due?secret=TU_SECRET", "schedule": "*/5 * * * *" }
  ]
}
```

Vercel Cron no permite cabeceras, así que mete el secret en el `path` como
query. El endpoint acepta ambas formas.

### Cómo probar que el cron funciona (smoke test 2 minutos)

1. En la app: **Recordatorios → Nuevo recordatorio**:
   - Título: `Test cron`
   - Canal: `Telegram`
   - Enviar a: tu destinatario individual
   - Fecha y hora: en 2 minutos desde ahora
   - Crear.
2. Espera el siguiente tick de cron-job.org (máx. 5 min).
3. Confirma:
   - Mensaje recibido en Telegram.
   - Recordatorio aparece en la pestaña **Enviados** de la app con
     `telegram_sent_at` poblado.
   - cron-job.org muestra "Last execution: success".
4. Si no llega:
   - Revisa **Recordatorios → Fallidos** en la app: el `error_message` indica
     la causa exacta.
   - Revisa el log de cron-job.org para ver si el HTTP fue 200 / 401 / 500.

### Disparo manual (sin cron) desde tu máquina

Si necesitas procesar la cola ahora mismo sin esperar al cron:

```bash
# El secret se lee directamente de tu .env.local sin imprimirlo
SECRET=$(grep '^REMINDER_CRON_SECRET=' "$HOME/Desktop/Nuray organización/.env.local" | cut -d= -f2)
curl -X POST "https://nuray-organizador.vercel.app/api/reminders/send-due?secret=$SECRET"
unset SECRET
```

## 7. Múltiples destinatarios (individuales y equipos)

A partir de la v0.2 la app soporta enviar cada recordatorio a un destinatario
concreto en lugar de al `TELEGRAM_CHAT_ID` global. La gestión está en
**Recordatorios → Destinatarios**.

### Por qué chat_id y no teléfono

Telegram Bot API no permite enviar mensajes por número de teléfono. Sólo por
`chat_id`. Cada persona y cada grupo tienen su propio `chat_id`, y un bot sólo
puede escribir a un usuario después de que ese usuario haya iniciado el chat.

### Añadir un destinatario individual (Armando, Álvaro, …)

Para cada persona:

1. Que abra el bot: <https://t.me/nurirecordatoriosbot> y pulse **Start**
   (o envíe `/start`).
2. Opcional, para identificarlo en `getUpdates`: que escriba algo como
   `Hola soy Armando`.
3. Tú, con el token del bot, abres en el navegador:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
4. En el JSON, busca el bloque correspondiente y copia
   `result[N].message.chat.id`. Es un número positivo (ej. `123456789`).
5. En la app, **Recordatorios → Destinatarios → Nuevo destinatario**:
   - Nombre: `Armando`
   - Tipo: `Individual`
   - chat_id: el número copiado
6. Guardar. A partir de ahí ese destinatario aparece en el select **Enviar a**
   al crear cualquier recordatorio Telegram.

> El `chat_id` no es el teléfono. Aunque la persona tenga el número conocido,
> Telegram entrega los mensajes por chat_id, así que es lo único que se guarda.

### Añadir un destinatario de equipo (grupo)

1. Crea un grupo en Telegram con las personas del equipo.
2. Añade `@nurirecordatoriosbot` al grupo.
3. Envía un mensaje cualquiera en el grupo (necesario para que el bot reciba
   el update del grupo).
4. En `https://api.telegram.org/bot<TOKEN>/getUpdates` busca el bloque del
   grupo. El `chat.id` aquí es **negativo** (ej. `-1001234567890` para
   supergrupos).
5. En la app, **Nuevo destinatario** con tipo `Equipo` y ese chat_id.

Cuando un recordatorio apunte a ese destinatario, el bot escribe en el grupo y
todos los miembros ven el mensaje.

### Cómo se resuelve el destinatario al enviar

Lógica del endpoint `/api/reminders/send-due`:

1. Si el recordatorio tiene `notification_target_id` → usa el `telegram_chat_id`
   de ese destinatario.
2. Si el destinatario está inactivo → marca el recordatorio como `failed`
   con error `Destinatario inactivo`.
3. Si no tiene target → cae al `TELEGRAM_CHAT_ID` global del entorno (modo
   compatibilidad con la primera versión).
4. Si ni hay target ni hay variable global → marca `failed` con
   `TELEGRAM_CHAT_ID no configurado`.

## 8. Depurar errores

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
