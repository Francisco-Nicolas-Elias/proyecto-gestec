import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isOperaciones } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createMovimientoSchema } from '../schemas/stock.schema';
import * as ctrl from '../controllers/stock.controller';

const router = Router();

router.use(authenticate, isOperaciones);

router.get('/componentes', ctrl.getStockComponentes);
router.get('/items', ctrl.getStockItems);
router.get('/movimientos', ctrl.getMovimientos);
router.post('/movimientos', validate(createMovimientoSchema), ctrl.createMovimiento);

export default router;
