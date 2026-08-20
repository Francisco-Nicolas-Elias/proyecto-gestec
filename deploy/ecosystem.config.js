// Config de PM2 para el backend de GESTEC en producción.
// Correr desde la raíz del repo: pm2 start deploy/ecosystem.config.js
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
