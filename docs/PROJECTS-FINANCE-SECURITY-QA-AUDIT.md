# Auditoría técnica post-implementación · Proyectos, Finanzas, Equipo, Dashboard

Fecha: 2026-05-20 · Tras integrar `origin/main` (commit del compañero "Nuray
Analytics") en `main`. `npm run lint` y `npm run build` en verde.

Alcance: módulos de Proyectos y Finanzas, asignación de tareas a Óliver/Armando/
Álvaro, dashboard control-tower e integraciones cliente↔proyecto↔rentabilidad.
No se añaden funcionalidades nuevas: solo detección y corrección de fallos.

---

## Resumen de severidad

| Severidad   | Nº | Estado |
|-------------|----|--------|
| Crítico     | 0  | — |
| Importante  | 2  | 1 corregido · 1 documentado (decisión de arquitectura) |
| Menor       | 3  | 2 corregidos · 1 recomendación |

---

## 1. Base de datos y migraciones

**Estado: correcto.**

- `supabase/schema.sql` es **idempotente**: `create table if not exists`,
  `create or replace trigger`, `create index if not exists`, columnas con
  `add column if not exists`, constraints y policies protegidas con guardas
  (`drop constraint if exists` / `do $$ if not exists`).
- **Migración de estados de proyectos no destructiva**: `paused → on_hold` y
  `archived → cancelled` se ejecutan con `UPDATE` antes de cambiar el check
  constraint. Los valores heredados que siguen siendo válidos (`active`,
  `completed`) no se tocan. No hay valores antiguos que queden fuera del nuevo
  set, por lo que el `add constraint` no puede fallar por datos.
- Tras el merge, las columnas de analytics del compañero (`analytics_sync_status`,
  `analytics_last_synced_at`, `analytics_sync_error` en `clients`) y mis cambios
  (`projects`, `tasks.assignee`, `finance_transactions`) **coexisten en regiones
  distintas del archivo**; el schema quedó alineado con los tipos de
  `database.ts`.
- Nullabilidad correcta: en `finance_transactions`, `type/status/amount/concept/
  transaction_date` son `not null` (con defaults sensatos); `category/due_date/
  client_id/project_id/payment_method/notes` son nullable. `projects.client_id`,
  `owner`, `due_date`, `estimated_value` nullable (relación opcional). Índices
  añadidos en todas las FKs y campos de filtrado.

**[Menor · recomendación, no aplicada]** `finance_transactions.amount numeric not
null default 0` admite 0 o negativos a nivel de BD (la UI ya valida `> 0`). Se
podría reforzar con `check (amount >= 0)`, pero no se aplica para no arriesgar un
fallo de constraint sobre datos existentes y porque la validación de UI ya cubre
el alta. Queda como mejora opcional.

## 2. RLS y seguridad

**Política `open_finance`** — `for all using (true) with check (true)` para el rol
`anon`: permite **lectura y escritura completas** de `finance_transactions`.

**[Importante · documentado, sin cambio de código]**
- `open_finance` es **idéntica al patrón de todas las demás tablas** de la app
  (`open_clients`, `open_tasks`, `open_projects`, etc.). **No es una regresión ni
  es más permisiva** que el resto.
- El modelo de seguridad de la app (documentado en el propio `schema.sql` y en
  `lib/supabase/server.ts`) es: no hay auth por usuario; el acceso se controla en
  la capa Next.js con `NURAY_ACCESS_CODE`, y tanto el cliente de navegador como el
  de servidor usan la **anon key**.
- Riesgo real **sistémico** (pre-existente, afecta a toda la app, no solo a
  finanzas): la anon key viaja al navegador (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
  Cualquiera que la extraiga puede leer/escribir Supabase directamente saltándose
  el AccessGate. Esto vale para clientes, tareas, finanzas, etc.
- **Por qué no se "endurece" solo finanzas**: restringir `open_finance` rompería
  los repositorios client-side de finanzas (usan la anon key) y dejaría la app
  incoherente. La corrección correcta es una migración a Supabase Auth para toda
  la app, que está **fuera del alcance de esta auditoría** y debe decidirse a
  nivel de producto. Recomendación registrada abajo.
- RLS de `projects`, `tasks` y `finance_transactions`: las tres tienen RLS
  **habilitada** y su policy abierta correspondiente. Consistente.

## 3. Lógica de finanzas

**Estado: coherente.** Centralizada en `src/lib/finance/summary.ts`.

- **Ingresos/gastos confirmados**: suma de `amount` con `status='confirmed'` por
  tipo.
- **Neto** = ingresos confirmados − gastos confirmados. **Los movimientos
  pendientes NO entran en el neto** (confirmado explícitamente). Correcto.
- **Pendiente de cobro** = ingresos `pending`; **pendiente de pago** = gastos
  `pending`. En el dashboard y la cabecera de `/finance` los pendientes se
  calculan **globalmente** (no por mes), porque representan saldo vivo; los KPIs
  de ingresos/gastos/neto sí son del periodo seleccionado. Decisión coherente y
  documentada.
- **"Vencido"**: derivado en UI (`pending` + `due_date < hoy`), no se almacena.
  Correcto y evita estados obsoletos.
- **Rentabilidad por proyecto / resumen por cliente**: aplican `summarize()` al
  subconjunto filtrado por `project_id` / `client_id`. Sin duplicar lógica.

**[Importante · CORREGIDO] Inconsistencia de zona horaria en columnas solo-fecha.**
`new Date("YYYY-MM-DD")` se interpreta como medianoche **UTC**, lo que desplaza el
día natural en zonas con offset negativo y podía marcar como "vencido" un
movimiento que vence hoy, o clasificar el día 1 de mes en el mes anterior (KPIs).
En España (UTC+1/+2) el impacto era nulo, pero era un fallo latente.
- Corregido con helper compartido `parseDateOnly()` + `startOfToday()` en
  `lib/utils/dates.ts`, aplicado en `summary.ts` (`isOverdue`, `inMonth`),
  `/finance` (`inPeriod`, `years`), `/projects` (vencido y filtro de vencimiento)
  y `/dashboard` (proyectos próximos).
- De paso se eliminó la mutación de `now` en `isOverdue` (efecto secundario).

**[Menor · CORREGIDO]** PostgREST puede devolver columnas `numeric` como string.
`formatMoney()` ahora coacciona a número y devuelve "—" ante `NaN`, evitando
render "NaN €". `summarize()` ya usaba `Number(tx.amount)` defensivamente.

## 4. Lógica de proyectos y tareas

**Estado: correcto.**

- CRUD de proyectos: crear/editar/eliminar (con confirmación) vía `ProjectEditor`.
  Estados y prioridades consistentes con `PROJECT_STATUSES`/`PRIORITIES` (valores
  en inglés, etiquetas en español).
- Tareas ↔ proyecto: `tasks.project_id` (FK `on delete set null`). Crear tarea
  desde el detalle preselecciona el proyecto (`defaultProjectId`). Al cambiar el
  proyecto de una tarea en el detalle, se retira de la lista local correctamente.
- Asignación a Óliver/Armando/Álvaro: `tasks.assignee` (enum con check). Selector
  en editor, badge en `TaskRow`, filtro en `/tasks` (incl. "Sin asignar") y filtro
  por responsable dentro del detalle de proyecto.
- Progreso del proyecto: `done/total` sobre tareas con ese `project_id`; 0% si no
  hay tareas. Correcto.
- Relación con clientes: `projects.client_id`; el detalle de cliente lista
  proyectos vinculados y su estado.
- Naming y datos heredados: coherentes; `type` se conserva como campo secundario
  sin romper datos previos.

## 5. Dashboard

**Estado: correcto.**

- No falla sin datos: todos los bloques tienen estado vacío explícito.
- Carga 7 colecciones en paralelo una sola vez (`Promise.all`); para la escala de
  una herramienta interna es adecuado (no hay N+1 ni queries por fila).
- KPIs e indicadores derivan de `useMemo` sin recalcular en cada render.
- Integra operativa (proyectos/tareas), equipo (carga por persona) y finanzas del
  mes; alertas accionables solo si hay datos.
- No quedó roto por el merge; la integración de analytics no toca el dashboard.

**[Menor · CORREGIDO]** El dashboard definía su propio `startOfToday()`; se
sustituyó por el de `lib/utils/dates.ts` (elimina duplicación).

## 6. Tipado y arquitectura

**Estado: correcto.**

- Separación limpia y sin solapamiento de responsabilidades:
  - `lib/repositories/finance.ts` → acceso a datos (CRUD Supabase).
  - `lib/finance/summary.ts` → lógica de negocio (agregados, vencido, mes).
  - `lib/utils/money.ts` → formato monetario.
  - `lib/utils/dates.ts` → parseo/format de fechas (incl. nuevo `parseDateOnly`).
- Lógica de negocio fuera de los componentes (los componentes consumen
  `summarize`, `isOverdue`, etc.).
- TypeScript: sin `any`. Un único cast justificado en `TaskEditor`
  (`(assignee || null) as TeamMember | null`) al leer un `<select>`.
- El merge no generó código duplicado ni patrones contradictorios: la integración
  de analytics es server-side e independiente de Proyectos/Finanzas.

## 7. QA — simulación del flujo completo

`cliente → proyecto → tareas → movimientos → dashboard` (razonado sobre el código;
no se ejecutó la UI en navegador):

1. **Cliente**: alta vía `ClientEditor`. Detalle muestra resumen económico y
   proyectos vinculados (vacíos al inicio → estados vacíos correctos).
2. **Proyecto**: alta con cliente/responsable/fecha límite. Detalle muestra
   indicadores a 0 y rentabilidad vacía con CTA "Registrar movimiento".
3. **Tareas asignadas**: crear tareas para Óliver, Armando y Álvaro desde el
   detalle (proyecto preseleccionado) → badge de responsable y progreso suben.
4. **Filtro por responsable**: `/tasks` y detalle de proyecto filtran por cada
   miembro y por "Sin asignar".
5. **Rentabilidad**: ingreso confirmado + gasto confirmado ligados al proyecto →
   ingresos/gastos/neto correctos; un ingreso `pending` aparece como pendiente de
   cobro y no suma al neto; con `due_date` pasada se marca "Vencido".
6. **Resumen por cliente**: agrega los movimientos del cliente.
7. **Dashboard**: sin datos carga con estados vacíos; con datos refleja proyectos
   activos, tareas pendientes/vencidas/sin asignar, carga del equipo, finanzas del
   mes y alertas.

Verificación automática: `npm run lint` sin warnings; `npm run build` compila
todas las rutas (`/finance`, `/projects/[id]`, `/dashboard`, `/clients/[id]` y la
ruta de analytics del compañero).

---

## Correcciones aplicadas (resumen)

1. `lib/utils/dates.ts`: nuevos `parseDateOnly()` y `startOfToday()`.
2. `lib/finance/summary.ts`: `isOverdue` e `inMonth` usan parseo local; sin
   mutación de `now`.
3. `/finance`, `/projects`, `/dashboard`: comparaciones de fechas solo-fecha
   migradas a `parseDateOnly`/`startOfToday`.
4. `lib/utils/money.ts`: `formatMoney` tolera `numeric` como string.
5. `/dashboard`: eliminado `startOfToday` duplicado.

## Recomendaciones (no aplicadas, requieren decisión de producto)

- **Seguridad (importante a medio plazo)**: migrar a Supabase Auth y sustituir las
  policies abiertas (`open_*`, incl. `open_finance`) por policies basadas en
  usuario/rol. Mientras tanto, tratar la anon key como semi-secreta y no
  publicarla fuera del equipo.
- `finance_transactions`: añadir `check (amount >= 0)` si se desea blindar a nivel
  de BD.
