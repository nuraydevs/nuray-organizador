# Resumen · Asignación de equipo y control financiero (iteración 2)

Segunda iteración sobre los módulos de Proyectos y Finanzas. Construida sobre la
arquitectura real del repo (repositorios client-side con anon key, RLS abierta
tras el AccessGate, tipos en `src/types`, opciones en `src/types/app.ts`).

## 1. Qué se ha añadido

### Asignación de tareas al equipo
- Nuevo campo `tasks.assignee` (`oliver | armando | alvaro | null`).
- Selector "Responsable" en el editor de tareas (Sin asignar / Óliver / Armando
  / Álvaro).
- Badge discreto de responsable en filas de tareas (`TaskRow`).
- Filtro por responsable en `/tasks` (Todos / Sin asignar / cada miembro).
- En el detalle de proyecto, las tareas son filtrables por responsable.
- El campo `owner` de proyecto reutiliza la misma lista de miembros.

### Finanzas más útiles (rentabilidad)
- Cada ingreso/gasto puede vincularse a proyecto y/o cliente.
- Resumen económico por **proyecto** (ingresos, gastos, neto, pendientes) en su
  detalle.
- Resumen económico por **cliente** (ingresos, gastos, neto, pendiente de cobro)
  y lista de proyectos vinculados en su detalle.
- Casos soportados: ingreso cobrado, ingreso pendiente, gasto de software
  ligado a proyecto, gasto general sin proyecto, suscripción recurrente, coste
  puntual de una entrega.

### Dashboard control-tower (`/dashboard`)
- **Alertas accionables** (solo si hay): tareas vencidas, tareas sin
  responsable, ingresos pendientes de cobro, proyectos activos sin tareas.
- **Operativa**: proyectos activos, proyectos próximos/vencidos, tareas
  pendientes, tareas vencidas, tareas sin asignar, neto del mes.
- **Carga del equipo**: pendientes y vencidas por persona (Óliver, Armando,
  Álvaro).
- **Finanzas del mes**: ingresos, gastos, neto, pendiente de cobro y de pago.
- Bloques operativos: tareas de hoy, tareas vencidas, inbox, próximos eventos,
  recordatorios y proyectos activos sin tareas. Con estados vacíos útiles.

## 2. Tablas / campos que cambian

- `tasks`: nueva columna `assignee text` con check
  (`null | oliver | armando | alvaro`) e índice `idx_tasks_assignee`. Compatible
  con datos existentes (columna nullable + `add column if not exists`).
- `projects` / `finance_transactions`: ya tenían `client_id` y `project_id`
  (iteración 1); no requieren cambios adicionales para esta iteración.

## 3. Cómo funciona la asignación de tareas

- Valores en inglés (`oliver`, `armando`, `alvaro`) con etiquetas en español
  (`TEAM_MEMBERS` y `teamMemberLabel` en `src/types/app.ts`).
- Se guarda en `tasks.assignee` vía `createTask`/`updateTask`.
- La "carga del equipo" del dashboard agrupa las tareas abiertas
  (`status !== 'done'`) por `assignee` y marca como vencidas las que tienen
  `due_date` anterior a hoy.

## 4. Cómo se calculan los resúmenes económicos

`src/lib/finance/summary.ts` → `summarize(txs)`:
- `incomeConfirmed` / `expenseConfirmed`: suma de importes con `status =
  'confirmed'` por tipo.
- `net = incomeConfirmed - expenseConfirmed`.
- `incomePending` / `expensePending`: suma de pendientes por tipo
  (= pendiente de cobro / de pago).
- `margin = net / incomeConfirmed * 100` (si hay ingresos).
- `isOverdue(tx)`: `pending` + `due_date < hoy` (estado "Vencido" derivado).

El resumen por proyecto/cliente aplica `summarize` al subconjunto de movimientos
con ese `project_id` / `client_id`.

## 5. Nuevas secciones del dashboard

Alertas, KPIs de operativa, carga del equipo, finanzas del mes, y tarjeta de
proyectos activos sin tareas (además de los bloques operativos existentes).

## 6. Migraciones a aplicar

Ejecutar `supabase/schema.sql` en el SQL editor de Supabase. Es idempotente; para
esta iteración aplica `alter table public.tasks add column if not exists
assignee ...`, su check y el índice. No borra ni altera datos existentes.

No se requieren nuevas variables de entorno.

## 7. Cómo probarlo (paso a paso)

1. Aplica `supabase/schema.sql`. Arranca con `npm run dev`.
2. **Asignación**: crea tres tareas y asígnalas a Óliver, Armando y Álvaro.
   Crea una sin asignar. Comprueba el badge de responsable en la lista.
3. **Filtro**: en `/tasks` filtra por cada responsable y por "Sin asignar".
4. **Proyecto**: abre un proyecto, crea tareas para distintos responsables y
   usa el filtro de responsable dentro del detalle.
5. **Rentabilidad**: registra un ingreso confirmado y un gasto ligados al
   proyecto; verifica ingresos/gastos/neto en su detalle.
6. **Cliente**: en el detalle del cliente comprueba el resumen económico y los
   proyectos vinculados.
7. **Dashboard**: con datos, revisa alertas, KPIs, carga del equipo y finanzas
   del mes. Sin datos, comprueba que carga con estados vacíos correctos.

## 8. Validación

- `npm run lint`: sin errores ni warnings.
- `npm run build`: compila correctamente (rutas `/finance`, `/projects/[id]`,
  `/dashboard` incluidas).

## 9. Siguientes mejoras posibles

- Vista "Equipo" dedicada con su propio detalle por persona.
- Deep-link de filtros por responsable desde el dashboard (requiere
  `useSearchParams` con Suspense).
- Reasignación rápida de responsable desde la propia fila de tarea.
