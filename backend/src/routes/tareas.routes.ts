import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isOperaciones } from '../middlewares/roles.middleware';
import * as ctrl from '../controllers/tareas.controller';

const router = Router();

router.use(authenticate, isOperaciones);

router.get('/', ctrl.getTareas);
router.get('/:id', ctrl.getTarea);
router.post('/', ctrl.createTarea);
router.patch('/:id/estado', ctrl.updateTareaStatus);
router.put('/:id', ctrl.updateTarea);
router.delete('/:id', ctrl.deleteTarea);
router.post('/:id/comentarios', ctrl.addComentario);
router.put('/:id/comentarios/:comentarioId', ctrl.updateComentario);
router.delete('/:id/comentarios/:comentarioId', ctrl.deleteComentario);

export default router;
