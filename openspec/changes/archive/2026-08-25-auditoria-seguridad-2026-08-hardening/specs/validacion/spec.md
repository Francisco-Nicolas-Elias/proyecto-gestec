# Delta for Validación

## ADDED Requirements

### Requirement: Validación Zod en el catálogo de Admin

`POST/PUT /api/admin/ubicaciones`, `POST/PUT /api/admin/tipos-componente`, `POST/PUT /api/admin/marcas`, `POST/PUT /api/admin/proveedores` y `POST/PUT /api/admin/areas` MUST validar el body contra un schema Zod antes de procesar la request.

Cualquier campo presente en el body que no esté declarado en el schema MUST ser descartado silenciosamente (sin `.passthrough()`), consistente con el resto de los endpoints mutadores del sistema.

#### Scenario: Body válido en cualquiera de los 5 recursos

- GIVEN un `administrador`
- WHEN envía los campos habituales del formulario de Admin para crear o editar uno de los 5 recursos (ej. `nombre`, y `sector`/`piso` en el caso de `ubicaciones`)
- THEN el sistema MUST aceptar y persistir, igual que hoy

#### Scenario: Body inválido en cualquiera de los 5 recursos

- GIVEN un `administrador`
- WHEN envía un body sin el campo `nombre` requerido, o con un tipo incorrecto (ej. `piso` como string no numérico en `ubicaciones`)
- THEN el sistema MUST responder 400 con mensaje descriptivo, no 500

#### Scenario: Campo no declarado es ignorado

- GIVEN un `administrador`
- WHEN envía un body que incluye un campo extra no declarado en el schema (ej. `id` o `createdAt`) junto con los campos válidos
- THEN el sistema MUST ignorar el campo extra silenciosamente y procesar el resto normalmente
