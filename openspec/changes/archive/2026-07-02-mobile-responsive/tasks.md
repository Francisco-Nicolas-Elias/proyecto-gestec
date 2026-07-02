# Tasks: Mobile Responsiveness

Estado general: 0/9 tareas completadas

---

## Fase 1 — Crítico: Tabla de Equipos (Activos.tsx)

### 1.1 Reducir min-w de la tabla y ajustar thead
- [x] **1.1** Cambiar `<table className="w-full min-w-[1900px]">` a `min-w-[400px]`
- [x] **1.2** Agregar hidden classes al `<thead>` según breakpoint:
  - Siempre visible: N° PC (sticky left), Usuario, Estado, Acciones (sticky right)
  - `hidden sm:table-cell` (≥640px): Sector
  - `hidden md:table-cell` (≥768px): CPU Marca, RAM Total
  - `hidden lg:table-cell` (≥1024px): CPU Modelo, Alm. Total, IP, S.O., Últ. Mant.
  - `hidden xl:table-cell` (≥1280px): Piso, Oficina, Placa Madre, Alm. Marca, Alm. Modelo, GPU, MAC, ID AD, P AD, Cambio PC
- [x] **1.3** Aplicar las mismas hidden classes a cada `<td>` correspondiente en el tbody
- [x] **1.4** Verificar que sticky left (N° PC) y sticky right (Acciones) siguen funcionando en mobile

### 1.5 Touch targets botones de acción
- [x] **1.5** Cambiar `p-1.5` a `p-2` en los botones Ver / Editar / Eliminar de cada fila
  - Archivo: líneas ~736, 745, 752

---

## Fase 2 — Medio: Kanban (Tareas.tsx)

- [x] **2.1** Cambiar `min-h-[500px]` a `min-h-[200px] lg:min-h-[500px]` en las 3 columnas del Kanban
  - Pendientes: línea ~126
  - En Curso: línea ~143
  - Finalizadas: línea ~160

---

## Fase 3 — Medio: Detalle de Ticket (TicketDetalle.tsx)

- [x] **3.1** Reordenar columnas en mobile: el sidebar de metadatos (Estado, Prioridad, Asignado) debe quedar **arriba** del contenido principal en pantallas < lg
  - Actualmente: `grid grid-cols-1 lg:grid-cols-3` donde col-1 (izq) es descripción y col-2 (der) es sidebar
  - Fix: en mobile añadir `order-first` al div del sidebar y `order-last` al div principal, revertir en lg

---

## Fase 4 — Bajo: Formulario Crear Reporte (CrearReporte.tsx)

- [x] **4.1** Cambiar padding del formulario interno de `p-6` a `p-4 sm:p-6`
  - Archivo: línea ~149 (`<form ... className="... p-6 space-y-6">`)

---

## Notas de verificación

Después de implementar cada fase, verificar visualmente en:
- Chrome DevTools → 375px (iPhone SE) — el caso crítico
- Chrome DevTools → 768px (tablet) — no debe romperse
- Chrome DevTools → 1280px (desktop) — sin regresiones

Items ya resueltos (no tocar):
- ✅ Stock.tsx columnas componentes — ya tiene hidden classes
- ✅ Admin.tsx tabs — ya tiene overflow-x-auto
- ✅ ActivoDetalle.tsx tabs — ya tiene overflow-x-auto
- ✅ Dashboard KPIs — ya en 2 columnas desde sesión anterior
