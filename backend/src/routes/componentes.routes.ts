import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isOperaciones } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createComponenteSchema, updateComponenteSchema } from '../schemas/componente.schema';
import * as ctrl from '../controllers/componentes.controller';

const router = Router();

router.use(authenticate, isOperaciones);

router.get('/', ctrl.getComponentes);
router.get('/serie/:serie', ctrl.buscarPorSerie);
router.get('/:id', ctrl.getComponente);
router.post('/', validate(createComponenteSchema), ctrl.createComponente);
router.put('/:id', validate(updateComponenteSchema), ctrl.updateComponente);
router.delete('/:id', ctrl.deleteComponente);
router.get('/:id/historial', ctrl.getHistorial);

export default router;
