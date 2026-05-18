import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAnyUser, isOperaciones } from '../middlewares/roles.middleware';
import * as ctrl from '../controllers/tickets.controller';

const router = Router();

router.use(authenticate);

// Todos los roles pueden ver y crear tickets (filtrado por rol en el servicio)
router.get('/', isAnyUser, ctrl.getTickets);
router.get('/:id', isAnyUser, ctrl.getTicket);
router.post('/', isAnyUser, ctrl.createTicket);
router.post('/:id/comentarios', isAnyUser, ctrl.addComentario);

// Solo operaciones y admin pueden actualizar y eliminar
router.put('/:id', isOperaciones, ctrl.updateTicket);
router.delete('/:id', isOperaciones, ctrl.deleteTicket);

export default router;
