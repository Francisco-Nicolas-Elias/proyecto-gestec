import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/roles.middleware';
import * as ctrl from '../controllers/admin.controller';

const router = Router();

router.use(authenticate, isAdmin);

router.get('/usuarios', ctrl.getUsuarios);
router.post('/usuarios', ctrl.createUsuario);
router.put('/usuarios/:id', ctrl.updateUsuario);
router.delete('/usuarios/:id', ctrl.deleteUsuario);

router.get('/ubicaciones', ctrl.getUbicaciones);
router.post('/ubicaciones', ctrl.createUbicacion);
router.put('/ubicaciones/:id', ctrl.updateUbicacion);
router.delete('/ubicaciones/:id', ctrl.deleteUbicacion);

router.get('/tipos-componente', ctrl.getTiposComponente);
router.post('/tipos-componente', ctrl.createTipoComponente);
router.put('/tipos-componente/:id', ctrl.updateTipoComponente);
router.delete('/tipos-componente/:id', ctrl.deleteTipoComponente);

router.get('/marcas', ctrl.getMarcas);
router.post('/marcas', ctrl.createMarca);
router.put('/marcas/:id', ctrl.updateMarca);
router.delete('/marcas/:id', ctrl.deleteMarca);

router.get('/proveedores', ctrl.getProveedores);
router.post('/proveedores', ctrl.createProveedor);
router.put('/proveedores/:id', ctrl.updateProveedor);
router.delete('/proveedores/:id', ctrl.deleteProveedor);

router.get('/logs', ctrl.getLogs);
router.delete('/logs', ctrl.clearLogs);

export default router;
