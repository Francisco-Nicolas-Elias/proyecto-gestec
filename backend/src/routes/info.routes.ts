import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin, isAnyUser } from '../middlewares/roles.middleware';
import { getInfo, updateInfo } from '../controllers/info.controller';

const router = Router();

router.get('/', authenticate, isAnyUser, getInfo);
router.put('/', authenticate, isAdmin, updateInfo);

export default router;
