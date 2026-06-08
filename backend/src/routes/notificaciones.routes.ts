import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAnyUser } from '../middlewares/roles.middleware';
import * as ctrl from '../controllers/notificaciones.controller';

const router = Router();

router.use(authenticate, isAnyUser);

router.get('/', ctrl.getNotificaciones);
router.patch('/leidas', ctrl.marcarTodasLeidas);
router.patch('/:id/leida', ctrl.marcarLeida);

export default router;
