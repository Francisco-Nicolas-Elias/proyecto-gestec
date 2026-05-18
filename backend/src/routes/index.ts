import { Router } from 'express';
import authRoutes from './auth.routes';
import activosRoutes from './activos.routes';
import componentesRoutes from './componentes.routes';
import ticketsRoutes from './tickets.routes';
import tareasRoutes from './tareas.routes';
import stockRoutes from './stock.routes';
import adminRoutes from './admin.routes';
import infoRoutes from './info.routes';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/activos', activosRoutes);
router.use('/componentes', componentesRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/tareas', tareasRoutes);
router.use('/stock', stockRoutes);
router.use('/admin', adminRoutes);
router.use('/info', infoRoutes);
