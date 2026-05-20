# Resumen · Módulos Proyectos y Finanzas (iteración 1)

## Qué se ha construido

### Módulo de Proyectos
- Tabla `projects` ampliada: `client_id`, `owner` (responsable), `due_date`,
  `estimated_value` y nuevo set de estados (`idea`, `pending`, `active`,
  `on_hold`, `completed`, `cancelled`).
- Lista de proyectos (`/projects`) con tarjetas premium, progreso por tareas y
  filtros: búsqueda, estado, prioridad, cliente y vencimiento (vencidos / vencen
  en 7 días / sin fecha).
- Página de detalle (`/projects/[id]`) con: indicadores (tareas totales,
  completadas, pendientes, % avance), resumen (cliente, responsable, fechas,
  valor estimado, descripción, notas), rentabilidad financiera del proyecto y
  tareas del proyecto filtrables por responsable. Crear/editar tareas y
  movimientos financieros desde el propio detalle.
- Editor de proyecto (`ProjectEditor`) con todos los campos nuevos.

### Módulo de Finanzas internas
- Nueva tabla `finance_transactions` (ingresos/gastos) con vínculo opcional a
  cliente y proyecto.
- Landing financiera (`/finance`) con:
  - KPIs del periodo: ingresos, gastos, resultado neto (con variación vs mes
    anterior), pendiente de cobro, pendiente de pago y margen.
  - Gráficos ligeros (barras CSS): ingresos vs gastos de los últimos 6 meses y
    distribución de gastos por categoría.
  - Tabla/lista de movimientos con filtros por mes, año, tipo, estado,
    categoría, proyecto y cliente.
  - CRUD completo vía `FinanceEditor` (registrar ingreso/gasto, editar, marcar
    pendiente/confirmado, eliminar con confirmación).

### Integraciones
- Tareas ↔ proyecto: ya existía `tasks.project_id`; ahora se preselecciona el
  proyecto al crear tareas desde su detalle.
- Finanzas ↔ proyecto y cliente: resumen económico (ingresos/gastos/neto) en el
  detalle de proyecto y de cliente, con proyectos vinculados en el cliente.

## Archivos clave

Nuevos:
- `src/lib/repositories/finance.ts`
- `src/lib/finance/summary.ts` (cálculos compartidos)
- `src/lib/utils/money.ts` (formato €)
- `src/app/(app)/projects/[id]/page.tsx`
- `src/app/(app)/finance/page.tsx`
- `src/components/finance/FinanceEditor.tsx`

Modificados:
- `supabase/schema.sql`
- `src/types/database.ts`, `src/types/app.ts`
- `src/components/ui/Badge.tsx` (`projectStatusTone`, `financeStatusTone`)
- `src/lib/repositories/projects.ts`, `tasks.ts`
- `src/components/projects/ProjectEditor.tsx`
- `src/app/(app)/projects/page.tsx`
- `src/components/tasks/TaskEditor.tsx` (campo `defaultProjectId`)
- `src/app/(app)/clients/[id]/page.tsx`
- `src/components/layout/Sidebar.tsx` (entrada "Finanzas")

## Tablas / modelos

- `projects`: + `client_id`, `owner`, `due_date`, `estimated_value`; estados
  nuevos. Índices en `client_id`, `status`, `due_date`.
- `finance_transactions` (nueva): `type`, `status`, `amount`, `concept`,
  `category`, `transaction_date`, `due_date`, `client_id`, `project_id`,
  `payment_method`, `notes`. RLS abierta `open_finance`. Índices en
  `transaction_date`, `type`, `status`, `client_id`, `project_id`.

## Decisiones técnicas

- **Extender, no reemplazar** la tabla `projects` para no perder datos. Migración
  idempotente de estados heredados (`paused → on_hold`, `archived → cancelled`).
- El estado **vencido** de un movimiento se **deriva** (`pending` + `due_date <
  hoy`) en vez de almacenarse, evitando un cron que mantenga el dato. Solo se
  guardan `pending`/`confirmed`.
- Categorías y método de pago como `text` con catálogos en `app.ts` (sin tablas
  catálogo).
- Sin nuevas dependencias: validación inline con `toast`, gráficos con barras CSS.
- Misma arquitectura: repositorios client-side con anon key, RLS abierta tras el
  AccessGate.

## Migraciones a aplicar en Supabase

Ejecutar `supabase/schema.sql` completo en el SQL editor (es idempotente: crea lo
que falte y aplica los `alter ... add column if not exists`, la migración de
estados y la nueva tabla `finance_transactions`).

## Variables de entorno

Ninguna nueva. Se usa la misma configuración de Supabase
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) y `NURAY_ACCESS_CODE`.

## Cómo probarlo

1. Aplica `supabase/schema.sql`.
2. `npm run dev`, entra con el código de acceso.
3. **Proyectos**: crea un proyecto con cliente, responsable y fecha límite;
   abre su detalle; crea tareas desde el detalle (quedan vinculadas); registra
   un ingreso y un gasto desde el detalle y comprueba la rentabilidad.
4. **Finanzas**: en `/finance` registra ingresos/gastos confirmados y
   pendientes; revisa KPIs, gráficos y filtros por mes/tipo/estado/proyecto.
5. **Cliente**: abre el detalle de un cliente con proyectos y movimientos para
   ver su resumen económico y proyectos vinculados.

## Siguientes mejoras posibles

- Exportar movimientos a CSV.
- Recordatorios automáticos para cobros/pagos vencidos.
- Presupuesto vs real por proyecto (comparar `estimated_value` con neto).
