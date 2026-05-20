import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import * as ctrl from '../controllers/adjuntos.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.use(authenticate);

router.post('/', upload.single('file'), ctrl.uploadAdjunto);
router.delete('/:id', ctrl.deleteAdjunto);

export default router;
