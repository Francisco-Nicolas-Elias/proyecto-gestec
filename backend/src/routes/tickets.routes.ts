import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAnyUser, isOperaciones } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createTicketSchema, updateTicketSchema, createComentarioSchema } from '../schemas/ticket.schema';
import * as ctrl from '../controllers/tickets.controller';

const router = Router();

router.use(authenticate);

// Todos los roles pueden ver y crear tickets (filtrado por rol en el servicio)
router.get('/', isAnyUser, ctrl.getTickets);
router.get('/:id', isAnyUser, ctrl.getTicket);
router.post('/', isAnyUser, validate(createTicketSchema), ctrl.createTicket);
router.post('/:id/comentarios', isAnyUser, validate(createComentarioSchema), ctrl.addComentario);

// Solo operaciones y admin pueden actualizar y eliminar
router.put('/:id', isOperaciones, validate(updateTicketSchema), ctrl.updateTicket);
router.delete('/:id', isOperaciones, ctrl.deleteTicket);

export default router;
