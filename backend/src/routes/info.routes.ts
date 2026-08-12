import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin, isAnyUser } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateInfoSchema } from '../schemas/info.schema';
import { getInfo, updateInfo } from '../controllers/info.controller';

const router = Router();

router.get('/', authenticate, isAnyUser, getInfo);
router.put('/', authenticate, isAdmin, validate(updateInfoSchema), updateInfo);

export default router;
