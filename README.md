# Nuray Workspace

Software interno para organizar trabajo, estudio, clientes y proyectos.
Pensado para uso diario en escritorio y móvil. Sin landing, sin login complejo,
sin animaciones innecesarias.

## Funcionalidades

- **Dashboard** con tareas de hoy, urgentes, bloqueadas, próximos eventos, recordatorios e inbox.
- **Inbox** (Quick Capture) para guardar texto y notas de voz rápido y procesarlas después.
- **Tareas** con vista lista y kanban, checklist interno, filtros y búsqueda.
- **Calendario** mensual con día seleccionado, eventos, fechas límite y recordatorios.
- **Clientes Nuray** (mini-CRM): estado comercial, estado del proyecto, notas, links.
- **Proyectos** (agencia, estudio, personal, interno) con progreso por tareas.
- **Recordatorios** programables, en la app o por Telegram.
- **Configuración** con estado del entorno (Supabase / Telegram / acceso).
- **Acceso interno** por código compartido (`NURAY_ACCESS_CODE`).
- **Quick Add** móvil con 4 modos: Texto e ideas (Inbox), Audio (Inbox), Tarea, Recordatorio.

### Quick Capture Inbox

Texto o nota de voz rápida que se guardan como **captura pendiente** sin
estructurarla todavía como tarea/cliente/proyecto. Después se procesa desde
`/inbox`.

- Audio se sube al bucket de Supabase Storage `quick-captures` (público,
  límite 25 MB, audio mime types). El `audio_url` resultante se reproduce
  con un `<audio>` HTML5 desde el inbox.
- No hay transcripción automática. La intención es capturar primero y
  procesar a mano cuando haya tiempo.
- Borrar una captura de audio elimina también el archivo del bucket
  (best-effort: si falla, queda documentado en el toast).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + REST)
- date-fns
- lucide-react

## Cómo ejecutar local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables (ver .env.example)
cp .env.example .env.local
# y editar .env.local con tus valores

# 3. Levantar el dev server
npm run dev
```

Abre http://localhost:3000

## Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En el dashboard, ve a **SQL editor** y pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql). Ejecuta.
3. En **Project Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> El esquema incluye RLS abierto (any role) porque la app no usa auth de
> Supabase: la barrera de acceso vive en el front (`NURAY_ACCESS_CODE`). Si más
> adelante añades login real, ajusta las policies del SQL.

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NURAY_ACCESS_CODE=                # código compartido para entrar a la app
TELEGRAM_BOT_TOKEN=               # opcional, sólo si usas recordatorios Telegram
TELEGRAM_CHAT_ID=                 # opcional, chat o grupo destino
REMINDER_CRON_SECRET=             # secreto para el cron job
```

## Telegram

Pasos detallados en [`docs/TELEGRAM_SETUP.md`](docs/TELEGRAM_SETUP.md).

Resumen:

1. Habla con [@BotFather](https://t.me/BotFather) → `/newbot` → copia el token.
2. Escribe a tu nuevo bot desde Telegram para que pueda contactarte.
3. Saca tu `chat_id` con `https://api.telegram.org/bot<TOKEN>/getUpdates`.
4. Añade `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en `.env.local` o en Vercel.

### Probar manualmente el envío

```bash
curl -X POST "http://localhost:3000/api/reminders/send-due?secret=$REMINDER_CRON_SECRET"
# o con header:
curl -X POST http://localhost:3000/api/reminders/send-due \
  -H "Authorization: Bearer $REMINDER_CRON_SECRET"
```

Crea un recordatorio con canal `telegram` y `remind_at` en el pasado, ejecuta el
comando, y comprueba que el mensaje llega.

## Deploy en Vercel

1. Sube el repo a GitHub.
2. En [vercel.com](https://vercel.com) → **Import Project** → selecciona el repo.
3. Añade las variables de entorno en *Project Settings → Environment Variables*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NURAY_ACCESS_CODE`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `REMINDER_CRON_SECRET`
4. Deploy.

### Cron de recordatorios

`vercel.json` está intencionadamente vacío (`{}`) porque el plan **Hobby** de
Vercel limita los cron jobs a uno al día, lo cual no es útil para
recordatorios. El endpoint `/api/reminders/send-due` sigue funcionando — lo que
cambia es quién lo llama:

- **Hobby**: programa un job externo (recomendado **cron-job.org**, gratis)
  que haga `POST` o `GET` a
  `/api/reminders/send-due?secret=<REMINDER_CRON_SECRET>` cada 5 minutos.
  Timeout 30s, success = HTTP 200.
- **Pro**: vuelve a declarar el cron en `vercel.json` con el secret en el
  `path`.

El endpoint acepta `GET` y `POST`; ambos exigen `secret` válido (sin él,
HTTP 401). Detalle paso a paso en
[`docs/TELEGRAM_SETUP.md`](docs/TELEGRAM_SETUP.md).

## Acceso interno

- La app pide un código en pantalla. Si coincide con `NURAY_ACCESS_CODE`, marca
  acceso en `localStorage` y devuelve una cookie ligera.
- El botón **Salir** (en Configuración y en la barra superior móvil) limpia el
  acceso.

> **Limitaciones de seguridad**: esto NO es autenticación real. Es una barrera
> ligera para uso personal. No expongas la app a internet con datos sensibles
> sin endurecer (Supabase auth, RLS por usuario, hosting con auth de plataforma,
> etc.).

## Próximos pasos recomendados

- Login con Supabase auth + RLS por usuario si entran más personas.
- Subida de archivos en clientes/proyectos.
- Notificaciones push del navegador para recordatorios `app`.
- Vista semanal de calendario.
- Importar/exportar CSV de clientes.

## Comandos útiles

```bash
npm run dev      # entorno de desarrollo
npm run lint     # ESLint
npm run build    # build de producción
npm start        # servidor en producción
```
