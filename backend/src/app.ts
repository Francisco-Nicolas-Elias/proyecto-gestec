import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router } from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : ''),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', router);

// Ruta de salud — útil para verificar que el servidor está corriendo
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware de errores global — debe ir ÚLTIMO
app.use(errorHandler);

export { app };
