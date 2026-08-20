# Runbook de deploy — GESTEC en servidor IES21

Comandos a ejecutar por SSH en el servidor Ubuntu + Apache de la institución. Reemplazar `TU_DOMINIO_AQUI` y `/var/www/gestec` por los valores reales antes de correr cada bloque.

Este runbook se ejecuta **después** de terminar la revisión manual (desktop y mobile) del sistema.

## 1. Verificar dependencias del servidor

```bash
node -v
apache2 -v
pnpm -v || npm install -g pnpm
```

## 2. Copiar el código al servidor

```bash
git clone <url-del-repo> /var/www/gestec
cd /var/www/gestec
```

Crear `backend/.env` real (no versionado) a partir de `backend/.env.example`, con:
- `DATABASE_URL` / `DIRECT_URL` reales de Supabase, con `connection_limit=10`
- `JWT_SECRET` real (largo y aleatorio)
- `NODE_ENV=production`
- `FRONTEND_URL="https://TU_DOMINIO_AQUI"`
- Credenciales SMTP reales

## 3. Instalar y buildear

```bash
cd /var/www/gestec/backend
pnpm install
pnpm build
pnpm db:deploy

cd /var/www/gestec/frontend
pnpm install
pnpm build
```

## 4. Habilitar módulos de Apache

```bash
sudo a2enmod proxy proxy_http rewrite ssl
```

## 5. Configurar el VirtualHost

Copiar `deploy/apache-gestec.conf.template` a `/etc/apache2/sites-available/gestec.conf`, reemplazar los placeholders, y activarlo:

```bash
sudo cp deploy/apache-gestec.conf.template /etc/apache2/sites-available/gestec.conf
sudo nano /etc/apache2/sites-available/gestec.conf   # completar TU_DOMINIO_AQUI y rutas
sudo a2ensite gestec
sudo systemctl reload apache2
```

## 6. Certificado SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d TU_DOMINIO_AQUI
```

Certbot ajusta automáticamente el bloque `:443` del VirtualHost con las rutas del certificado.

## 7. Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Confirmar que el puerto 3000 (backend) y el puerto de Postgres **no** aparecen como expuestos — solo deben ser alcanzables desde `localhost`.

## 8. Arrancar el backend con PM2

```bash
sudo npm install -g pm2
cd /var/www/gestec
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup   # seguir la instrucción que imprime para que sobreviva a reinicios del servidor
```

## 9. Backup automático de la base de datos

El plan gratuito de Supabase no incluye backups automáticos — este paso arma uno casero: dump diario, copia local + copia en Google Drive, con 7 días de retención en ambos destinos.

```bash
# Instalar cliente de PostgreSQL (para pg_dump)
sudo apt install postgresql-client

# Instalar rclone
curl https://rclone.org/install.sh | sudo bash

# Configurar el remote de Google Drive (paso interactivo — requiere
# autenticarse con una cuenta de Google real del equipo; rclone abre un link
# para autorizar. Al pedir el nombre del remote, usar "gdrive")
rclone config

# Crear carpeta de backups y dar permisos de ejecución al script
sudo mkdir -p /var/backups/gestec
chmod +x /var/www/gestec/deploy/backup-db.sh

# Revisar deploy/backup-db.sh: ajustar ENV_FILE y RCLONE_REMOTE si difieren
# de /var/www/gestec/backend/.env y "gdrive:gestec-backups"

# Probar una corrida manual antes de dejarlo en cron
/var/www/gestec/deploy/backup-db.sh
cat /var/log/gestec-backup.log

# Agregar al crontab (corre todos los días a las 3am)
crontab -e
# agregar la linea:
# 0 3 * * * /var/www/gestec/deploy/backup-db.sh
```

## 10. Verificación final

```bash
curl -I https://TU_DOMINIO_AQUI
```

- Confirmar que responde con el certificado SSL válido (sin warning de "no seguro").
- Probar login real desde una red distinta a la de la institución (datos móviles), para confirmar que el acceso público funciona de punta a punta.
- Confirmar en `pm2 logs gestec-backend` que no hay errores al recibir tráfico real.
- Confirmar en `/var/log/gestec-backup.log` que la corrida de prueba del backup quedó registrada como exitosa.
