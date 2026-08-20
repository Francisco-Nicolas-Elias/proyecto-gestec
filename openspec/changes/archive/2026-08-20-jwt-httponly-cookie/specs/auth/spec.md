# Auth — Especificación (delta): sesión vía cookie httpOnly

## Purpose

Define el comportamiento requerido para el transporte del JWT de sesión: se guarda y viaja en una cookie `httpOnly`, inaccesible desde JavaScript, en vez de en `localStorage` y un header manual. Cierra el vector de robo de token vía XSS documentado en una auditoría anterior.

---

## Requirements

### Requirement: JWT transportado en cookie httpOnly

El sistema MUST setear el JWT de sesión en una cookie `httpOnly` al loguearse exitosamente, en vez de incluirlo en el cuerpo de la respuesta.

La cookie MUST tener `httpOnly: true` siempre, `secure: true` únicamente cuando `NODE_ENV === 'production'`, y `sameSite: 'lax'`.

El sistema MUST NOT exponer el token JWT en ningún lugar accesible desde JavaScript del lado del cliente (ni `localStorage`, ni `sessionStorage`, ni el cuerpo de la respuesta de login).

#### Scenario: Login exitoso setea la cookie

- GIVEN credenciales válidas
- WHEN se envía `POST /api/auth/login`
- THEN la respuesta MUST incluir un header `Set-Cookie` con el JWT, `httpOnly`
- AND el cuerpo de la respuesta MUST NOT incluir el token

#### Scenario: Requests autenticadas sin header manual

- GIVEN una sesión iniciada (cookie presente)
- WHEN el frontend hace una request a un endpoint protegido sin enviar ningún header `Authorization`
- THEN el sistema MUST autenticar correctamente al usuario usando el token de la cookie

---

### Requirement: Logout limpia la cookie del lado del servidor

El sistema MUST exponer `POST /api/auth/logout`, que limpia la cookie de sesión.

#### Scenario: Logout exitoso

- GIVEN una sesión iniciada
- WHEN se envía `POST /api/auth/logout`
- THEN la respuesta MUST incluir un `Set-Cookie` que invalida/expira la cookie de sesión
- AND una request posterior a un endpoint protegido MUST responder 401

---

### Requirement: Bootstrap de sesión al cargar la aplicación

El frontend MUST verificar la sesión llamando a `GET /api/auth/me` al montar la aplicación, confiando en que el navegador adjunta la cookie automáticamente, sin depender de ningún valor cacheado en `localStorage` para decidir si el usuario está autenticado.

#### Scenario: Sesión válida al refrescar la página

- GIVEN una cookie de sesión válida
- WHEN el usuario refresca la página
- THEN la aplicación MUST restaurar la sesión sin pedir login de nuevo

#### Scenario: Sin sesión o cookie expirada

- GIVEN no hay cookie de sesión válida
- WHEN la aplicación llama a `GET /api/auth/me` al montar
- THEN el sistema MUST responder 401
- AND el frontend MUST mostrar la pantalla de login sin ningún error visible al usuario

---

### Requirement: Manejo de 401 diferenciado por endpoint

El frontend MUST tratar como error normal (sin redirigir ni recargar la página) el 401 de `POST /auth/login` (credenciales incorrectas) y el 401 de `GET /auth/me` (chequeo de sesión al montar la app, sin cookie válida — resultado esperado si todavía no se inició sesión). Cualquier otro endpoint que responda 401 MUST disparar el redirect a `/login`.

#### Scenario: 401 en login no redirige

- GIVEN credenciales incorrectas
- WHEN se envía `POST /api/auth/login`
- THEN el sistema MUST mostrar el mensaje de error en el formulario
- AND MUST NOT redirigir ni recargar la página

#### Scenario: 401 en `/auth/me` al montar la app no redirige ni recarga

- GIVEN no hay cookie de sesión válida (usuario nunca logueado, o cookie expirada)
- WHEN la aplicación llama a `GET /auth/me` al montar
- THEN el sistema MUST NOT redirigir ni recargar la página
- AND MUST simplemente mostrar la pantalla de login (`AuthContext` maneja el estado `usuario: null`)

#### Scenario: 401 en cualquier otro endpoint redirige

- GIVEN una cookie de sesión inválida o expirada, y una sesión ya en curso (la app ya montó y mostró contenido protegido)
- WHEN el frontend hace una request a cualquier endpoint protegido que no sea `/auth/login` ni `/auth/me`
- THEN el sistema MUST redirigir a `/login`
