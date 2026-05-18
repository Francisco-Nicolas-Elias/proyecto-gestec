import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isOperaciones } from '../middlewares/roles.middleware';
import * as ctrl from '../controllers/componentes.controller';

const router = Router();

router.use(authenticate, isOperaciones);

router.get('/', ctrl.getComponentes);
router.get('/serie/:serie', ctrl.buscarPorSerie);
router.get('/:id', ctrl.getComponente);
router.post('/', ctrl.createComponente);
router.put('/:id', ctrl.updateComponente);
router.delete('/:id', ctrl.deleteComponente);
router.get('/:id/historial', ctrl.getHistorial);

export default router;
