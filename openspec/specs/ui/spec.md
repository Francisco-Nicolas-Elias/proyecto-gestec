# UI — Especificación: Registro con verificación de email

## Purpose

Define el comportamiento de las nuevas páginas de registro y verificación de email, y la modificación del Login para incluir el acceso al flujo de registro.

---

## Requirements

### Requirement: Acceso al registro desde Login

La página de Login MUST mostrar un botón o enlace "Crear usuario" junto al enlace existente de "¿Olvidaste tu contraseña?".

#### Scenario: Navegación al registro

- GIVEN que el usuario está en `/login`
- WHEN hace clic en "Crear usuario"
- THEN es redirigido a `/registro`

---

### Requirement: Formulario de registro

La página `/registro` MUST presentar un formulario con los campos: nombre completo, email y contraseña.

- El campo email MUST validar el dominio `@ies21.edu.ar` en el frontend antes de enviar
- La contraseña MUST tener mínimo 8 caracteres, al menos 1 mayúscula y al menos 1 carácter especial
- El formulario MUST mostrar el estado de carga mientras espera respuesta del backend
- El formulario SHOULD mostrar un botón para volver al login

#### Scenario: Registro exitoso

- GIVEN que el usuario completa nombre, email `@ies21.edu.ar` y contraseña válida
- WHEN envía el formulario
- THEN el formulario MUST desaparecer y mostrar un mensaje de éxito indicando que revise su email
- AND MUST mostrar el email al que se envió la confirmación

#### Scenario: Email con dominio incorrecto (validación frontend)

- GIVEN que el usuario ingresa `alguien@gmail.com` en el campo email
- WHEN intenta enviar el formulario
- THEN el sistema MUST mostrar un error inline bajo el campo indicando que solo se aceptan emails `@ies21.edu.ar`
- AND MUST NO enviar la request al backend

#### Scenario: Email ya registrado (error del backend)

- GIVEN que el backend retorna 409
- WHEN el formulario recibe el error
- THEN MUST mostrar el mensaje de error del backend de forma visible

#### Scenario: Campos incompletos

- GIVEN que el usuario no completa uno o más campos obligatorios
- WHEN intenta enviar el formulario
- THEN el navegador o la validación frontend MUST impedir el envío

---

### Requirement: Página de verificación de email

La página `/verificar-email` MUST leer el parámetro `token` de la URL y llamar automáticamente al endpoint de verificación al montar.

- La página MUST mostrar un estado de carga mientras espera la respuesta
- Si la verificación es exitosa, MUST mostrar mensaje de éxito y un botón para ir al login
- Si el token es inválido o expirado, MUST mostrar un mensaje de error claro

#### Scenario: Verificación exitosa

- GIVEN que el usuario hace clic en el enlace del email con un token válido
- WHEN la página `/verificar-email?token=xxx` carga
- THEN MUST mostrar indicador de carga brevemente
- AND luego MUST mostrar mensaje: cuenta verificada, puede iniciar sesión
- AND MUST mostrar botón que lleva a `/login`

#### Scenario: Token inválido o expirado

- GIVEN que el usuario accede a `/verificar-email?token=invalido`
- WHEN la página carga y el backend retorna error
- THEN MUST mostrar mensaje de error claro (enlace inválido o expirado)
- AND SHOULD mostrar botón para volver a registrarse

#### Scenario: Acceso sin token en la URL

- GIVEN que el usuario navega a `/verificar-email` sin parámetro `token`
- WHEN la página carga
- THEN MUST mostrar mensaje de error indicando que el enlace es incompleto
