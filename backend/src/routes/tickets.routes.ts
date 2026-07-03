import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAnyUser, isOperaciones } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createTicketSchema, updateTicketSchema, createComentarioSchema, updateComentarioSchema } from '../schemas/ticket.schema';
import * as ctrl from '../controllers/tickets.controller';

const router = Router();

router.use(authenticate);

// Todos los roles pueden ver y crear tickets (filtrado por rol en el servicio)
router.get('/', isAnyUser, ctrl.getTickets);
router.get('/:id', isAnyUser, ctrl.getTicket);
router.post('/', isAnyUser, validate(createTicketSchema), ctrl.createTicket);
router.post('/:id/comentarios', isAnyUser, validate(createComentarioSchema), ctrl.addComentario);
// Editar comentario: exclusivo del autor, sin excepción de rol — validado en el servicio
router.put('/:id/comentarios/:comentarioId', isAnyUser, validate(updateComentarioSchema), ctrl.updateComentario);
// Eliminar comentario: dueño del comentario o staff (operaciones/admin) — validado en el servicio
router.delete('/:id/comentarios/:comentarioId', isAnyUser, ctrl.deleteComentario);

// Actualizar: el creador puede editar su propio ticket; el servicio restringe qué campos y valida propiedad
router.put('/:id', isAnyUser, validate(updateTicketSchema), ctrl.updateTicket);
// Eliminar: exclusivo de operaciones y admin
router.delete('/:id', isOperaciones, ctrl.deleteTicket);

export default router;
