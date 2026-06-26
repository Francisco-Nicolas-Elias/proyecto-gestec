# Proposal: Corrección de Auditoría de Seguridad y Calidad

## Intent

Corregir los 22 issues identificados en la auditoría de seguridad y calidad del sistema GESTEC, organizados por severidad. Los issues críticos exponen agujeros de seguridad explotables hoy mismo (IDOR, falta de validación). Los issues altos afectan integridad de datos y trazabilidad. Los medios y bajos son deuda técnica que puede derivar en bugs en producción.

## Scope

### In Scope

**🔴 Críticos**
- [#1] IDOR en comentarios de tickets — cualquier docente_empleado puede comentar en tickets ajenos y leer comentarios internos
- [#2] IDOR en adjuntos — cualquier usuario autenticado puede borrar adjuntos de recursos ajenos
- [#3] Falta de validación Zod en backend — tickets, tareas, activos, componentes, stock y admin reciben body crudo a Prisma
- [#4] Módulo "Roles" en Admin.tsx es 100% simulado — no persiste nada y confunde al operador
- [#5] Fuga de micrófono en MultimediaUpload.tsx

**🟠 Altos**
- [#6] updateTicketService sin whitelist de campos — operaciones puede modificar creadorId, nro, fechaCreacion
- [#7] Logs de auditoría con rol hardcodeado incorrecto — distorsiona trazabilidad real
- [#8] Bug "permisos antes de authLoading" replicado en Activos.tsx, ActivoDetalle.tsx, Tickets.tsx, TicketDetalle.tsx
- [#9] RegistrarIntervencion.tsx descuenta stock en loop secuencial sin transacción
- [#10] Catches vacíos en ActivoForm.tsx — errores de sincronización de componentes silenciosos
- [#11] http.ts no maneja errores de red (fetch que falla por conexión)

**🟡 Medios**
- [#12] addLogService() faltante en updateMarcaService y updateProveedorService
- [#13] stock.service.ts lanza Error genérico en vez de AppError en createStockMovimientoService
- [#14] Bug: movimientos de stock tipo "ajuste" no aplican delta — la cantidad del StockItem nunca cambia
- [#15] Botón "Limpiar Todo" de logs sin try/catch
- [#16] Rutas de creación de tarea/componente sin chequeo de permiso en frontend
- [#17] Doble fetch innecesario en TicketDetalle.tsx

**⚪ Bajos**
- [#18] Import implícito de crypto en auth.service.ts
- [#19] CORS sin fallback seguro si FRONTEND_URL no está seteada en producción
- [#20] JWT y usuario en localStorage sin cifrar
- [#21] Debounce de búsqueda sin cleanup en al menos un componente
- [#22] normalize() no maneja tildes de forma consistente en algún filtro

### Out of Scope
- Refactors estructurales no relacionados a los issues
- Nuevas funcionalidades
- Migración de sistema de autenticación (JWT → otro mecanismo)
- Tests automatizados (no hay test runner configurado)

## Approach

Corrección iterativa por severidad: primero los críticos de seguridad (IDOR + Zod), luego los altos de integridad de datos, finalmente medios y bajos. Cada issue se trabaja aislado para facilitar el rollback individual. No requiere migración de DB.

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `backend/src/services/tickets.service.ts` | Modificado | Ownership check comentarios + whitelist updateTicket + rol correcto en logs |
| `backend/src/routes/adjuntos.routes.ts` | Modificado | Ownership check antes de DELETE |
| `backend/src/services/adjuntos.service.ts` | Modificado | Verificar propiedad del recurso antes de borrar |
| `backend/src/routes/*.routes.ts` (múltiples) | Modificado | Agregar middleware validate(schema) con Zod |
| `backend/src/services/stock.service.ts` | Modificado | AppError en vez de Error, fix delta de ajuste |
| `backend/src/services/admin.service.ts` | Modificado | addLogService en updateMarca/updateProveedor |
| `backend/src/middlewares/cors.middleware.ts` | Modificado | Fallback seguro si FRONTEND_URL no seteada |
| `backend/src/services/auth.service.ts` | Modificado | Import explícito de crypto |
| `frontend/src/app/pages/Admin.tsx` | Modificado | Eliminar módulo Roles simulado o dejarlo como readonly |
| `frontend/src/app/pages/Activos.tsx` | Modificado | Fix bug authLoading |
| `frontend/src/app/pages/ActivoDetalle.tsx` | Modificado | Fix bug authLoading |
| `frontend/src/app/pages/Tickets.tsx` | Modificado | Fix bug authLoading |
| `frontend/src/app/pages/TicketDetalle.tsx` | Modificado | Fix bug authLoading + doble fetch |
| `frontend/src/app/pages/ActivoForm.tsx` | Modificado | Catches vacíos → manejo real de errores |
| `frontend/src/app/components/MultimediaUpload.tsx` | Modificado | Fix fuga de micrófono |
| `frontend/src/app/services/http.ts` | Modificado | Manejo de errores de red |
| `frontend/src/app/pages/RegistrarIntervencion.tsx` | Modificado | Mover descuento de stock al backend en transacción |

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Agregar Zod rompe endpoints que reciben campos extra | Media | Usar `.passthrough()` o schemas permisivos inicialmente |
| Fix whitelist en updateTicket rompe integraciones existentes | Baja | Auditar qué campos se usan realmente antes de restringir |
| Fix IDOR adjuntos rompe flujo de borrado legítimo | Baja | Testear con los 3 roles antes de mergear |
| Fix delta de ajuste de stock altera datos históricos | Baja | Solo afecta movimientos futuros, no retroactivo |

## Rollback Plan

Cada issue es un commit atómico. Si algo rompe en producción, `git revert <commit>` revierte solo ese fix sin afectar los demás. No hay migraciones de DB en este change.

## Dependencies

- Ninguna externa. Todo es código aplicación existente.

## Success Criteria

- [ ] Ningún usuario docente_empleado puede ver/crear comentarios en tickets ajenos
- [ ] Ningún usuario puede borrar adjuntos de recursos que no le pertenecen
- [ ] Todo endpoint del backend valida el body con Zod antes de llegar a Prisma
- [ ] Los logs de auditoría reflejan el rol real del usuario que ejecutó la acción
- [ ] El stock tipo "ajuste" actualiza correctamente la cantidad del StockItem
- [ ] Los 4 pages con bug authLoading no redirigen antes de que auth esté listo
- [ ] MultimediaUpload no deja el micrófono abierto al desmontar el componente
- [ ] http.ts muestra error legible cuando hay fallo de red (sin internet)
