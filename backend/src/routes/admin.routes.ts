import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin, isAnyUser, isOperaciones } from '../middlewares/roles.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUsuarioSchema, updateUsuarioSchema } from '../schemas/usuario.schema';
import { ubicacionSchema, tipoComponenteSchema, marcaSchema, proveedorSchema, areaSchema } from '../schemas/catalogo.schema';
import * as ctrl from '../controllers/admin.controller';

const router = Router();

router.use(authenticate);

// Listado liviano de staff para selectores de asignación — operaciones y admin
router.get('/usuarios/staff', isOperaciones, ctrl.getUsuariosStaff);

// Usuarios y logs — solo admin
router.get('/usuarios', isAdmin, ctrl.getUsuarios);
router.post('/usuarios', isAdmin, validate(createUsuarioSchema), ctrl.createUsuario);
router.put('/usuarios/:id', isAdmin, validate(updateUsuarioSchema), ctrl.updateUsuario);
router.delete('/usuarios/:id', isAdmin, ctrl.deleteUsuario);
router.patch('/usuarios/:id/bloquear', isAdmin, ctrl.toggleBloqueoUsuario);

// Catálogo: lectura abierta a todos los autenticados, escritura solo admin
router.get('/ubicaciones', isAnyUser, ctrl.getUbicaciones);
router.post('/ubicaciones', isAdmin, validate(ubicacionSchema), ctrl.createUbicacion);
router.put('/ubicaciones/:id', isAdmin, validate(ubicacionSchema), ctrl.updateUbicacion);
router.delete('/ubicaciones/:id', isAdmin, ctrl.deleteUbicacion);

router.get('/tipos-componente', isAnyUser, ctrl.getTiposComponente);
router.post('/tipos-componente', isAdmin, validate(tipoComponenteSchema), ctrl.createTipoComponente);
router.put('/tipos-componente/:id', isAdmin, validate(tipoComponenteSchema), ctrl.updateTipoComponente);
router.delete('/tipos-componente/:id', isAdmin, ctrl.deleteTipoComponente);

router.get('/marcas', isAnyUser, ctrl.getMarcas);
router.post('/marcas', isAdmin, validate(marcaSchema), ctrl.createMarca);
router.put('/marcas/:id', isAdmin, validate(marcaSchema), ctrl.updateMarca);
router.delete('/marcas/:id', isAdmin, ctrl.deleteMarca);

router.get('/proveedores', isAnyUser, ctrl.getProveedores);
router.post('/proveedores', isAdmin, validate(proveedorSchema), ctrl.createProveedor);
router.put('/proveedores/:id', isAdmin, validate(proveedorSchema), ctrl.updateProveedor);
router.delete('/proveedores/:id', isAdmin, ctrl.deleteProveedor);

router.get('/areas', isAnyUser, ctrl.getAreas);
router.post('/areas', isAdmin, validate(areaSchema), ctrl.createArea);
router.put('/areas/:id', isAdmin, validate(areaSchema), ctrl.updateArea);
router.delete('/areas/:id', isAdmin, ctrl.deleteArea);

router.get('/logs', isAdmin, ctrl.getLogs);
router.delete('/logs', isAdmin, ctrl.clearLogs);

export default router;
