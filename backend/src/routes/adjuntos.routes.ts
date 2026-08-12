import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import * as ctrl from '../controllers/adjuntos.controller';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new AppError(400, 'Tipo de archivo no permitido'));
  },
});

router.use(authenticate);

router.post('/', upload.single('file'), ctrl.uploadAdjunto);
router.delete('/:id', ctrl.deleteAdjunto);

export default router;
