# Plan técnico · Módulos Proyectos y Finanzas

Ampliación de Nuray Workspace con un módulo de **Proyectos** completo y un módulo
de **Finanzas internas**. Documento previo a la implementación.

## 1. Arquitectura actual (auditoría)

- **Stack**: Next.js 14 (App Router) + TypeScript + Tailwind + Supabase.
- **Rutas**: route group `src/app/(app)/*` protegido por `AccessGate` (código
  `NURAY_ACCESS_CODE`) y envuelto en `AppShell` (Sidebar + MobileNav).
- **Datos**: 100% client-side. Cada entidad tiene un repositorio en
  `src/lib/repositories/*` que usa `getSupabaseBrowser()` (anon key). No hay
  server actions ni API de datos; las páginas son client components que cargan
  con `useEffect` + `Promise.all`.
- **Tipos**: a mano en `src/types/database.ts`. Listas de opciones y etiquetas
  en `src/types/app.ts`. Convención: **valores enum en inglés, etiquetas en
  español**.
- **UI**: componentes en `src/components/ui/*` (`Button`, `Input/Select/
  Textarea/Field`, `Modal`, `Card`, `Badge` con tonos, `PageHeader`,
  `EmptyState`, `PageLoader`, `useToast`). Patrón CRUD = lista + `Modal` editor
  con borrado confirmado inline.
- **Esquema**: único archivo `supabase/schema.sql`, idempotente
  (`create table if not exists`, `do $$ ... $$` para policies). RLS habilitada
  pero abierta para `anon` (no hay modelo por usuario). Trigger `set_updated_at`.
- **Estado previo de proyectos**: ya existían `projects` (tabla), `ProjectEditor`
  y `/projects` (lista), pero con un modelo distinto al pedido. Las tareas ya
  tienen `project_id`; los eventos de calendario también.

## 2. Decisiones de diseño

1. **Extender, no reemplazar** la tabla `projects` (datos existentes intactos):
   - Añadir `client_id`, `due_date`, `estimated_value`, `owner` (responsable,
     texto libre — no existe modelo de usuarios, solo destinos Telegram).
   - Nuevo set de `status`: `idea | pending | active | on_hold | completed |
     cancelled`. Migración de valores heredados: `paused → on_hold`,
     `archived → cancelled`.
   - Se conserva `type` (agency/study/personal/internal) como campo secundario
     opcional para no romper datos ni el dashboard.
2. **Finanzas**: nueva tabla `finance_transactions`.
   - `status` almacenado = `pending | confirmed`. El estado **vencido** se
     **deriva** (`pending` + `due_date < hoy`) en la UI, evitando un cron que
     mantenga un estado obsoleto. Es la "estructura equivalente razonable" que
     permite el encargo.
   - `category` y `payment_method` como `text` con catálogos sugeridos en
     `app.ts` (sin sobreingeniería de tablas catálogo).
3. **Integración tareas↔proyecto**: ya soportada (`tasks.project_id`). Se añade
   `defaultProjectId` opcional al `TaskEditor` para crear tareas desde el
   detalle del proyecto con el proyecto preseleccionado.
4. **Integración financiera↔proyecto/cliente**: `finance_transactions.client_id`
   y `project_id` nullable. El detalle de proyecto muestra ingresos/gastos/neto
   asociados.
5. Sin nuevas dependencias (no se añade Zod ni librería de gráficos; validación
   inline como el resto de la app; gráficos con barras CSS).

## 3. Cambios de base de datos (`supabase/schema.sql`)

- `projects`: nuevas columnas inline (fresh install) + `alter ... add column if
  not exists` (instalaciones existentes), migración de status y swap del check
  constraint, índices `client_id/status/due_date`.
- `finance_transactions`: nueva tabla + trigger `updated_at` + índices
  (`transaction_date`, `type`, `status`, `client_id`, `project_id`) + RLS
  habilitada con policy abierta `open_finance`.

## 4. Archivos a crear / modificar

Crear:
- `src/lib/repositories/finance.ts`
- `src/app/(app)/projects/[id]/page.tsx`
- `src/app/(app)/finance/page.tsx`
- `src/components/finance/FinanceEditor.tsx`
- `docs/PROJECTS-FINANCE-IMPLEMENTATION-SUMMARY.md`

Modificar:
- `supabase/schema.sql`
- `src/types/database.ts` (Project ampliado, ProjectStatus nuevo, tipos Finance)
- `src/types/app.ts` (PROJECT_STATUSES/PROJECT_TYPES, catálogos Finance)
- `src/components/ui/Badge.tsx` (`projectStatusTone`, `financeStatusTone`)
- `src/lib/repositories/projects.ts` (payload con campos nuevos)
- `src/components/projects/ProjectEditor.tsx` (campos nuevos + prop `clients`)
- `src/app/(app)/projects/page.tsx` (filtros estado/prioridad/cliente/venc. +
  búsqueda, enlace a detalle)
- `src/components/tasks/TaskEditor.tsx` (`defaultProjectId`)
- `src/components/layout/Sidebar.tsx` (entrada "Finanzas")

## 5. Finanzas · KPIs y vistas

- Cabecera KPIs del mes actual: ingresos confirmados, gastos confirmados, neto,
  pendiente de cobro (income pending), pendiente de pago (expense pending),
  margen %, variación de neto vs mes anterior.
- Gráficos ligeros: ingresos vs gastos (últimos 6 meses) y distribución de
  gastos por categoría (barras CSS).
- Tabla de movimientos con filtros: mes, año, tipo, estado, categoría, proyecto,
  cliente. CRUD vía `FinanceEditor` (modal) con borrado confirmado.

## 6. Validación y robustez

- Validación inline (concepto e importe obligatorios; importe > 0).
- Manejo de errores de Supabase con `toast` + estados de error/reintento.
- Estados vacíos con `EmptyState`.
- TypeScript estricto, sin `any` innecesarios.
