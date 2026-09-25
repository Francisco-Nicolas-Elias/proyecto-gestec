# Checklist de Revisión Manual — GESTEC

Registro de la revisión manual del sistema, pestaña por pestaña. El usuario prueba en la app real y avisa; Claude marca `[x]` acá a medida que se confirma. No pasar a la Fase 2 (Mobile) hasta cerrar toda la Fase 1 (Desktop).

---

## Fase 1: Desktop

### 0. Autenticación
- [ ] Login con credenciales correctas
- [ ] Login con credenciales incorrectas (mensaje de error, bloqueo tras intentos fallidos)
- [ ] Recuperar contraseña (envío de mail)
- [ ] Reset de contraseña desde el link del mail
- [ ] Registro de usuario nuevo (si está habilitado para probar)
- [ ] Verificar email
- [ ] Logout
- [ ] Sesión persiste al refrescar la página
- [ ] Redirección a `/login` si no hay sesión activa

### 1. Dashboard
- [x] Cards de KPI (Tickets nuevos, en progreso, Tareas pendientes, Stock bajo/crítico) — navegación al hacer clic *(sesión 2026-09-01/02)*
- [x] Card "Estado de tickets" — tamaño, layout, botón "Ver todos" *(sesión 2026-09-01)*
- [x] Card "Stock crítico/bajo" — enlace a la grilla correcta de Stock *(sesión 2026-09-02)*
- [ ] Gráfico "Tickets por mes"
- [ ] Card "Estado de equipos"
- [ ] Comportamiento con 0 datos (institución/cuenta nueva sin carga)
- [ ] Qué ve cada rol (administrador / operaciones / docente_empleado)

### 2. Equipos (`/activos`)
- [x] Listado — filtros, orden, columnas (incluye columna Fuente) *(sesión 2026-09-01)*
- [x] Crear equipo — todos los campos, incluida Fuente de alimentación *(sesión 2026-09-01)*
- [x] Editar equipo — sincronización de RAM, Almacenamiento, Procesador, Placa de Video, Placa Madre, Fuente, Impresora *(sesión 2026-09-01)*
- [x] Historial automático (diff de cambios) al editar *(sesión 2026-09-01)*
- [x] Detalle de equipo — Hardware, Otros Periféricos, Fuente *(sesión 2026-09-01)*
- [x] Tab "Historial Componentes" (movimientos del equipo) *(sesión 2026-09-01)*
- [x] Tab "Tickets" del equipo *(sesión 2026-09-24 — se corrigió que mostraba el ID interno en vez del N° de ticket)*
- [x] Eliminar equipo *(sesión 2026-09-24)*
- [x] Exportar Excel/PDF del listado de equipos *(sesión 2026-09-24)*
- [x] Permisos por rol (quién puede crear/editar/eliminar) *(sesión 2026-09-24)*

### 3. Tickets (`/tickets`)
- [x] Listado — filtros (estado, prioridad, tipo), búsqueda, orden *(sesión 2026-09-24)*
- [x] Crear ticket (CrearReporte) — todos los campos, adjuntos *(sesión 2026-09-24)*
- [x] Detalle de ticket — cambiar estado, prioridad, asignar responsable *(sesión 2026-09-24 — se corrigió demora al asignar responsable: el email bloqueaba la respuesta)*
- [x] Comentarios — agregar, editar, eliminar, marcar interno/público *(sesión 2026-09-24)*
- [x] Adjuntos — subir imagen/video/audio y grabar audio con micrófono, eliminar *(sesión 2026-09-24)*
- [x] Reproductor de video en adjuntos (ya se arregló un bug antes — reverificar) *(sesión 2026-09-24)*
- [x] Eliminar ticket *(sesión 2026-09-24)*
- [x] Permisos: `docente_empleado` solo ve/crea los propios; operaciones/admin ven todos *(sesión 2026-09-24 — se ocultó prioridad y el filtro de estado reemplazó al de prioridad para docentes; se ocultó el banner de "reabrir ticket resuelto")*
- [x] ~~Exportar Excel/PDF del listado de tickets~~ — no existe; el usuario decidió que no hace falta implementarlo *(decisión 2026-09-24)*

### 4. Stock (`/stock`)
- [x] Grilla "Componentes Registrados" — filtros, búsqueda, orden, filtro de ubicación *(sesión 2026-09-01/02)*
- [x] Grilla "Control de Stock" — navegación desde las cards del Dashboard y de Stock *(sesión 2026-09-02)*
- [x] Cards KPI (Stock OK, Bajo/Crítico, Instalados en Equipos) — navegación y filtros *(sesión 2026-09-02)*
- [x] Nuevo componente — persistencia de formulario, carga con QR de N° de serie *(sesión 2026-09-01)*
- [x] Editar componente — ubicación editable para tipos sin sección propia (teclado, mouse, etc.) *(sesión 2026-09-01)*
- [x] Historial de un componente (modal, colores del timeline) *(sesión 2026-09-01)*
- [ ] Eliminar componente
- [ ] Exportar Excel/PDF de componentes
- [ ] Permisos por rol

### 5. Tareas (`/tareas`)
- [ ] Kanban — 3 columnas (Pendientes / En Curso / Finalizadas), drag & drop entre columnas
- [ ] Crear tarea nueva — todos los campos, asignación a varias personas
- [ ] Detalle de tarea (modal) — editar, cambiar prioridad, asignados
- [ ] Comentarios de tarea — agregar, editar, eliminar, adjuntos
- [ ] Eliminar tarea
- [ ] Permisos por rol

### 6. Administración (`/admin`)
- [ ] Usuarios — crear, editar, bloquear/desbloquear, eliminar, asignar rol y área
- [x] Ubicaciones — crear, editar, eliminar (bloquea si tiene equipos asociados) *(sesión 2026-09-02 — se limpiaron 9 ubicaciones de seed sin uso)*
- [x] Áreas — crear, editar, eliminar (bloquea si tiene usuarios asociados) *(sesión 2026-09-02)*
- [ ] Roles — confirmar que la vista de solo lectura refleja los permisos reales de cada rol
- [x] Componentes (catálogo de tipos) — crear, editar, eliminar (bloquea si tiene componentes/stock asociados) *(sesión 2026-09-02)*
- [x] Marcas — crear, editar, eliminar (bloquea si tiene componentes asociados) *(sesión 2026-09-02)*
- [x] Proveedores — crear, editar, eliminar (bloquea si tiene componentes/stock asociados) *(sesión 2026-09-02 — se limpiaron 4 proveedores de seed sin uso)*
- [ ] Logs — listado, filtros, exportar, botón "Limpiar todo"
- [ ] Confirmar que solo `administrador` puede acceder a `/admin`

### 7. Información institucional (`/informacion`)
- [ ] Ver datos de contacto (teléfono, teléfono interno, horarios, correos)
- [ ] Editar información de contacto
- [ ] Permisos por rol (quién puede editar)

### 8. Transversales
- [ ] Modo oscuro en todas las pantallas
- [ ] Notificaciones (campana) — se marcan como leídas, el clic redirige bien
- [ ] Achicar la ventana de escritorio (responsive en distintos anchos)
- [ ] Sesión expirada — redirección a login
- [ ] Exportaciones Excel/PDF restantes en las grillas que falten

---

## Fase 2: Mobile
*(no arrancar hasta cerrar toda la Fase 1)*
- [ ] Repetir el checklist completo probando desde el celular / vista mobile
