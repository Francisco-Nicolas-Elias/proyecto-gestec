# Proposal: Mobile Responsiveness

## Intent

Los docentes y el personal de operaciones usan la aplicación frecuentemente desde el celular. Actualmente varias páginas tienen problemas de usabilidad en pantallas < 768px: tablas demasiado anchas sin scroll, columnas que no se ocultan progresivamente, touch targets demasiado pequeños y columnas Kanban con altura fija que generan mucho scroll vertical.

> **Diagnóstico previo (2026-07-02)**: Se auditaron todas las páginas. Varios ítems ya estaban resueltos: Stock.tsx tablas con hidden classes ✅, Admin.tsx tabs con overflow-x-auto ✅, ActivoDetalle.tsx tabs con overflow-x-auto ✅, Dashboard KPIs en 2 columnas ✅. Solo quedan los ítems listados en Scope.

## Scope

### In Scope
- `Activos.tsx` — tabla principal: reducir min-w fijo y ocultar columnas progresivamente por breakpoint
- `Activos.tsx` — botones de acción: agrandar touch target de p-1.5 a p-2
- `Tareas.tsx` — columnas Kanban: reducir min-h fijo en mobile
- `TicketDetalle.tsx` — sidebar de metadatos: queda muy abajo en mobile; mover arriba del contenido principal
- `CrearReporte.tsx` — formulario: padding excesivo en mobile

### Out of Scope
- Stock.tsx, Admin.tsx, ActivoDetalle.tsx — ya tienen responsive correcto (auditado)
- Rediseño de layout o cambio de componentes (solo CSS Tailwind)
- Testing en dispositivos físicos reales

## Enfoque

Solo ajustes de Tailwind CSS: clases `hidden {breakpoint}:table-cell` en columnas de tabla, variantes `sm:` en padding/min-h, y reducción de `min-w` fijo en Activos. Sin cambios a lógica ni estructura de componentes.

## Áreas afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `frontend/src/app/pages/Activos.tsx` | Modificado | Tabla + botones de acción |
| `frontend/src/app/pages/Tareas.tsx` | Modificado | Columnas Kanban min-h |
| `frontend/src/app/pages/TicketDetalle.tsx` | Modificado | Orden de columnas en mobile |
| `frontend/src/app/pages/CrearReporte.tsx` | Modificado | Padding formulario |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Ocultar columnas que el usuario necesita en mobile | Media | Siempre visible: N° PC, Usuario, Estado, Acciones |
| Sticky columns con z-index roto al cambiar min-w | Baja | Mantener sticky left-0/right-0 y z-10 |
| Regresión en desktop | Baja | Todos los cambios usan variantes sm:/lg:, no afectan desktop |

## Rollback Plan

Todos los cambios son CSS Tailwind puro. Para revertir: `git revert` del commit o editar manualmente las clases afectadas. Sin cambios a DB, API ni lógica.

## Criterios de éxito

- [ ] En pantalla 375px: tabla equipos muestra solo N° PC, Usuario, Estado, Acciones sin scroll horizontal forzado
- [ ] En pantalla 375px: Kanban ocupa altura razonable sin scroll excesivo
- [ ] Botones de acción en tabla tienen al menos 32px de área táctil
- [ ] TicketDetalle en mobile muestra metadatos antes del historial de comentarios
- [ ] Sin regresiones en desktop (verificar en 1280px+)
