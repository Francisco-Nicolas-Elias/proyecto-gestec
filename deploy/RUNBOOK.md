# Runbook de deploy — GESTEC en servidor IES21

Guía paso a paso para instalar GESTEC en el servidor Ubuntu + Apache de la institución, y para mantenerlo funcionando después. Dominio: `gestec.ies21.edu.ar`. Ruta del código en el servidor: `/var/www/gestec` (si es otra, reemplazarla en **todos** los bloques, en `deploy/apache-gestec.conf.template` y en `deploy/backup-db.sh`).

Este runbook se ejecuta **después** de terminar la revisión manual (desktop y mobile) del sistema.

**Cómo usarlo:** seguir las secciones en orden. Cada sección tiene el objetivo, los comandos, **qué tiene que pasar** si salió bien, y **qué hacer si falla**. No pasar a la sección siguiente si la anterior no dio el resultado esperado.

Índice:
0. Antes de empezar (checklist previo)
1. Verificar dependencias del servidor
2. Copiar el código y crear los `.env`
3. Instalar y buildear
4. Habilitar módulos de Apache
5. Configurar el VirtualHost (primera fase, solo HTTP)
6. Certificado SSL (Let's Encrypt)
7. VirtualHost definitivo (HTTPS)
8. Firewall
9. Arrancar el backend con PM2
10. Backup automático de la base de datos
11. Verificación final
12. Operación y mantenimiento (actualizar, renovar SSL, backups, qué se puede romper)
13. Solución de problemas

---

## 0. Antes de empezar (checklist previo)

Tener resuelto **antes** de entrar al servidor. Si falta algo de esto, el deploy se traba a mitad de camino.

- [ ] **Acceso SSH** al servidor con un usuario con `sudo`.
- [ ] **DNS:** el registro `gestec.ies21.edu.ar` tiene que apuntar (registro A) a la IP pública del servidor. Lo gestiona quien administra el DNS de `ies21.edu.ar`. Comprobarlo desde cualquier PC: `nslookup gestec.ies21.edu.ar` debe devolver la IP del servidor. **Sin esto Let's Encrypt (sección 6) falla.**
- [ ] **Firewall de la institución / router:** los puertos **80 y 443** del servidor tienen que estar accesibles desde internet (el sistema es de acceso público). Si el servidor está detrás de un firewall o NAT de la red de la institución, hay que pedir que abran/redirijan esos dos puertos. Esto es independiente del `ufw` del servidor (sección 8).
- [ ] **Acceso al repositorio:** el servidor tiene que poder hacer `git clone` (repo privado → usar un token de acceso personal de GitHub o una deploy key).
- [ ] **Datos para el `backend/.env`** (ver sección 2) a mano: URLs de Supabase (`DATABASE_URL` y `DIRECT_URL`) y credenciales SMTP.
- [ ] **Cuenta de Google para los backups:** `fahumada@ies21.edu.ar`. La persona que haga la sección 10 necesita poder iniciar sesión con esa cuenta en una PC (usuario, contraseña y, si tiene verificación en dos pasos, el celular con el código).
- [ ] **Una PC con navegador** (Windows está bien) para autorizar a rclone (sección 10, paso 3).

---

## 1. Verificar dependencias del servidor

```bash
node -v
apache2 -v
pnpm -v || sudo npm install -g pnpm
git --version
```

**Qué tiene que pasar:**
- `node -v` muestra **v22 o superior** (el backend exige `>=22`). Si es más viejo, hay que actualizar Node antes de seguir (no continuar con una versión menor).
- `apache2 -v` muestra la versión de Apache.
- `pnpm -v` muestra una versión (si no estaba, se instala con la parte `||`).

**Antes de tocar Apache, ver qué hay ya configurado** (si el servidor aloja otros sitios de la institución, no hay que romperlos):

```bash
sudo apache2ctl -S
```

Muestra los VirtualHosts existentes. Anotar cuáles hay. GESTEC se agrega como un sitio más; **no se borra ni se deshabilita ningún otro**.

---

## 2. Copiar el código y crear los `.env`

```bash
sudo git clone <url-del-repo> /var/www/gestec
cd /var/www/gestec
```

Si el usuario con el que entrás por SSH no es root, puede que `/var/www/gestec` quede con permisos de root. Dejar la carpeta a nombre del usuario que va a hacer el build y correr PM2:

```bash
sudo chown -R $USER:$USER /var/www/gestec
```

### 2.1. `backend/.env` (no se versiona, hay que crearlo a mano)

```bash
cd /var/www/gestec/backend
cp .env.example .env
nano .env
```

Completar **todos** estos valores:

| Variable | Valor en producción |
|----------|---------------------|
| `DATABASE_URL` | La de Supabase en modo *Transaction* (puerto 6543), con `?pgbouncer=true&connection_limit=10`. Se copia de Supabase → Project Settings → Database → Connection string. |
| `DIRECT_URL` | La de Supabase directa (puerto 5432, sin pgbouncer). La usan las migraciones **y el backup**. |
| `JWT_SECRET` | Un secreto largo y aleatorio. Generarlo con: `openssl rand -base64 48` y pegar el resultado. **Distinto al de desarrollo.** |
| `JWT_EXPIRES_IN` | `"8h"` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` (importante: activa las cookies seguras y el `trust proxy` del rate limiting) |
| `FRONTEND_URL` | `"https://gestec.ies21.edu.ar"` (sin barra final). Se usa para CORS y para los links de los mails. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Credenciales reales del correo institucional que va a mandar los mails de verificación/recuperación. |

Si la contraseña de la base tiene caracteres especiales (`@`, `#`, `/`, `:`, `%`), en la URL tienen que ir codificados (por ejemplo `@` → `%40`). Si no, la conexión falla con un error de formato de URL.

Proteger el archivo (tiene contraseñas):

```bash
chmod 600 /var/www/gestec/backend/.env
```

### 2.2. `frontend/.env` (necesario para el build — **no omitir**)

El frontend "fija" la dirección de la API en el momento del build. Si no se crea este archivo, el sistema buildeado intenta hablar con `http://localhost:3000/api` (la PC de cada usuario) y **no funciona**.

```bash
cd /var/www/gestec/frontend
cat > .env <<'EOF'
VITE_API_URL=https://gestec.ies21.edu.ar/api
VITE_USE_MOCK=false
EOF
```

Si más adelante se cambia el dominio o este archivo, hay que **volver a buildear el frontend** (sección 3) para que tome efecto.

> **Atención:** el `.env` de producción apunta a la misma base de Supabase que usás en desarrollo (hay un solo proyecto). Desde el momento del deploy, lo que hagas en tu PC en modo desarrollo toca datos reales. Evitar probar cosas destructivas en desarrollo, o crear una base separada para desarrollo.

---

## 3. Instalar y buildear

```bash
cd /var/www/gestec/backend
pnpm install
pnpm db:generate
pnpm build
pnpm db:deploy

cd /var/www/gestec/frontend
pnpm install
pnpm build
```

**Qué tiene que pasar:**
- `pnpm build` del backend termina sin errores y crea `backend/dist/server.js`.
- `pnpm db:deploy` (aplica migraciones pendientes) dice algo como `No pending migrations to apply` o aplica las que falten. Como la base ya existe y tiene datos, lo normal es que no haya nada pendiente.
- `pnpm build` del frontend termina sin errores y crea `frontend/dist/index.html`.

**Verificar:**

```bash
ls /var/www/gestec/backend/dist/server.js /var/www/gestec/frontend/dist/index.html
```

**Si falla:**
- `pnpm db:deploy` da error de *drift* o de migraciones: **parar y no seguir**. La base tiene columnas agregadas con `db push` fuera del historial de migraciones. **Nunca correr** `db:reset`, `db:seed` ni `db:push --force-reset` contra producción: borran o pisan datos reales. Consultar antes de hacer nada.
- Error de `tsc` en el build: anotar el mensaje completo y consultar. No editar archivos a mano en el servidor.

---

## 4. Habilitar módulos de Apache

```bash
sudo a2enmod proxy proxy_http rewrite ssl
sudo apache2ctl configtest
```

**Qué tiene que pasar:** `configtest` responde `Syntax OK`. (Puede aparecer una advertencia de `ServerName`; no es un problema.)

No hace falta reiniciar todavía.

---

## 5. Configurar el VirtualHost (primera fase, solo HTTP)

**Por qué en dos fases:** la plantilla definitiva (`apache-gestec.conf.template`) ya pide los archivos del certificado SSL. Esos archivos todavía no existen (los crea Let's Encrypt en la sección 6). Si se activa la plantilla completa ahora, Apache **no arranca/recarga** por no encontrar el certificado. Por eso primero se activa un VirtualHost mínimo en el puerto 80, se saca el certificado y recién después se activa el definitivo.

```bash
sudo tee /etc/apache2/sites-available/gestec.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    ServerName gestec.ies21.edu.ar
    DocumentRoot /var/www/gestec/frontend/dist
</VirtualHost>
EOF

sudo a2ensite gestec
sudo apache2ctl configtest
sudo systemctl reload apache2
```

**Qué tiene que pasar:** `Syntax OK` y el reload sin errores. Desde cualquier PC, `http://gestec.ies21.edu.ar` debería responder (aunque todavía sin HTTPS y sin API).

**Si falla:** ver la sección 13 ("Apache no recarga").

---

## 6. Certificado SSL (Let's Encrypt)

Requiere que el DNS (sección 0) ya apunte al servidor y que el puerto 80 sea accesible desde internet.

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot certonly --apache -d gestec.ies21.edu.ar --deploy-hook "systemctl reload apache2"
```

- Si pregunta por un mail, poner uno institucional que alguien lea (avisa si el certificado está por vencer y no se renovó).
- Aceptar los términos de servicio.

**Qué tiene que pasar:** termina con `Successfully received certificate` y muestra las rutas `/etc/letsencrypt/live/gestec.ies21.edu.ar/fullchain.pem` y `privkey.pem`. Verificar:

```bash
sudo ls /etc/letsencrypt/live/gestec.ies21.edu.ar/
sudo certbot renew --dry-run
```

El `--dry-run` tiene que terminar con `Congratulations, all simulated renewals succeeded`. Eso confirma que la **renovación automática** va a funcionar (los certificados duran 90 días y se renuevan solos con un timer del sistema; el `--deploy-hook` recarga Apache después de cada renovación).

**Si falla:** "Challenge failed" / "Timeout during connect" → casi siempre es DNS mal apuntado o puerto 80 cerrado en el firewall de la institución (sección 0). Corregirlo y reintentar. Let's Encrypt limita los intentos fallidos (5 por hora); no insistir en bucle.

---

## 7. VirtualHost definitivo (HTTPS)

Ahora sí se reemplaza el VirtualHost mínimo por la plantilla completa (redirección a HTTPS + sitio HTTPS + proxy a la API):

```bash
sudo cp /var/www/gestec/deploy/apache-gestec.conf.template /etc/apache2/sites-available/gestec.conf
sudo nano /etc/apache2/sites-available/gestec.conf   # solo si la ruta del código NO es /var/www/gestec
sudo apache2ctl configtest
sudo systemctl reload apache2
```

En el archivo, si la ruta del código es distinta de `/var/www/gestec`, cambiarla en `DocumentRoot` y en `<Directory ...>`. El dominio ya está bien.

**Qué tiene que pasar:** `Syntax OK`, reload sin errores. Abrir `https://gestec.ies21.edu.ar` en el navegador: tiene que cargar la pantalla de login con candado (sin advertencia). `http://gestec.ies21.edu.ar` tiene que redirigir solo a `https://`.

La API todavía no responde (el backend no está corriendo, se arranca en la sección 9): por ahora el login va a dar error de conexión. Es normal.

---

## 8. Firewall

**Cuidado: habilitar `ufw` sin permitir SSH antes te deja afuera del servidor** (se corta tu conexión y no podés volver a entrar). Por eso el orden es importante:

```bash
sudo ufw allow OpenSSH      # o: sudo ufw allow 22/tcp  (si SSH usa otro puerto, usar ese)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

**Qué tiene que pasar:** `ufw status` muestra `Status: active` y permitidos **solo** SSH, 80 y 443.

Confirmar que el puerto 3000 (backend) y el de Postgres **no** aparecen como expuestos hacia afuera: el backend solo debe ser alcanzable desde el propio servidor (Apache le hace el proxy). Prueba rápida, desde una PC **fuera** del servidor: `http://IP-DEL-SERVIDOR:3000` no debe responder.

> Si el servidor ya tenía `ufw` activo con otras reglas (por otros sitios), solo **agregar** las reglas que falten; no ejecutar `ufw reset`.

---

## 9. Arrancar el backend con PM2

```bash
sudo npm install -g pm2
cd /var/www/gestec
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

`pm2 startup` **imprime un comando que empieza con `sudo env PATH=...`**: hay que **copiarlo y ejecutarlo tal cual**. Sin ese paso, si el servidor se reinicia, el backend no vuelve a arrancar solo. Después de ejecutarlo, correr de nuevo `pm2 save`.

> Importante: correr `pm2 start` **parado en `/var/www/gestec`** (la raíz del repo), porque `ecosystem.config.js` usa rutas relativas (`./backend`).

**Qué tiene que pasar:**

```bash
pm2 status
pm2 logs gestec-backend --lines 30
curl -s http://localhost:3000/health
```

- `pm2 status` muestra `gestec-backend` en `online`.
- Los logs muestran `Conectado a PostgreSQL` y `Servidor corriendo en http://localhost:3000`.
- `curl http://localhost:3000/health` responde con un JSON de estado (no un error de conexión).

**Si falla:**
- `errored` o reinicios constantes → ver `pm2 logs gestec-backend --err --lines 50`. Causas típicas: falta `dist/server.js` (no se hizo el build), `.env` mal completado, o Supabase pausado (ver sección 13).

---

## 10. Backup automático de la base de datos

El plan gratuito de Supabase **no incluye backups automáticos**. Este paso arma uno casero: un dump diario (`pg_dump`) que se guarda en el servidor y se sube a Google Drive, con 7 días de retención en ambos destinos.

> **Regla de oro de esta sección:** todo se hace con el **mismo usuario**, y ese usuario es **root** (`sudo`). La configuración de rclone se guarda en la carpeta personal del usuario que corre `rclone config`; el cron tiene que correr con ese mismo usuario, o el backup no encuentra la configuración. Además el script escribe en `/var/log` y `/var/backups`, que requieren root. Por eso todos los comandos de rclone, la prueba del script y el crontab llevan `sudo`.

### Paso 1 — Instalar las herramientas

```bash
sudo apt install postgresql-client
curl https://rclone.org/install.sh | sudo bash
pg_dump --version
rclone version
```

Chequeo de versión: `pg_dump` **no puede ser más viejo** que el Postgres de Supabase. Ver la versión de Postgres de Supabase (Dashboard → Project Settings → Infrastructure) y comparar. Si `pg_dump` es menor, el backup falla con `server version mismatch`; en ese caso instalar un cliente más nuevo desde el repositorio oficial de PostgreSQL (PGDG) antes de seguir.

### Paso 2 — Preparar carpetas y el script

```bash
sudo mkdir -p /var/backups/gestec
chmod +x /var/www/gestec/deploy/backup-db.sh
```

Revisar las primeras líneas de `/var/www/gestec/deploy/backup-db.sh`. Si la ruta del código no es `/var/www/gestec`, ajustar `ENV_FILE`. `RCLONE_REMOTE` debe quedar `gdrive:gestec-backup-ies` (así se llamará el remote en el paso 3).

### Paso 3 — Conectar rclone con Google Drive (la cuenta `fahumada@ies21.edu.ar`)

El servidor no tiene navegador, así que la autorización se hace en **otra PC** y se pega un código en el servidor. Se necesitan las dos cosas abiertas a la vez: la terminal del servidor y una PC con navegador.

**3.a — En la PC con navegador (Windows):** descargar rclone desde https://rclone.org/downloads/ (ZIP de Windows, se descomprime en una carpeta, no se instala). Abrir PowerShell **en esa carpeta**. Todavía no ejecutar nada.

**3.b — En el servidor:**

```bash
sudo rclone config
```

Responder así a cada pregunta (los textos pueden variar un poco según la versión de rclone; lo importante es la respuesta):

| Pregunta | Respuesta |
|----------|-----------|
| `e/n/d/r/c/s/q>` | `n` (nuevo remote) |
| `name>` | `gdrive` (exactamente así, en minúsculas) |
| `Storage>` | `drive` (Google Drive) |
| `client_id>` | Enter (vacío) |
| `client_secret>` | Enter (vacío) |
| `scope>` | `1` (acceso completo; la cuenta es exclusiva para backups) |
| `service_account_file>` | Enter (vacío) |
| `Edit advanced config?` | `n` |
| `Use web browser to automatically authenticate rclone with remote?` | **`n`** (porque el servidor no tiene navegador) |

Después de responder `n`, rclone muestra un mensaje parecido a:

```
Execute the following on the machine with the web browser:
rclone authorize "drive" "eyJzY29wZSI6ImRyaXZlIn0"
Then paste the result.
config_token>
```

**3.c — En la PC con navegador:** copiar ese comando **completo** (con el texto largo entre comillas) y pegarlo en PowerShell, anteponiendo `.\rclone.exe` en lugar de `rclone`, por ejemplo:

```powershell
.\rclone.exe authorize "drive" "eyJzY29wZSI6ImRyaXZlIn0"
```

Se abre el navegador:
1. **Iniciar sesión con `fahumada@ies21.edu.ar`** (si ya hay otra cuenta de Google abierta en ese navegador, elegir "Usar otra cuenta"; es fácil autorizar con la cuenta equivocada).
2. Aceptar los permisos que pide rclone.
3. Aparece "Success!" y en PowerShell se imprime un bloque largo entre llaves: `{"access_token":"...","token_type":"Bearer","refresh_token":"...", ...}`.

**3.d — Volver al servidor:** copiar ese bloque `{...}` completo (de la llave de apertura a la de cierre) y pegarlo donde dice `config_token>`, Enter. Después:

| Pregunta | Respuesta |
|----------|-----------|
| `Configure this as a Shared Drive (Team Drive)?` | `n` |
| `Keep this "gdrive" remote?` | `y` |
| `e/n/d/r/c/s/q>` | `q` (salir) |

**3.e — Verificar que quedó conectado:**

```bash
sudo rclone lsd gdrive:
sudo rclone about gdrive:
```

Tiene que listar carpetas (puede estar vacío) y mostrar el espacio usado/libre de esa cuenta, **sin error**. Si da error de autenticación, repetir el paso 3.

> El token es una credencial: queda guardado en `/root/.config/rclone/rclone.conf`. No copiarlo a ningún lado, no subirlo al repo, no pegarlo en chats.

### Paso 4 — Prueba manual del backup (antes de dejarlo en cron)

```bash
sudo /var/www/gestec/deploy/backup-db.sh
sudo cat /var/log/gestec-backup.log
sudo ls -lh /var/backups/gestec/
sudo rclone ls gdrive:gestec-backup-ies
```

**Qué tiene que pasar:** el log termina con estas tres líneas OK (con la fecha de hoy):
```
OK: dump local creado en /var/backups/gestec/gestec-AAAAMMDD-HHMMSS.sql.gz (…)
OK: subido a gdrive:gestec-backup-ies
Backup finalizado
```
El archivo `.sql.gz` pesa algo razonable (no 0 bytes) y el mismo archivo aparece en Google Drive, dentro de la carpeta `gestec-backup-ies` (la carpeta se crea sola; no hay que crearla a mano). También se puede verificar entrando a drive.google.com con la cuenta.

**Si falla:** el log dice la causa:
- `ERROR: pg_dump fallo` → ver `pg_dump --version` (paso 1) y que `DIRECT_URL` en `.env` sea correcta (probar `psql "$DIRECT_URL" -c "select 1"`).
- `ERROR: rclone copy fallo` → el dump local sí quedó; el problema es rclone/Drive (paso 3, o ver "Qué rompe el backup a Drive" en la sección 12).

### Paso 5 — Programarlo (cron, diario a las 3 AM)

```bash
sudo crontab -e
```

(si pregunta qué editor usar, elegir `nano`). Agregar al final esta línea y guardar (Ctrl+O, Enter, Ctrl+X):

```
0 3 * * * /var/www/gestec/deploy/backup-db.sh
```

Verificar que quedó:

```bash
sudo crontab -l
```

Al día siguiente de programarlo, **comprobar que corrió solo**: el log (`sudo cat /var/log/gestec-backup.log`) tiene que tener una entrada nueva de las 3 AM. Si no aparece, el cron no está funcionando.

### Paso 6 — Probar una restauración (hacerlo al menos una vez)

Un backup que nunca se restauró no está confirmado como bueno. **Nunca restaurar sobre la base de producción**: el dump no usa `--clean` y pisaría/ensuciaría datos reales. Probarlo contra una base **vacía y separada** (por ejemplo, otro proyecto gratuito de Supabase creado solo para la prueba, o un Postgres local):

```bash
gunzip -c /var/backups/gestec/gestec-AAAAMMDD-HHMMSS.sql.gz | psql "URL-DE-LA-BASE-DE-PRUEBA"
```

Después comprobar que las tablas y los datos están (por ejemplo con Prisma Studio apuntando a esa base de prueba).

---

## 11. Verificación final

```bash
curl -I https://gestec.ies21.edu.ar
pm2 status
sudo ufw status
sudo crontab -l
```

Checklist (tildar cada punto):

- [ ] `curl -I` responde `HTTP/2 200` y el navegador muestra el candado sin advertencias.
- [ ] `http://gestec.ies21.edu.ar` redirige solo a `https://`.
- [ ] **Login real desde una red distinta a la de la institución** (datos móviles del celular), para confirmar que el acceso público funciona de punta a punta.
- [ ] Recorrer rápido las pantallas principales (Dashboard, Equipos, Tickets, Stock, Tareas) con un usuario real.
- [ ] **Probar el flujo de mails en producción:** registrar un usuario de prueba y recuperar contraseña; tienen que llegar mails con links a `https://gestec.ies21.edu.ar/...` (no a `localhost`). Si llegan con `localhost`, `FRONTEND_URL` está mal.
- [ ] `pm2 logs gestec-backend` sin errores al recibir tráfico real.
- [ ] `pm2 startup` + `pm2 save` ejecutados (prueba definitiva: reiniciar el servidor con `sudo reboot` en un momento tranquilo y confirmar que el sitio vuelve solo).
- [ ] `ufw status` activo con solo SSH, 80 y 443; el puerto 3000 no responde desde afuera.
- [ ] `/var/log/gestec-backup.log` con la prueba manual exitosa y el archivo visible en Google Drive.
- [ ] Cron del backup configurado y, al día siguiente, una entrada automática en el log.
- [ ] Borrar los usuarios de prueba creados durante la verificación (Admin → Usuarios).

---

## 12. Operación y mantenimiento

### 12.1. Actualizar el sistema con una versión nueva

```bash
cd /var/www/gestec
git pull
cd backend && pnpm install && pnpm db:generate && pnpm build && pnpm db:deploy
cd ../frontend && pnpm install && pnpm build
pm2 restart gestec-backend
```

Antes de actualizar en producción, conviene correr el backup manual (`sudo /var/www/gestec/deploy/backup-db.sh`) para tener una copia justo previa. Si la actualización incluye una migración, esa copia es el plan de vuelta atrás.

### 12.2. Renovación del certificado SSL

Es automática (cada 90 días, el sistema la intenta renovar solo). Para comprobarlo: `sudo certbot renew --dry-run`. Qué la rompe: cambiar el DNS, cerrar el puerto 80 en el firewall (Let's Encrypt necesita el 80 para validar), o desactivar el VirtualHost de `gestec.ies21.edu.ar`. Si falla, certbot manda un aviso al mail que se dio en la sección 6.

### 12.3. Revisar que los backups sigan funcionando (una vez por semana)

```bash
sudo tail -n 20 /var/log/gestec-backup.log
sudo grep -E "ERROR|ADVERTENCIA" /var/log/gestec-backup.log | tail
```

Tiene que haber un "Backup finalizado" por cada día, y ningún `ERROR` reciente. **El sistema no avisa por mail si un backup falla**: si nadie mira el log, un backup roto puede pasar semanas sin que nadie lo note. Conviene poner un recordatorio fijo (por ejemplo, los lunes) y mirar también que la carpeta `gestec-backup-ies` del Drive tenga archivos de los últimos 7 días.

### 12.4. Qué rompe el backup a Google Drive (y cómo arreglarlo)

El backup **local** sigue funcionando aunque falle la subida a Drive (el log dirá `ERROR: rclone copy fallo (el backup local sigue existiendo)`). Pero la copia en Drive es la que protege si el servidor se pierde, así que hay que arreglarlo.

Causas posibles:

| Qué pasó | Cómo se nota | Solución |
|----------|--------------|----------|
| Se cambió la contraseña de `fahumada@ies21.edu.ar` | Normalmente rclone **sigue funcionando** (el token de acceso es independiente de la contraseña), pero en algunas configuraciones de Google Workspace el cambio de contraseña o el cierre de sesiones sí invalida el token | Si empieza a fallar: reconectar (ver abajo) |
| Se revocó el acceso de rclone a la cuenta (en myaccount.google.com → Seguridad → Aplicaciones con acceso a la cuenta) | `ERROR: rclone copy fallo` con mensajes de `invalid_grant` o `token` | Reconectar |
| El administrador de Google Workspace bloqueó apps de terceros / la API de Drive | Igual que arriba | Pedirle al administrador de Workspace que permita el acceso; luego reconectar |
| La cuenta fue suspendida o dada de baja (por ejemplo, la persona dejó la institución) | Falla siempre | Elegir otra cuenta (idealmente una cuenta genérica de sistemas, no personal) y reconfigurar el remote `gdrive` con esa cuenta |
| Pasaron muchos meses sin usarse el token | Falla con `invalid_grant` | Reconectar (el backup diario lo usa a diario, así que no debería pasar) |
| La cuenta se quedó sin espacio en Drive | Errores de `quota` / `storageQuotaExceeded` | Liberar espacio (la retención de 7 días de dumps pesa poco, pero se puede llenar por otros archivos de la cuenta) |

**Cómo reconectar rclone con la misma cuenta** (sin cambiar nada más, el cron y el script siguen igual):

```bash
sudo rclone config reconnect gdrive:
```

Hace el mismo proceso de autorización del paso 3.b–3.d de la sección 10 (comando `rclone authorize` en la PC con navegador, pegar el token en el servidor). Después, comprobar con `sudo rclone lsd gdrive:` y correr una prueba manual del backup.

**Si hay que cambiar de cuenta de Google:** `sudo rclone config` → borrar el remote `gdrive` (`d`) y crearlo de nuevo con el mismo nombre (`gdrive`) autenticando con la cuenta nueva. No hace falta tocar el script. Después, actualizar este runbook con la cuenta nueva.

**Recomendación:** que la cuenta usada para backups sea una cuenta institucional de uso exclusivo (de sistemas), no la cuenta personal de una persona, y que al menos dos personas sepan de su existencia y puedan recuperarla.

### 12.5. Otros puntos que pueden romper el sistema en el futuro

- **Supabase (plan gratuito) pausa el proyecto por inactividad.** Si pasa, el sitio carga pero el login y todo lo que use datos falla, y en `pm2 logs` aparece `tenant/user ... not found`. Solución: entrar a supabase.com → el proyecto → **Restore**, esperar unos minutos y ejecutar `pm2 restart gestec-backend`. (Ya pasó en desarrollo.) Con uso diario normal no debería ocurrir, pero un período largo sin uso (vacaciones) sí puede pausarlo. Considerar el plan Pro si la disponibilidad es crítica.
- **Cambió la contraseña de la base de Supabase:** actualizar `DATABASE_URL` y `DIRECT_URL` en `backend/.env` y hacer `pm2 restart gestec-backend --update-env`. El backup también usa `DIRECT_URL` del mismo `.env`, así que se corrige junto.
- **Cambió el mail/contraseña del SMTP:** actualizar las variables `SMTP_*` en `backend/.env` y reiniciar el backend. Síntoma del problema: no llegan los mails de verificación ni de recuperación (el sistema igual dice "enviado").
- **Cambió el dominio:** actualizar `FRONTEND_URL` en `backend/.env`, `VITE_API_URL` en `frontend/.env` (y **rebuildear** el frontend), el VirtualHost de Apache y sacar un certificado nuevo.
- **Se reinicia el servidor:** PM2 y Apache tienen que volver solos (por eso `pm2 startup`). Verificar con `pm2 status` y abriendo el sitio.
- **Disco lleno:** los logs de PM2/Apache y los backups locales ocupan espacio. Revisar con `df -h`. Los backups locales se limpian solos a los 7 días.
- **Cambiar `JWT_SECRET`:** cierra la sesión de todos los usuarios. Hacerlo solo si se sospecha que el secreto se filtró.

---

## 13. Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| `apache2ctl configtest` da error de `SSLCertificateFile ... does not exist` | Se activó la plantilla completa antes de sacar el certificado | Volver a la sección 5 (VirtualHost mínimo), sacar el certificado (sección 6) y recién entonces la sección 7 |
| Apache no recarga | Error de sintaxis en `gestec.conf` | `sudo apache2ctl configtest` indica archivo y línea; `sudo journalctl -u apache2 -n 30` |
| El sitio carga pero el login dice error de conexión | Backend caído, o el frontend se buildeó sin `frontend/.env` y apunta a `localhost` | `pm2 status`; revisar `frontend/.env` y rebuildear |
| Error de CORS en el navegador (consola F12) | `FRONTEND_URL` mal escrito (barra final, `http` en vez de `https`) | Corregir en `backend/.env` y `pm2 restart gestec-backend --update-env` |
| Se loguea pero al refrescar vuelve al login | La cookie segura no se guarda: se está entrando por `http` o falta `NODE_ENV=production`/`trust proxy` | Entrar siempre por `https://`; revisar `NODE_ENV` |
| `502 Bad Gateway` / `Proxy Error` | Apache no alcanza al backend (puerto 3000) | `pm2 status` y `pm2 logs gestec-backend --err` |
| Backend `errored` con `tenant/user ... not found` | Supabase pausado | Restore en el dashboard de Supabase y `pm2 restart gestec-backend` |
| No llegan los mails | SMTP mal configurado o credenciales vencidas | Revisar `SMTP_*`; ver `pm2 logs gestec-backend` por errores de envío |
| Certbot: `Challenge failed` | DNS no apunta al servidor, o puerto 80 cerrado | Verificar con `nslookup` y revisar el firewall de la institución |
| Me quedé afuera del servidor por SSH después de `ufw enable` | No se permitió SSH antes de habilitar | Acceder por consola física/virtual del servidor y ejecutar `sudo ufw allow OpenSSH` |
| El backup del log dice `server version mismatch` | `pg_dump` más viejo que el Postgres de Supabase | Instalar un `postgresql-client` más nuevo (sección 10, paso 1) |
| El backup no encuentra el remote `gdrive` | `rclone config` se hizo con un usuario distinto al del cron | Rehacer `rclone config` con `sudo` y programar el cron con `sudo crontab -e` |

Comandos útiles de diagnóstico:

```bash
pm2 status
pm2 logs gestec-backend --lines 100
sudo tail -n 50 /var/log/apache2/gestec-error.log
sudo tail -n 50 /var/log/gestec-backup.log
sudo systemctl status apache2
df -h
```
