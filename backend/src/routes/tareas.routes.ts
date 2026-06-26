import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isOperaciones } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createTareaSchema, updateTareaSchema, updateTareaEstadoSchema, createComentarioTareaSchema } from '../schemas/tarea.schema';
import * as ctrl from '../controllers/tareas.controller';

const router = Router();

router.use(authenticate, isOperaciones);

router.get('/', ctrl.getTareas);
router.get('/:id', ctrl.getTarea);
router.post('/', validate(createTareaSchema), ctrl.createTarea);
router.patch('/:id/estado', validate(updateTareaEstadoSchema), ctrl.updateTareaStatus);
router.put('/:id', validate(updateTareaSchema), ctrl.updateTarea);
router.delete('/:id', ctrl.deleteTarea);
router.post('/:id/comentarios', validate(createComentarioTareaSchema), ctrl.addComentario);
router.put('/:id/comentarios/:comentarioId', validate(createComentarioTareaSchema), ctrl.updateComentario);
router.delete('/:id/comentarios/:comentarioId', ctrl.deleteComentario);

export default router;
