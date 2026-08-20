# Design: Preparación para deploy con acceso público

## `trust proxy` en `backend/src/app.ts`

```ts
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({ ... }));
```

- `1` significa "confiar en un solo hop" — el reverse proxy de Apache que va a estar inmediatamente delante del proceso Node. No usar `true` (confiaría en toda la cadena de proxies, más laxo de lo necesario).
- Gatearlo por `NODE_ENV === 'production'` es la mitigación del riesgo de spoofing: en desarrollo nadie está detrás de un proxy real, así que no hay que confiar en `X-Forwarded-For` (cualquiera podría mandarlo con curl). En producción, el firewall (`ufw`, ver RUNBOOK) va a cerrar el puerto 3000 hacia afuera, así que la única forma de llegar al backend va a ser pasando por Apache — ahí sí es seguro confiar en el header, porque Apache lo sobreescribe con la IP real del cliente antes de reenviar.
- Esto es lo que hace que `loginRateLimiter` (agregado en el change anterior) identifique correctamente la IP real de cada visitante en producción, en vez de ver siempre la IP de Apache (localhost) para todo el tráfico.

## `backend/.env.example`

Corregir:
```diff
- DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
+ DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=10"
```

(El valor `1` original causaba serialización de queries de Prisma y lag de navegación — ya corregido en el `.env` real hace tiempo, pero el `.example` había quedado desactualizado.)

## `deploy/apache-gestec.conf.template`

```apache
<VirtualHost *:80>
    ServerName TU_DOMINIO_AQUI

    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName TU_DOMINIO_AQUI

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/TU_DOMINIO_AQUI/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/TU_DOMINIO_AQUI/privkey.pem

    DocumentRoot /var/www/gestec/frontend/dist

    <Directory /var/www/gestec/frontend/dist>
        Options -Indexes
        AllowOverride All
        Require all granted
        # SPA fallback: rutas de React Router que no son archivo, van a index.html
        FallbackResource /index.html
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api

    ErrorLog ${APACHE_LOG_DIR}/gestec-error.log
    CustomLog ${APACHE_LOG_DIR}/gestec-access.log combined
</VirtualHost>
```

Placeholders a completar en el deploy real: `TU_DOMINIO_AQUI`, `/var/www/gestec` (ruta real donde se clone/copie el repo en el servidor).

## `deploy/ecosystem.config.js`

```js
module.exports = {
  apps: [
    {
      name: 'gestec-backend',
      cwd: './backend',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

- `cwd: './backend'` asume que PM2 se corre desde la raíz del repo en el servidor.
- Las variables sensibles (`DATABASE_URL`, `JWT_SECRET`, SMTP, etc.) NO van en este archivo — viven en `backend/.env`, que Node carga vía `dotenv/config` como ya hace hoy.

## `deploy/RUNBOOK.md`

Checklist ordenado, con comandos copiables, cubriendo (retomando la nota pendiente de la memoria de deploy):
1. Confirmar Node y Apache instalados (ya hecho); instalar `pnpm` si falta.
2. Clonar/copiar el repo al servidor, crear `backend/.env` real (con `connection_limit=10`, `FRONTEND_URL` al dominio real, `NODE_ENV=production`).
3. `pnpm install` + `pnpm build` en `backend/` y `frontend/`.
4. `pnpm db:deploy` (aplicar migraciones).
5. Habilitar módulos de Apache: `a2enmod proxy proxy_http rewrite ssl`.
6. Copiar `deploy/apache-gestec.conf.template` a `/etc/apache2/sites-available/gestec.conf` (con los placeholders completados) y `a2ensite gestec`.
7. `certbot --apache -d TU_DOMINIO_AQUI` (obtiene y configura SSL automáticamente, ajusta el VirtualHost de 443).
8. `ufw allow 80,443/tcp` y confirmar que 3000 y el puerto de Postgres NO están expuestos (`ufw status`).
9. Instalar PM2 global (`npm i -g pm2`), `pm2 start deploy/ecosystem.config.js`, `pm2 save`, `pm2 startup`.
10. Verificación final: `curl -I https://TU_DOMINIO_AQUI` y probar login real desde afuera de la red de la institución.

## Verificación local del `trust proxy`

No hay reverse proxy real en desarrollo. Se simula con una request directa que incluya el header `X-Forwarded-For`, arrancando el backend una vez con `NODE_ENV=production` (temporalmente, solo para el test) y una vez con `development`, comparando `req.ip` vía un endpoint de diagnóstico temporal o inspeccionando logs — sin dejar ningún endpoint de debug en el código final.
