# QA checklist

Lista mínima para validar la app antes y después de un cambio.

## Acceso

- [ ] Si `NURAY_ACCESS_CODE` está vacío, el endpoint `/api/access` devuelve 500.
- [ ] Con código válido, el AccessGate concede acceso y persiste en localStorage.
- [ ] Botón **Salir** limpia el acceso y vuelve al gate.

## Tareas

- [ ] Crear tarea desde header.
- [ ] Crear tarea con input rápido.
- [ ] Editar tarea.
- [ ] Borrar tarea (pide confirmación).
- [ ] Marcar como hecha desde la lista.
- [ ] Cambiar estado, prioridad, fecha límite, cliente, proyecto.
- [ ] Añadir, marcar y borrar items del checklist.
- [ ] Filtrar por estado, prioridad, cliente.
- [ ] Buscar por texto.
- [ ] Vista kanban muestra columnas correctas.
- [ ] Refrescar la página: los datos persisten.

## Calendario

- [ ] Navegar entre meses.
- [ ] Botón "Hoy" vuelve al día actual.
- [ ] Crear evento desde "Nuevo evento".
- [ ] Crear evento desde día seleccionado.
- [ ] Editar evento.
- [ ] Borrar evento.
- [ ] Tareas con due_date aparecen en su día.
- [ ] Recordatorios aparecen en su día.

## Clientes

- [ ] Crear cliente.
- [ ] Editar cliente.
- [ ] Borrar cliente.
- [ ] Detalle muestra tareas, eventos, recordatorios asociados.
- [ ] Añadir/quitar links importantes.
- [ ] Cambiar estado comercial y estado del proyecto.
- [ ] Buscar por nombre.

## Proyectos

- [ ] Crear proyecto.
- [ ] Editar proyecto.
- [ ] Borrar proyecto.
- [ ] Tipo (agency/study/personal/internal) se guarda.
- [ ] Progreso refleja tareas hechas/total.

## Recordatorios

- [ ] Crear manual con canal app.
- [ ] Crear manual con canal telegram.
- [ ] Editar fecha y hora.
- [ ] Cancelar (status = cancelled).
- [ ] Borrar.
- [ ] Reintentar uno fallido.
- [ ] Vencidos aparecen marcados.
- [ ] `/api/reminders/send-due` con secret correcto procesa los `scheduled+telegram`.
- [ ] `/api/reminders/send-due` sin secret responde 401.

## Móvil

- [ ] Navegación inferior visible y funcional.
- [ ] Top bar muestra título de sección y botón **Añadir**.
- [ ] Quick Add crea tarea o recordatorio rápido.
- [ ] Modales no quedan tapados por el teclado.
- [ ] Tablas de clientes se ven como cards en móvil.
- [ ] Calendario es legible.
- [ ] Botón **Salir** accesible.

## Desktop

- [ ] Sidebar fija con sección activa marcada.
- [ ] Headers con título y acciones.
- [ ] Tablas legibles.
- [ ] Cards alineadas y consistentes.

## Build

- [ ] `npm run lint` sin errores.
- [ ] `npm run build` termina ok.
