# Verify Report: Unificar Intervención y Mantenimiento en historial automático de Editar Equipo

## Desviación de diseño (importante)

Al verificar contra la base real se encontró que `StockItem` (el modelo sobre el que el diseño original apoyaba el descuento de repuestos) tiene **0 registros** — nunca se pobló con datos reales; el stock real del sistema surge de contar `Componente` por `tipoComponenteId` con `activoId = null`. Se confirmó con el usuario (pregunta explícita) y se rediseñó: un "repuesto usado" ahora consume automáticamente N componentes reales disponibles en depósito del tipo elegido, vinculándolos al equipo (mismo mecanismo que "instalar" un componente, con su `HistorialMovimientoComponente`). Ver la nota al inicio de `tasks.md` para el detalle completo.

## Verificación automatizada (backend, curl contra la base real)

Todas las pruebas se hicieron con un usuario administrador temporal (creado y borrado en la misma sesión) y, cuando mutaron datos reales, se revirtieron inmediatamente después de confirmar el resultado.

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | `tsc --noEmit` en `backend/` y `frontend/` | Limpio — solo errores preexistentes no relacionados (`figma:asset/*`, `ImportMeta.env`, `ringColor` en `HistorialComponenteModal`, `size` prop en `Stock.tsx`) |
| 2 | `GET /api/activos/:id/intervenciones`, `POST .../intervenciones`, `POST .../mantenimiento` | 404 — rutas eliminadas |
| 3 | Editar equipo real cambiando `estado` + `cambios: ["Estado: Inactivo → Activo"]` | 200, historial creado con esa línea exacta, técnico y fecha correctos. Revertido después. |
| 4 | Repuesto "RAM" x2 con `tipoComponenteId` real (175 disponibles) | 200 — stock en depósito bajó a 173, 2 componentes reales (`IMP-0287`, `IMP-0318`) quedaron vinculados al equipo, entrada de historial con el repuesto registrado. Revertido después (desvinculados, stock vuelto a 175). |
| 5 | Repuesto "Operaciones" x1 con `tipoComponenteId` real (0 disponibles) | 400 "Stock insuficiente para 'Operaciones' (disponible: 0, solicitado: 1)" — el equipo **no** se modificó (un campo `observaciones` de prueba no se guardó), no se creó historial. Transacción atómica confirmada. |
| 6 | `PUT` sin `cambios` ni `repuestos` | Historial se mantiene en 0 entradas — no se crea registro vacío |
| 7 | Sección "Repuestos Utilizados" en Crear Equipo | Confirmado por código: solo renderiza si `isEdit === true` |

## Hallazgos adicionales durante la implementación (fuera del plan original)

- `Activos.tsx` (listado de equipos) tenía su propio modal "Historial de Mantenimiento" en la grilla, separado del que ya existía en `ActivoDetalle.tsx`, y dependía de un campo que el endpoint de listado nunca incluía (`historialMantenimiento` siempre vacío ahí). Se reemplazó: el click ahora navega directo al detalle del equipo.
- No existía un modal de "Mantenimiento" separado del de "Historial" en `ActivoDetalle.tsx` como asumía el proposal — vivían en la misma pestaña. Ambos flujos (Intervención vía botón + Mantenimiento inline) quedaron unificados en la misma pestaña "Historial".

## Verificación manual del usuario (navegador)

Durante esta verificación el usuario encontró un bug real: al editar el N° de serie de una RAM ya instalada Y cargar "1 RAM" en Repuestos Utilizados en la misma edición, el sistema vinculaba una RAM de más (la editada + una consumida automáticamente del depósito). Corregido: se excluyeron del selector de "Repuestos Utilizados" los tipos que ya tienen su propia sección con N° de serie exacto (RAM, Almacenamiento, Procesador, Placa Madre, Placa de Video, Impresora), evitando el doble conteo.

- [x] Editar un equipo real desde la UI: cambiar un campo, agregar/quitar un módulo de RAM o almacenamiento, confirmar la línea correcta en "Historial"
- [x] Cargar un repuesto real desde el selector de "Repuestos Utilizados" y confirmar que descuenta stock visible en la pestaña Stock
- [x] Confirmar que el botón "Intervención" y cualquier resto de "Mantenimiento" ya no aparecen en ningún lado
- [x] Exportar PDF de un equipo con historial y de uno sin historial
- [x] Confirmar con los 3 roles que los permisos de Equipos no cambiaron

Confirmado por el usuario ("Ya probé todo, quedó bien") tras la corrección del bug de RAM duplicada. Listo para archivar.
