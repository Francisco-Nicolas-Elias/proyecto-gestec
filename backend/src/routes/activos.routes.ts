import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isOperaciones } from '../middlewares/roles.middleware';
import * as ctrl from '../controllers/activos.controller';

const router = Router();

router.use(authenticate);

router.get('/', isOperaciones, ctrl.getActivos);
router.get('/check/:nroPc', isOperaciones, ctrl.checkNroPc);
router.get('/:id', isOperaciones, ctrl.getActivo);
router.post('/', isOperaciones, ctrl.createActivo);
router.put('/:id', isOperaciones, ctrl.updateActivo);
router.delete('/:id', isOperaciones, ctrl.deleteActivo);

router.get('/:id/intervenciones', isOperaciones, ctrl.getIntervenciones);
router.post('/:id/intervenciones', isOperaciones, ctrl.createIntervencion);
router.post('/:id/mantenimiento', isOperaciones, ctrl.addMantenimiento);

export default router;
