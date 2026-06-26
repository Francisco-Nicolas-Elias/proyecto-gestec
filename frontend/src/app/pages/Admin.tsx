import React, { useState, useEffect } from 'react';
import { Users, MapPin, Pencil, Trash2, Shield, Check, Cpu, Truck, Star, Plus, X, ScrollText, Search, Download, AlertTriangle, RefreshCw, Phone, Building2, Ban, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getUsuarios, createUsuario, updateUsuario, deleteUsuario, toggleBloqueoUsuario,
  getUbicacionesStruct, createUbicacionEntry, updateUbicacionEntry, deleteUbicacionEntry,
  getTiposComponente, getMarcas, getProveedores, getAreas,
  createTipoComponente, updateTipoComponente, deleteTipoComponente,
  createMarca, updateMarca, deleteMarca,
  createProveedor, updateProveedor, deleteProveedor,
  createArea, updateArea, deleteArea,
  type TipoComponente, type Marca, type Proveedor, type Area, type UbicacionEntry,
} from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Table from '../components/Table';
import SearchableSelect from '../components/SearchableSelect';
import ClearableInput from '../components/ClearableInput';
import { toast } from 'sonner@2.0.3';
import { getLogs, addLog, clearLogs, type LogEntry, type LogModulo } from '../services/logsService';
import { useFormPersistence } from '../services/useFormPersistence';

// ── Valores iniciales de formularios (fuera del componente para referencia estable) ──
const INIT_USUARIO = { nombre: '', email: '', rol: 'docente_empleado' as 'administrador' | 'operaciones' | 'docente_empleado', area: '' };
const INIT_UBICACION = { sector: '', piso: '' };
const INIT_ROL = { nombre: '', descripcion: '', permisos: [] as string[] };
const INIT_PROVEEDOR = { nombre: '', contacto: '', telefono: '' };

// ── Piso options ───────────────────────────────────────────────────────────
const PISO_OPTIONS = [
  { value: 'Planta Baja', label: 'PB - Planta Baja' },
  { value: '1° Piso', label: '1° Piso' },
  { value: '2° Piso', label: '2° Piso' },
  { value: '3° Piso', label: '3° Piso' },
  { value: '4° Piso', label: '4° Piso' },
  { value: '5° Piso', label: '5° Piso' },
  { value: '6° Piso', label: '6° Piso' },
  { value: '7° Piso', label: '7° Piso' },
];

// ── Shared input class ─────────────────────────────────────────────────────
const ic = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent text-sm placeholder:text-gray-400';

const PERMISOS_DISPONIBLES = [
  { key: 'activos', label: 'Ver Equipos' },
  { key: 'activos_editar', label: 'Crear/Editar Equipos' },
  { key: 'tickets_crear', label: 'Crear Tickets' },
  { key: 'tickets_gestionar', label: 'Gestionar Tickets' },
  { key: 'stock', label: 'Gestión de Stock' },
  { key: 'tareas', label: 'Gestión de Tareas' },
  { key: 'admin', label: 'Administración' },
];

type AdminTab = 'usuarios' | 'ubicaciones' | 'roles' | 'componentes' | 'marcas' | 'proveedores' | 'areas' | 'logs';

const normalize = (s: string) => (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ');

export default function Admin() {
  const { hasPermission, usuario, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios');
  const [saving, setSaving] = useState(false);

  // ── Usuarios ──────────────────────────────────────────────────────────────
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [userToBloquear, setUserToBloquear] = useState<any | null>(null);
  // Formularios con persistencia de draft en sessionStorage
  const [formData, setFormData, clearFormDataPersistence] = useFormPersistence('gestec:admin:usuario:new', INIT_USUARIO);
  const [usuariosSearch, setUsuariosSearch] = useState('');
  const [usuariosRolFiltro, setUsuariosRolFiltro] = useState('');
  const [usuariosAreaFiltro, setUsuariosAreaFiltro] = useState('');

  // ── Ubicaciones ───────────────────────────────────────────────────────────
  const [ubicaciones, setUbicaciones] = useState<UbicacionEntry[]>([]);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<UbicacionEntry | null>(null);
  const [showDeleteUbicacionModal, setShowDeleteUbicacionModal] = useState(false);
  const [ubicacionToDelete, setUbicacionToDelete] = useState<UbicacionEntry | null>(null);
  const [ubicacionForm, setUbicacionForm, clearUbicacionFormPersistence] = useFormPersistence('gestec:admin:ubicacion:new', INIT_UBICACION);
  const [ubicacionesSearch, setUbicacionesSearch] = useState('');
  const [ubicacionesPisoFiltro, setUbicacionesPisoFiltro] = useState('');

  // ── Roles ─────────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState([
    { id: '1', nombre: 'Administrador', descripcion: 'Acceso total al sistema', permisos: ['activos', 'activos_editar', 'tickets_crear', 'tickets_gestionar', 'stock', 'tareas', 'admin'] },
    { id: '2', nombre: 'Operaciones', descripcion: 'Gestión de activos, tickets, stock y tareas', permisos: ['activos', 'activos_editar', 'tickets_crear', 'tickets_gestionar', 'stock', 'tareas'] },
    { id: '3', nombre: 'Docente/Empleado', descripcion: 'Solo puede crear y ver sus propios tickets', permisos: ['tickets_crear'] },
  ]);
  const [showRolModal, setShowRolModal] = useState(false);
  const [editingRol, setEditingRol] = useState<any | null>(null);
  const [showDeleteRolModal, setShowDeleteRolModal] = useState(false);
  const [rolToDelete, setRolToDelete] = useState<any | null>(null);
  const [rolFormData, setRolFormData, clearRolFormDataPersistence] = useFormPersistence('gestec:admin:rol:new', INIT_ROL);

  // ── Tipos de Componente ───────────────────────────────────────────────────
  const [tiposComponente, setTiposComponente] = useState<TipoComponente[]>([]);
  const [showTipoCompModal, setShowTipoCompModal] = useState(false);
  const [editingTipoComp, setEditingTipoComp] = useState<TipoComponente | null>(null);
  const [tipoCompForm, setTipoCompForm, clearTipoCompFormPersistence] = useFormPersistence('gestec:admin:tipocomp:new', '');
  const [showDeleteTipoCompModal, setShowDeleteTipoCompModal] = useState(false);
  const [tipoCompToDelete, setTipoCompToDelete] = useState<TipoComponente | null>(null);
  const [tiposCompSearch, setTiposCompSearch] = useState('');

  // ── Marcas ────────────────────────────────────────────────────────────────
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [showMarcaModal, setShowMarcaModal] = useState(false);
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
  const [marcaForm, setMarcaForm, clearMarcaFormPersistence] = useFormPersistence('gestec:admin:marca:new', '');
  const [showDeleteMarcaModal, setShowDeleteMarcaModal] = useState(false);
  const [marcaToDelete, setMarcaToDelete] = useState<Marca | null>(null);
  const [marcasSearch, setMarcasSearch] = useState('');

  // ── Logs ──────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsModulo, setLogsModulo] = useState('');
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [logDetalle, setLogDetalle] = useState<LogEntry | null>(null);

  // ── Proveedores ───────────────────────────────────────────────────────────
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [proveedorForm, setProveedorForm, clearProveedorFormPersistence] = useFormPersistence('gestec:admin:proveedor:new', INIT_PROVEEDOR);
  const [showDeleteProveedorModal, setShowDeleteProveedorModal] = useState(false);
  const [proveedorToDelete, setProveedorToDelete] = useState<Proveedor | null>(null);
  const [proveedoresSearch, setProveedoresSearch] = useState('');

  // ── Áreas ─────────────────────────────────────────────────────────────────
  const [areas, setAreas] = useState<Area[]>([]);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaForm, setAreaForm, clearAreaFormPersistence] = useFormPersistence('gestec:admin:area:new', '');
  const [showDeleteAreaModal, setShowDeleteAreaModal] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
  const [areasSearch, setAreasSearch] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  // Refrescar logs al entrar a la pestaña, para reflejar acciones recientes de la sesión
  useEffect(() => {
    if (activeTab === 'logs') getLogs().then(setLogs);
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [usuariosData, ubicacionesData, tiposComponenteData, marcasData, proveedoresData, areasData] = await Promise.all([
        getUsuarios(),
        getUbicacionesStruct(),
        getTiposComponente(),
        getMarcas(),
        getProveedores(),
        getAreas(),
      ]);
      setUsuarios(usuariosData);
      setUbicaciones(ubicacionesData);
      setTiposComponente([...tiposComponenteData].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setMarcas([...marcasData].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setProveedores([...proveedoresData].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setAreas([...areasData].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setLogs(await getLogs());
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // ── Usuarios handlers ─────────────────────────────────────────────────────
  const openNuevoUsuario = () => {
    setEditingUsuario(null);
    // NO reseteamos formData: el hook ya restauró el draft desde sessionStorage.
    setShowUsuarioModal(true);
  };

  const handleEditUsuario = (usuario: any) => {
    setEditingUsuario(usuario);
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      area: usuario.area ?? '',
    });
    setShowUsuarioModal(true);
  };

  const handleSubmitUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUsuario) {
        await updateUsuario(editingUsuario.id, formData);
        setUsuarios(prev => prev.map(u => u.id === editingUsuario.id ? { ...u, ...formData } : u));
        toast.success('Usuario actualizado correctamente');
        addLog(
          `Usuario "${formData.nombre}" editado — rol: ${formData.rol}${formData.area ? `, área: ${formData.area}` : ''}`,
          'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
        );
      } else {
        await createUsuario(formData);
        const fresh = await getUsuarios();
        setUsuarios(fresh);
        toast.success('Usuario creado correctamente');
        addLog(
          `Usuario "${formData.nombre}" creado con rol ${formData.rol}${formData.area ? ` (${formData.area})` : ''}`,
          'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
        );
      }
      setShowUsuarioModal(false);
      setEditingUsuario(null);
      clearFormDataPersistence(); // ← Limpiar draft al guardar
    } catch {
      toast.error('Error al guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUsuario = async () => {
    if (!userToDelete) return;
    setSaving(true);
    try {
      await deleteUsuario(userToDelete.id);
      setUsuarios(prev => prev.filter(u => u.id !== userToDelete.id));
      toast.success('Usuario eliminado correctamente');
      addLog(
        `Usuario "${userToDelete.nombre}" eliminado del sistema`,
        'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
      );
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch {
      toast.error('Error al eliminar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBloqueo = (u: any) => {
    setUserToBloquear(u);
    setShowBloqueoModal(true);
  };

  const confirmToggleBloqueo = async () => {
    if (!userToBloquear) return;
    setSaving(true);
    try {
      const actualizado = await toggleBloqueoUsuario(userToBloquear.id);
      setUsuarios(prev => prev.map(x => x.id === userToBloquear.id ? { ...x, bloqueado: (actualizado as any).bloqueado } : x));
      const accion = (actualizado as any).bloqueado ? 'bloqueado' : 'desbloqueado';
      toast.success(`Usuario "${userToBloquear.nombre}" ${accion} correctamente`);
      addLog(
        `Usuario "${userToBloquear.nombre}" ${accion}`,
        'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
      );
      setShowBloqueoModal(false);
      setUserToBloquear(null);
    } catch {
      toast.error('Error al cambiar el estado del usuario');
    } finally {
      setSaving(false);
    }
  };

  // ── Ubicaciones handlers ──────────────────────────────────────────────────
  const openNuevaUbicacion = () => {
    setEditingUbicacion(null);
    // NO reseteamos ubicacionForm: el hook restaura el draft desde sessionStorage.
    setShowUbicacionModal(true);
  };

  const handleEditUbicacion = (u: UbicacionEntry) => {
    setEditingUbicacion(u);
    setUbicacionForm({ sector: u.sector, piso: u.piso });
    setShowUbicacionModal(true);
  };

  const handleSubmitUbicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ubicacionForm.sector.trim()) { toast.error('El sector es obligatorio'); return; }
    if (!ubicacionForm.piso) { toast.error('El piso es obligatorio'); return; }
    setSaving(true);
    try {
      if (editingUbicacion) {
        await updateUbicacionEntry(editingUbicacion.id, ubicacionForm);
        setUbicaciones(prev =>
          prev.map(u => u.id === editingUbicacion.id ? { ...u, ...ubicacionForm } : u)
            .sort((a, b) => a.sector.localeCompare(b.sector))
        );
        toast.success('Ubicación actualizada');
        addLog(
          `Ubicación "${ubicacionForm.sector} — ${ubicacionForm.piso}" actualizada`,
          'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
        );
      } else {
        const created = await createUbicacionEntry(ubicacionForm);
        setUbicaciones(prev => [...prev, created].sort((a, b) => a.sector.localeCompare(b.sector)));
        toast.success('Ubicación creada');
        addLog(
          `Ubicación "${ubicacionForm.sector} — ${ubicacionForm.piso}" creada`,
          'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
        );
      }
      setShowUbicacionModal(false);
      setEditingUbicacion(null);
      clearUbicacionFormPersistence(); // ← Limpiar draft al guardar
    } catch {
      toast.error('Error al guardar la ubicación');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUbicacion = async () => {
    if (!ubicacionToDelete) return;
    setSaving(true);
    try {
      await deleteUbicacionEntry(ubicacionToDelete.id);
      setUbicaciones(prev => prev.filter(u => u.id !== ubicacionToDelete.id));
      toast.success('Ubicación eliminada');
      addLog(
        `Ubicación "${ubicacionToDelete.sector}" eliminada`,
        'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
      );
      setShowDeleteUbicacionModal(false);
      setUbicacionToDelete(null);
    } catch {
      toast.error('Error al eliminar la ubicación');
    } finally {
      setSaving(false);
    }
  };

  // Inicializar formulario de Rol (solo en edición: siempre carga del rol a editar)
  useEffect(() => {
    if (!showRolModal) return;
    if (editingRol) {
      setRolFormData({
        nombre: editingRol.nombre,
        descripcion: editingRol.descripcion,
        permisos: [...editingRol.permisos],
      });
    }
    // En modo "nuevo", NO reseteamos: el hook restaura el draft desde sessionStorage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRolModal]);

  // ── Roles handlers ────────────────────────────────────────────────────────
  const openNuevoRol = () => {
    setEditingRol(null);
    setShowRolModal(true);
  };

  const handleEditRol = (rol: any) => {
    setEditingRol(rol);
    setShowRolModal(true);
  };

  // cancel=true → el usuario hizo clic en Cancelar (limpiar draft si es "nuevo")
  // cancel=false → el usuario cerró con X (mantener draft)
  const closeRolModal = (cancel = false) => {
    if (cancel && !editingRol) clearRolFormDataPersistence();
    setShowRolModal(false);
    setEditingRol(null);
  };

  const handleSubmitRol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rolFormData.nombre.trim()) {
      toast.error('El nombre del rol es obligatorio');
      return;
    }
    try {
      if (editingRol) {
        setRoles(prev =>
          prev.map(r => r.id === editingRol.id ? { ...r, ...rolFormData } : r)
        );
        toast.success('Rol actualizado correctamente');
        addLog(
          `Rol "${rolFormData.nombre}" actualizado`,
          'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
        );
      } else {
        const newRol = { id: Date.now().toString(), ...rolFormData };
        setRoles(prev => [...prev, newRol]);
        toast.success('Rol creado correctamente');
        addLog(
          `Rol "${rolFormData.nombre}" creado`,
          'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
        );
      }
      if (!editingRol) clearRolFormDataPersistence(); // ← Limpiar draft al guardar nuevo rol
      closeRolModal();
    } catch {
      toast.error('Error al guardar el rol');
    }
  };

  const togglePermiso = (key: string) => {
    setRolFormData(prev => ({
      ...prev,
      permisos: prev.permisos.includes(key)
        ? prev.permisos.filter(p => p !== key)
        : [...prev.permisos, key],
    }));
  };

  const confirmDeleteRol = () => {
    if (!rolToDelete) return;
    setRoles(prev => prev.filter(r => r.id !== rolToDelete.id));
    toast.success('Rol eliminado correctamente');
    addLog(
      `Rol "${rolToDelete.nombre}" eliminado`,
      'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '',
    );
    setShowDeleteRolModal(false);
    setRolToDelete(null);
  };

  // ── Usuarios table columns ─────────────────────────────────────────────────
  const usuariosColumns = [
    {
      key: 'nombre',
      label: 'Nombre',
      render: (value: string, row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{value}</span>
          {row.bloqueado && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <Ban size={10} /> Bloqueado
            </span>
          )}
        </div>
      ),
    },
    { key: 'email', label: 'Email', className: 'hidden md:table-cell' },
    {
      key: 'rol',
      label: 'Rol',
      render: (value: string) => {
        const rolLabels: Record<string, string> = {
          administrador: 'Administrador',
          operaciones: 'Operaciones',
          docente_empleado: 'Docente/Empleado',
        };
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e6f7fc] text-[#007a9e] dark:bg-[#004d63]/40 dark:text-[#00c8f0]">
            {rolLabels[value] || value}
          </span>
        );
      },
    },
    {
      key: 'area',
      label: 'Área',
      className: 'hidden lg:table-cell',
      render: (value: string) => value || <span className="text-gray-400">—</span>,
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditUsuario(row)}
            title="Editar usuario"
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleToggleBloqueo(row)}
            title={row.bloqueado ? 'Desbloquear usuario' : 'Bloquear usuario'}
            className={`p-1.5 rounded transition-colors ${row.bloqueado ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
          >
            {row.bloqueado ? <ShieldCheck size={15} /> : <Ban size={15} />}
          </button>
          <button
            onClick={() => { setUserToDelete(row); setShowDeleteModal(true); }}
            title="Eliminar usuario"
            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (authLoading) return <div className="p-6"><LoadingSpinner /></div>;

  if (!hasPermission('admin')) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  const tabs = [
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
    { id: 'areas', label: 'Áreas', icon: Building2 },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'componentes', label: 'Componentes', icon: Cpu },
    { id: 'marcas', label: 'Marcas', icon: Truck },
    { id: 'proveedores', label: 'Proveedores', icon: Star },
    { id: 'logs', label: 'Logs', icon: ScrollText },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Administración</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gestión de usuarios, ubicaciones y catálogos del sistema</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center gap-2 px-5 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#00a6d6] text-[#00a6d6] dark:text-[#00c4f0]'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">

          {/* ── Usuarios Tab ── */}
          {activeTab === 'usuarios' && (() => {
            const _uWords = normalize(usuariosSearch).split(' ').filter(Boolean);
            const filteredUsuarios = usuarios.filter(u => {
              const matchSearch = !_uWords.length || (() => {
                const text = [u.nombre, u.email].map(normalize).join(' ');
                return _uWords.every(w => text.includes(w));
              })();
              const matchRol = !usuariosRolFiltro || u.rol === usuariosRolFiltro;
              const matchArea = !usuariosAreaFiltro || (u.area ?? '') === usuariosAreaFiltro;
              return matchSearch && matchRol && matchArea;
            });
            const filtrosActivos = !!(usuariosSearch || usuariosRolFiltro || usuariosAreaFiltro);
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold dark:text-white">Usuarios del Sistema</h3>
                  <button
                    onClick={openNuevoUsuario}
                    className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Plus size={16} /> Nuevo Usuario
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={usuariosSearch}
                      onChange={e => setUsuariosSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent"
                    />
                    {usuariosSearch && <button onClick={() => setUsuariosSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14} /></button>}
                  </div>
                  <div className="sm:w-48">
                    <SearchableSelect
                      options={[
                        { value: '', label: 'Todos los roles' },
                        { value: 'administrador', label: 'Administrador' },
                        { value: 'operaciones', label: 'Operaciones' },
                        { value: 'docente_empleado', label: 'Docente/Empleado' },
                      ]}
                      value={usuariosRolFiltro}
                      onChange={setUsuariosRolFiltro}
                      placeholder="Filtrar por rol..."
                      noSort
                    />
                  </div>
                  <div className="sm:w-48">
                    <SearchableSelect
                      options={[{ value: '', label: 'Todas las áreas' }, ...areas.map(a => ({ value: a.nombre, label: a.nombre }))]}
                      value={usuariosAreaFiltro}
                      onChange={setUsuariosAreaFiltro}
                      placeholder="Filtrar por área..."
                      noSort
                    />
                  </div>
                </div>

                <Table
                  columns={usuariosColumns}
                  data={filteredUsuarios}
                  emptyMessage={usuarios.length === 0 ? 'No hay usuarios registrados' : 'No hay usuarios que coincidan con los filtros'}
                />
                {filtrosActivos && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                    Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
                  </p>
                )}


              </div>
            );
          })()}

          {/* ── Ubicaciones Tab ── */}
          {activeTab === 'ubicaciones' && (() => {
            const _ubWords = normalize(ubicacionesSearch).split(' ').filter(Boolean);
            const filteredUbicaciones = ubicaciones.filter(u => {
              const matchSearch = !_ubWords.length || _ubWords.every(w => normalize(u.sector).includes(w));
              const matchPiso = !ubicacionesPisoFiltro || u.piso === ubicacionesPisoFiltro;
              return matchSearch && matchPiso;
            });
            return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold dark:text-white">Ubicaciones ({ubicaciones.length})</h3>
                <button
                  onClick={openNuevaUbicacion}
                  className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <Plus size={16} /> Nueva Ubicación
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por sector..."
                    value={ubicacionesSearch}
                    onChange={e => setUbicacionesSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent"
                  />
                  {ubicacionesSearch && <button onClick={() => setUbicacionesSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14} /></button>}
                </div>
                <div className="sm:w-48">
                  <SearchableSelect
                    options={[{ value: '', label: 'Todos los pisos' }, ...PISO_OPTIONS]}
                    value={ubicacionesPisoFiltro}
                    onChange={setUbicacionesPisoFiltro}
                    placeholder="Filtrar por piso..."
                    noSort
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredUbicaciones.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MapPin className="text-[#00a6d6] flex-shrink-0" size={18} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.sector}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.piso}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleEditUbicacion(u)}
                        title="Editar"
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { setUbicacionToDelete(u); setShowDeleteUbicacionModal(true); }}
                        title="Eliminar"
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredUbicaciones.length === 0 && (
                  <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    {ubicaciones.length === 0 ? 'No hay ubicaciones registradas' : 'No hay ubicaciones que coincidan con los filtros'}
                  </p>
                )}
              </div>

              <div className="bg-[#e6f7fc] dark:bg-[#004d63]/20 border border-[#b3e7f7] dark:border-[#004d63]/40 rounded-lg p-4">
                <p className="text-sm text-[#007a9e] dark:text-[#00c8f0]">
                  Las ubicaciones definen los sectores disponibles para asignar equipos en el módulo Equipos. El piso se completa automáticamente al seleccionar un sector.
                </p>
              </div>
            </div>
            );
          })()}

          {/* ── Áreas Tab ── */}
          {activeTab === 'areas' && (() => {
            const _aWords = normalize(areasSearch).split(' ').filter(Boolean);
            const filteredAreas = areas.filter(a => !_aWords.length || _aWords.every(w => normalize(a.nombre).includes(w)));
            return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold dark:text-white">Áreas ({areas.length})</h3>
                <button
                  onClick={() => { setEditingArea(null); /* NO resetear areaForm */ setShowAreaModal(true); }}
                  className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <Plus size={16} /> Nueva Área
                </button>
              </div>

              {/* Filter */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar área..."
                  value={areasSearch}
                  onChange={e => setAreasSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent"
                />
                {areasSearch && <button onClick={() => setAreasSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14} /></button>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAreas.map(area => (
                  <div key={area.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#e6f7fc] dark:bg-[#004d63]/30 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-[#00a6d6]" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{area.nombre}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingArea(area); setAreaForm(area.nombre); setShowAreaModal(true); }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { setAreaToDelete(area); setShowDeleteAreaModal(true); }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredAreas.length === 0 && (
                  <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    {areas.length === 0 ? 'No hay áreas registradas' : 'No hay áreas que coincidan con la búsqueda'}
                  </p>
                )}
              </div>
            </div>
            );
          })()}

          {/* ── Roles Tab ── */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold dark:text-white">Roles del Sistema</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  Solo lectura — definidos por el sistema
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map(rol => (
                  <div key={rol.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-[#e6f7fc] dark:bg-[#004d63]/30 flex items-center justify-center flex-shrink-0">
                        <Shield size={18} className="text-[#00a6d6]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{rol.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{rol.descripcion}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PERMISOS_DISPONIBLES.map(p => (
                        <span
                          key={p.key}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            rol.permisos.includes(p.key)
                              ? 'bg-[#e6f7fc] text-[#007a9e] dark:bg-[#004d63]/40 dark:text-[#00c8f0]'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 line-through'
                          }`}
                        >
                          {rol.permisos.includes(p.key) && <Check size={10} />}
                          {p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#e6f7fc] dark:bg-[#004d63]/20 border border-[#b3e7f7] dark:border-[#004d63]/40 rounded-lg p-4">
                <p className="text-sm text-[#007a9e] dark:text-[#00c8f0]">
                  Los roles están definidos por el sistema y no son editables. Para cambiar los permisos de un usuario, modificá su rol desde la pestaña Usuarios.
                </p>
              </div>
            </div>
          )}

          {/* ── Componentes Tab ── */}
          {activeTab === 'componentes' && (() => {
            const _tcWords = normalize(tiposCompSearch).split(' ').filter(Boolean);
            const filteredTipos = tiposComponente.filter(t => !_tcWords.length || _tcWords.every(w => normalize(t.nombre).includes(w)));
            return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold dark:text-white">Tipos de Componente ({tiposComponente.length})</h3>
                <button
                  onClick={() => { setEditingTipoComp(null); /* NO resetear tipoCompForm */ setShowTipoCompModal(true); }}
                  className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <Plus size={16} /> Nuevo Tipo
                </button>
              </div>

              {/* Filter */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar tipo de componente..."
                  value={tiposCompSearch}
                  onChange={e => setTiposCompSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent"
                />
                {tiposCompSearch && <button onClick={() => setTiposCompSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14} /></button>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTipos.map(tipo => (
                  <div key={tipo.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#e6f7fc] dark:bg-[#004d63]/30 flex items-center justify-center flex-shrink-0">
                        <Cpu size={18} className="text-[#00a6d6]" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{tipo.nombre}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingTipoComp(tipo); setTipoCompForm(tipo.nombre); /* edición: carga del tipo */ setShowTipoCompModal(true); }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { setTipoCompToDelete(tipo); setShowDeleteTipoCompModal(true); }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredTipos.length === 0 && (
                  <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    {tiposComponente.length === 0 ? 'No hay tipos de componente registrados' : 'No hay tipos que coincidan con la búsqueda'}
                  </p>
                )}
              </div>
            </div>
            );
          })()}

          {/* ── Marcas Tab ── */}
          {activeTab === 'marcas' && (() => {
            const _mWords = normalize(marcasSearch).split(' ').filter(Boolean);
            const filteredMarcas = marcas.filter(m => !_mWords.length || _mWords.every(w => normalize(m.nombre).includes(w)));
            return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold dark:text-white">Marcas ({marcas.length})</h3>
                <button
                  onClick={() => { setEditingMarca(null); /* NO resetear marcaForm */ setShowMarcaModal(true); }}
                  className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <Plus size={16} /> Nueva Marca
                </button>
              </div>

              {/* Filter */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar marca..."
                  value={marcasSearch}
                  onChange={e => setMarcasSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent"
                />
                {marcasSearch && <button onClick={() => setMarcasSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14} /></button>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMarcas.map(marca => (
                  <div key={marca.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#e6f7fc] dark:bg-[#004d63]/30 flex items-center justify-center flex-shrink-0">
                        <Truck size={18} className="text-[#00a6d6]" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{marca.nombre}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingMarca(marca); setMarcaForm(marca.nombre); setShowMarcaModal(true); }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { setMarcaToDelete(marca); setShowDeleteMarcaModal(true); }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredMarcas.length === 0 && (
                  <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    {marcas.length === 0 ? 'No hay marcas registradas' : 'No hay marcas que coincidan con la búsqueda'}
                  </p>
                )}
              </div>
            </div>
            );
          })()}

          {/* ── Proveedores Tab ── */}
          {activeTab === 'proveedores' && (() => {
            const _pWords = normalize(proveedoresSearch).split(' ').filter(Boolean);
            const filteredProveedores = proveedores.filter(p => {
              if (!_pWords.length) return true;
              const text = [p.nombre, p.contacto ?? '', p.telefono ?? ''].map(normalize).join(' ');
              return _pWords.every(w => text.includes(w));
            });
            return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold dark:text-white">Proveedores ({proveedores.length})</h3>
                <button
                  onClick={() => { setEditingProveedor(null); /* NO resetear proveedorForm */ setShowProveedorModal(true); }}
                  className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <Plus size={16} /> Nuevo Proveedor
                </button>
              </div>

              {/* Filter */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, contacto o teléfono..."
                  value={proveedoresSearch}
                  onChange={e => setProveedoresSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent"
                />
                {proveedoresSearch && <button onClick={() => setProveedoresSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14} /></button>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProveedores.map(proveedor => (
                  <div key={proveedor.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#e6f7fc] dark:bg-[#004d63]/30 flex items-center justify-center flex-shrink-0">
                        <Star size={18} className="text-[#00a6d6]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{proveedor.nombre}</p>
                        {proveedor.contacto && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{proveedor.contacto}</p>
                        )}
                        {proveedor.telefono && (
                          <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <Phone size={11} className="shrink-0 text-[#00a6d6]" />
                            {proveedor.telefono}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingProveedor(proveedor); setProveedorForm({ nombre: proveedor.nombre, contacto: proveedor.contacto || '', telefono: proveedor.telefono || '' }); setShowProveedorModal(true); }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { setProveedorToDelete(proveedor); setShowDeleteProveedorModal(true); }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredProveedores.length === 0 && (
                  <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    {proveedores.length === 0 ? 'No hay proveedores registrados' : 'No hay proveedores que coincidan con la búsqueda'}
                  </p>
                )}
              </div>
            </div>
            );
          })()}

          {/* ── Logs Tab ── */}
          {activeTab === 'logs' && (() => {
            const MODULO_COLORS: Record<string, string> = {
              Equipos: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
              Tickets: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
              Stock: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
              Tareas: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
              'Administración': 'bg-[#e6f7fc] text-[#007a9e] dark:bg-[#004d63]/40 dark:text-[#00c8f0]',
              Sistema: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300',
            };

            const MODULOS: LogModulo[] = ['Equipos', 'Tickets', 'Stock', 'Tareas', 'Administración', 'Sistema'];

            const filteredLogs = logs.filter(l => {
              const matchModulo = !logsModulo || l.modulo === logsModulo;
              const _lWords = normalize(logsSearch).split(' ').filter(Boolean);
              const matchSearch = !_lWords.length || (() => {
                const text = [l.accion, l.usuario].map(normalize).join(' ');
                return _lWords.every(w => text.includes(w));
              })();
              return matchModulo && matchSearch;
            });

            const today = new Date().toDateString();
            const logsHoy = logs.filter(l => new Date(l.fechaHora).toDateString() === today).length;

            const exportPDF = () => {
              const doc = new jsPDF({ orientation: 'landscape' });
              const pageW = doc.internal.pageSize.getWidth();
              const pageH = doc.internal.pageSize.getHeight();
              const cyan: [number, number, number] = [0, 166, 214];
              const cyanDark: [number, number, number] = [0, 100, 130];
              const fechaExport = new Date().toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              });

              // Banda de cabecera
              doc.setFillColor(...cyan);
              doc.rect(0, 0, pageW, 30, 'F');
              doc.setFillColor(...cyanDark);
              doc.rect(0, 26, pageW, 4, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(15);
              doc.text('GESTEC — Colegio Universitario IES', 14, 12);
              doc.setFontSize(9);
              doc.text('Historial de Acciones del Sistema — Logs de Auditoría', 14, 21);
              doc.text(`Exportado: ${fechaExport}`, pageW - 14, 21, { align: 'right' });

              doc.setTextColor(80, 80, 80);
              doc.setFontSize(8.5);
              doc.text(`Total de registros exportados: ${filteredLogs.length}`, 14, 38);

              autoTable(doc, {
                startY: 44,
                columns: [
                  { header: 'Fecha y Hora', dataKey: 'fecha' },
                  { header: 'Módulo',      dataKey: 'modulo' },
                  { header: 'Acción',      dataKey: 'accion' },
                  { header: 'Usuario',      dataKey: 'usuario' },
                  { header: 'Rol',          dataKey: 'rol' },
                ],
                body: filteredLogs.map(l => ({
                  fecha:   new Date(l.fechaHora).toLocaleString('es-AR'),
                  modulo:  l.modulo,
                  accion:  l.accion,
                  usuario: l.usuario,
                  rol:     l.usuarioRol,
                })),
                theme: 'grid',
                headStyles: {
                  fillColor: cyan,
                  textColor: [255, 255, 255],
                  fontStyle: 'bold',
                  fontSize: 7.5,
                  cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
                },
                bodyStyles: { fontSize: 7, textColor: [40, 40, 40], cellPadding: 2.5 },
                alternateRowStyles: { fillColor: [237, 248, 254] },
                columnStyles: {
                  fecha:   { cellWidth: 38 },
                  modulo:  { cellWidth: 28, fontStyle: 'bold', textColor: [0, 100, 140] as [number, number, number] },
                  accion:  { cellWidth: 'auto' },
                  usuario: { cellWidth: 38 },
                  rol:     { cellWidth: 30 },
                },
                didDrawPage: (data: any) => {
                  const pageCount = doc.getNumberOfPages();
                  doc.setFontSize(7);
                  doc.setTextColor(160, 160, 160);
                  doc.text(
                    `GESTEC – Colegio Universitario IES  |  Pág. ${data.pageNumber} de ${pageCount}`,
                    pageW / 2, pageH - 7, { align: 'center' },
                  );
                },
              });

              const now = new Date();
              const pad = (n: number) => String(n).padStart(2, '0');
              const filename = `logs_gestec_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.pdf`;
              const url = URL.createObjectURL(doc.output('blob'));
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            };

            return (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-semibold dark:text-white">Historial de Acciones del Sistema</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={async () => { setLogs(await getLogs()); toast.success('Logs actualizados'); }}
                      title="Actualizar"
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-600 dark:text-gray-300"
                    >
                      <RefreshCw size={14} /> Actualizar
                    </button>
                    <button
                      onClick={exportPDF}
                      title="Exportar PDF"
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-600 dark:text-gray-300"
                    >
                      <Download size={14} /> Exportar PDF
                    </button>
                    <button
                      onClick={() => setShowClearLogsModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={14} /> Limpiar
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total de registros</p>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#00a6d6]">{logsHoy}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Acciones hoy</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredLogs.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Resultados filtrados</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por acción o usuario..."
                      value={logsSearch}
                      onChange={e => setLogsSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent"
                    />
                    {logsSearch && <button onClick={() => setLogsSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14} /></button>}
                  </div>
                  <div className="sm:w-52">
                    <SearchableSelect
                      options={[{ value: '', label: 'Todos los módulos' }, ...MODULOS.map(m => ({ value: m, label: m }))]}
                      value={logsModulo}
                      onChange={v => setLogsModulo(v)}
                      placeholder="Filtrar por módulo..."
                      noSort
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Fecha y Hora</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Módulo</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acción Realizada</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Usuario</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                              <ScrollText size={32} className="mx-auto mb-2 opacity-30" />
                              No hay registros{logsSearch || logsModulo ? ' que coincidan con los filtros' : ' en el historial'}
                            </td>
                          </tr>
                        ) : filteredLogs.map((log, idx) => {
                          const fecha = new Date(log.fechaHora);
                          const esHoy = fecha.toDateString() === today;
                          return (
                            <tr key={log.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'} hover:bg-[#e6f7fc]/30 dark:hover:bg-[#004d63]/10 transition-colors`}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-gray-900 dark:text-white">
                                  {esHoy
                                    ? <span className="text-[#00a6d6] font-medium">Hoy</span>
                                    : <span>{fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                  }
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${MODULO_COLORS[log.modulo] ?? MODULO_COLORS['Sistema']}`}>
                                  {log.modulo}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs">
                                <p className="line-clamp-2">{log.accion}</p>
                                <span className={`sm:hidden inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${MODULO_COLORS[log.modulo] ?? MODULO_COLORS['Sistema']}`}>
                                  {log.modulo}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <p className="text-gray-900 dark:text-white">{log.usuario}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{log.usuarioRol.replace('_', '/')}</p>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                {log.detalle && (
                                  <button
                                    onClick={() => setLogDetalle(log)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#e6f7fc] dark:bg-[#004d63]/30 text-[#007a9e] dark:text-[#00c8f0] hover:bg-[#00a6d6]/20 transition-colors whitespace-nowrap"
                                  >
                                    Ver detalle
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {filteredLogs.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                    Mostrando {filteredLogs.length} de {logs.length} registros · Orden: más reciente primero
                  </p>
                )}

                {/* Modal Detalle de Log */}
                {logDetalle && (() => {
                  let parsed: { campos?: Record<string, [string, string]> } = {};
                  try { parsed = JSON.parse(logDetalle.detalle ?? '{}'); } catch { /* noop */ }
                  const campos = parsed.campos ?? {};
                  const fecha = new Date(logDetalle.fechaHora);
                  return (
                    <Modal isOpen={!!logDetalle} onClose={() => setLogDetalle(null)} title="Detalle del registro" size="sm">
                      <div className="space-y-4">
                        {/* Info general */}
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{logDetalle.accion}</p>
                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MODULO_COLORS[logDetalle.modulo] ?? MODULO_COLORS['Sistema']}`}>
                              {logDetalle.modulo}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                            <span><span className="font-medium text-gray-700 dark:text-gray-300">Usuario:</span> {logDetalle.usuario}</span>
                            <span><span className="font-medium text-gray-700 dark:text-gray-300">Rol:</span> {logDetalle.usuarioRol.replace('_', '/')}</span>
                            <span><span className="font-medium text-gray-700 dark:text-gray-300">Fecha:</span> {fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </div>

                        {/* Campos modificados */}
                        {Object.keys(campos).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Cambios realizados</p>
                            <div className="space-y-2">
                              {Object.entries(campos).map(([campo, [antes, despues]]) => (
                                <div key={campo} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                    {campo}
                                  </div>
                                  <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                                    <div className="px-3 py-2.5 bg-red-50 dark:bg-red-900/10">
                                      <p className="text-xs text-red-400 dark:text-red-500 mb-0.5">Antes</p>
                                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{antes}</p>
                                    </div>
                                    <div className="px-3 py-2.5 bg-green-50 dark:bg-green-900/10">
                                      <p className="text-xs text-green-400 dark:text-green-500 mb-0.5">Después</p>
                                      <p className="text-sm font-medium text-green-700 dark:text-green-400">{despues}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <button onClick={() => setLogDetalle(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </Modal>
                  );
                })()}
              </div>
            );
          })()}

        </div>
      </div>

      {/* ════ MODALES ════════════════════════════════════════════════════════ */}

      {/* Modal Usuario */}
      <Modal
        isOpen={showUsuarioModal}
        onClose={() => {
          // X button: NO limpiar draft (solo cerrar)
          setShowUsuarioModal(false);
          setEditingUsuario(null);
        }}
        title={editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="md"
      >
        <form onSubmit={handleSubmitUsuario} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <ClearableInput
              type="text" required value={formData.nombre}
              onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
              className={ic} placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email" required value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className={ic} placeholder="jperez@institucion.edu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rol <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={[
                { value: 'administrador', label: 'Administrador' },
                { value: 'docente_empleado', label: 'Docente/Empleado' },
                { value: 'operaciones', label: 'Operaciones' },
              ]}
              value={formData.rol}
              onChange={v => setFormData(p => ({ ...p, rol: v as any }))}
              placeholder="Seleccionar rol..."
              noClear
              noSort
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Área</label>
            <SearchableSelect
              options={areas.map(a => a.nombre)}
              value={formData.area}
              onChange={v => setFormData(p => ({ ...p, area: v }))}
              placeholder={areas.length ? 'Seleccionar área...' : 'No hay áreas cargadas'}
              disabled={areas.length === 0}
            />
            {areas.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                No hay áreas registradas. Cargalas desde la pestaña "Áreas".
              </p>
            )}
          </div>
          <div className="bg-[#e6f7fc] dark:bg-[#004d63]/20 border border-[#b3e7f7] dark:border-[#004d63]/40 rounded-lg p-3">
            <p className="text-xs text-[#007a9e] dark:text-[#00c8f0]">
              <strong>Roles:</strong><br />
              • <strong>Administrador:</strong> Acceso total<br />
              • <strong>Operaciones:</strong> Gestión de equipos, tickets, stock y tareas<br />
              • <strong>Docente/Empleado:</strong> Solo pueden crear y ver sus propios tickets
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                if (!editingUsuario) clearFormDataPersistence(); // ← Cancelar limpia el draft solo en "nuevo"
                setShowUsuarioModal(false);
                setEditingUsuario(null);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? (editingUsuario ? 'Actualizando...' : 'Creando...') : (editingUsuario ? 'Actualizar Usuario' : 'Crear Usuario')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Usuario */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Usuario" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que querés eliminar a <strong className="text-gray-900 dark:text-white">{userToDelete?.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">
              Cancelar
            </button>
            <button onClick={confirmDeleteUsuario} disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Bloquear/Desbloquear Usuario */}
      <Modal
        isOpen={showBloqueoModal}
        onClose={() => setShowBloqueoModal(false)}
        title={userToBloquear?.bloqueado ? 'Desbloquear Usuario' : 'Bloquear Usuario'}
        size="md"
      >
        <div className="space-y-4">
          <div className={`flex items-start gap-3 p-3 rounded-lg ${userToBloquear?.bloqueado ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
            {userToBloquear?.bloqueado
              ? <ShieldCheck size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              : <Ban size={20} className="text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            }
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {userToBloquear?.bloqueado
                ? <>¿Querés desbloquear a <strong className="text-gray-900 dark:text-white">{userToBloquear?.nombre}</strong>? Podrá volver a iniciar sesión normalmente.</>
                : <>¿Querés bloquear a <strong className="text-gray-900 dark:text-white">{userToBloquear?.nombre}</strong>? No podrá iniciar sesión hasta que lo desbloqueés.</>
              }
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowBloqueoModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={confirmToggleBloqueo}
              disabled={saving}
              className={`px-6 py-2 rounded-lg text-white disabled:opacity-50 transition-colors text-sm ${userToBloquear?.bloqueado ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
            >
              {saving ? 'Procesando...' : (userToBloquear?.bloqueado ? 'Desbloquear' : 'Bloquear')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Ubicación */}
      <Modal
        isOpen={showUbicacionModal}
        onClose={() => {
          // X button: NO limpiar draft
          setShowUbicacionModal(false);
          setEditingUbicacion(null);
        }}
        title={editingUbicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
        size="md"
      >
        <form onSubmit={handleSubmitUbicacion} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sector <span className="text-red-500">*</span>
            </label>
            <ClearableInput
              type="text" required
              value={ubicacionForm.sector}
              onChange={e => setUbicacionForm(p => ({ ...p, sector: e.target.value }))}
              className={ic}
              placeholder="Ej: Laboratorio 1, Secretaría, Decanato..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Piso <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={PISO_OPTIONS}
              value={ubicacionForm.piso}
              onChange={v => setUbicacionForm(p => ({ ...p, piso: v }))}
              placeholder="Seleccionar piso..."
              noClear
              noSort
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                if (!editingUbicacion) clearUbicacionFormPersistence(); // ← Cancelar limpia el draft
                setShowUbicacionModal(false);
                setEditingUbicacion(null);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? (editingUbicacion ? 'Actualizando...' : 'Creando...') : (editingUbicacion ? 'Actualizar Ubicación' : 'Crear Ubicación')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Ubicación */}
      <Modal isOpen={showDeleteUbicacionModal} onClose={() => setShowDeleteUbicacionModal(false)} title="Eliminar Ubicación" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que querés eliminar la ubicación <strong className="text-gray-900 dark:text-white">{ubicacionToDelete?.sector}</strong>?
            Los equipos asignados a este sector no se verán afectados.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowDeleteUbicacionModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">
              Cancelar
            </button>
            <button onClick={confirmDeleteUbicacion} disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Rol */}
      <Modal
        isOpen={showRolModal}
        onClose={closeRolModal}
        title={editingRol ? 'Editar Rol' : 'Nuevo Rol'}
        size="md"
      >
        <form onSubmit={handleSubmitRol} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del Rol <span className="text-red-500">*</span>
            </label>
            <ClearableInput
              type="text" required
              value={rolFormData.nombre}
              onChange={e => setRolFormData(p => ({ ...p, nombre: e.target.value }))}
              className={ic} placeholder="Ej: Supervisor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <ClearableInput
              type="text"
              value={rolFormData.descripcion}
              onChange={e => setRolFormData(p => ({ ...p, descripcion: e.target.value }))}
              className={ic} placeholder="Descripción del rol y sus responsabilidades"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permisos</label>
            <div className="grid grid-cols-1 gap-2">
              {PERMISOS_DISPONIBLES.map(p => (
                <label key={p.key} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={rolFormData.permisos.includes(p.key)}
                    onChange={() => togglePermiso(p.key)}
                    className="w-4 h-4 text-[#00a6d6] rounded border-gray-300 focus:ring-[#00a6d6]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={() => closeRolModal(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">
              Cancelar
            </button>
            <button type="submit"
              className="bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg transition-colors text-sm">
              {editingRol ? 'Actualizar Rol' : 'Crear Rol'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Rol */}
      <Modal isOpen={showDeleteRolModal} onClose={() => setShowDeleteRolModal(false)} title="Eliminar Rol" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que querés eliminar el rol <strong className="text-gray-900 dark:text-white">{rolToDelete?.nombre}</strong>?
            Los usuarios con este rol podrían perder sus permisos.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowDeleteRolModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">
              Cancelar
            </button>
            <button onClick={confirmDeleteRol}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors text-sm">
              Eliminar Rol
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Tipo de Componente */}
      <Modal
        isOpen={showTipoCompModal}
        onClose={() => {
          // X: NO limpiar draft
          setShowTipoCompModal(false);
          setEditingTipoComp(null);
        }}
        title={editingTipoComp ? 'Editar Tipo de Componente' : 'Nuevo Tipo de Componente'}
        size="md"
      >
        <form onSubmit={async e => {
          e.preventDefault(); setSaving(true);
          try {
            if (editingTipoComp) {
              await updateTipoComponente(editingTipoComp.id, tipoCompForm);
              setTiposComponente(prev =>
                prev.map(t => t.id === editingTipoComp.id ? { ...t, nombre: tipoCompForm } : t)
                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
              );
              toast.success('Tipo de componente actualizado');
              addLog(`Tipo de componente "${tipoCompForm}" actualizado`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
            } else {
              const created = await createTipoComponente(tipoCompForm);
              setTiposComponente(prev => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
              toast.success('Tipo de componente creado');
              addLog(`Tipo de componente "${tipoCompForm}" creado`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
            }
            setShowTipoCompModal(false);
            clearTipoCompFormPersistence(); // ← Limpiar draft al guardar
            setEditingTipoComp(null);
          } catch { toast.error('Error al guardar'); }
          finally { setSaving(false); }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <ClearableInput type="text" required value={tipoCompForm} onChange={e => setTipoCompForm(e.target.value)}
              className={ic} placeholder="Ej: Procesador" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                if (!editingTipoComp) clearTipoCompFormPersistence(); // ← Cancelar limpia el draft
                setShowTipoCompModal(false);
                setEditingTipoComp(null);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">Cancelar</button>
            <button type="submit" disabled={saving}
              className="bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? (editingTipoComp ? 'Actualizando...' : 'Creando...') : (editingTipoComp ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Tipo de Componente */}
      <Modal isOpen={showDeleteTipoCompModal} onClose={() => setShowDeleteTipoCompModal(false)} title="Eliminar Tipo de Componente" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que querés eliminar <strong className="text-gray-900 dark:text-white">{tipoCompToDelete?.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowDeleteTipoCompModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">Cancelar</button>
            <button onClick={async () => {
              if (!tipoCompToDelete) return; setSaving(true);
              try {
                await deleteTipoComponente(tipoCompToDelete.id);
                setTiposComponente(prev => prev.filter(t => t.id !== tipoCompToDelete.id));
                toast.success('Tipo de componente eliminado');
                addLog(`Tipo de componente "${tipoCompToDelete.nombre}" eliminado`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
                setShowDeleteTipoCompModal(false); setTipoCompToDelete(null);
              } catch (err: any) { toast.error(err?.message ?? 'Error al eliminar'); }
              finally { setSaving(false); }
            }} disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Marca */}
      <Modal
        isOpen={showMarcaModal}
        onClose={() => {
          // X: NO limpiar draft
          setShowMarcaModal(false);
          setEditingMarca(null);
        }}
        title={editingMarca ? 'Editar Marca' : 'Nueva Marca'}
        size="md"
      >
        <form onSubmit={async e => {
          e.preventDefault(); setSaving(true);
          try {
            if (editingMarca) {
              await updateMarca(editingMarca.id, marcaForm);
              setMarcas(prev => prev.map(m => m.id === editingMarca.id ? { ...m, nombre: marcaForm } : m).sort((a, b) => a.nombre.localeCompare(b.nombre)));
              toast.success('Marca actualizada');
              addLog(`Marca "${marcaForm}" actualizada`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
            } else {
              const created = await createMarca(marcaForm);
              setMarcas(prev => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
              toast.success('Marca creada');
              addLog(`Marca "${marcaForm}" creada`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
            }
            setShowMarcaModal(false);
            clearMarcaFormPersistence(); // ← Limpiar draft al guardar
            setEditingMarca(null);
          } catch { toast.error('Error al guardar'); }
          finally { setSaving(false); }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de la Marca <span className="text-red-500">*</span>
            </label>
            <ClearableInput type="text" required value={marcaForm} onChange={e => setMarcaForm(e.target.value)}
              className={ic} placeholder="Ej: Samsung" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                if (!editingMarca) clearMarcaFormPersistence(); // ← Cancelar limpia el draft
                setShowMarcaModal(false);
                setEditingMarca(null);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">Cancelar</button>
            <button type="submit" disabled={saving}
              className="bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? (editingMarca ? 'Actualizando...' : 'Creando...') : (editingMarca ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Marca */}
      <Modal isOpen={showDeleteMarcaModal} onClose={() => setShowDeleteMarcaModal(false)} title="Eliminar Marca" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que querés eliminar la marca <strong className="text-gray-900 dark:text-white">{marcaToDelete?.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowDeleteMarcaModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">Cancelar</button>
            <button onClick={async () => {
              if (!marcaToDelete) return; setSaving(true);
              try {
                await deleteMarca(marcaToDelete.id);
                setMarcas(prev => prev.filter(m => m.id !== marcaToDelete.id));
                toast.success('Marca eliminada');
                addLog(`Marca "${marcaToDelete.nombre}" eliminada`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
                setShowDeleteMarcaModal(false); setMarcaToDelete(null);
              } catch (err: any) { toast.error(err?.message ?? 'Error al eliminar'); }
              finally { setSaving(false); }
            }} disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Proveedor */}
      <Modal
        isOpen={showProveedorModal}
        onClose={() => {
          // X: NO limpiar draft
          setShowProveedorModal(false);
          setEditingProveedor(null);
        }}
        title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        size="md"
      >
        <form onSubmit={async e => {
          e.preventDefault(); setSaving(true);
          try {
            if (editingProveedor) {
              await updateProveedor(editingProveedor.id, proveedorForm);
              setProveedores(prev => prev.map(p => p.id === editingProveedor.id ? { ...p, ...proveedorForm } : p).sort((a, b) => a.nombre.localeCompare(b.nombre)));
              toast.success('Proveedor actualizado');
              addLog(`Proveedor "${proveedorForm.nombre}" actualizado`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
            } else {
              const created = await createProveedor(proveedorForm);
              setProveedores(prev => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
              toast.success('Proveedor creado');
              addLog(`Proveedor "${proveedorForm.nombre}" creado`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
            }
            setShowProveedorModal(false);
            clearProveedorFormPersistence(); // ← Limpiar draft al guardar
            setEditingProveedor(null);
          } catch { toast.error('Error al guardar'); }
          finally { setSaving(false); }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del Proveedor <span className="text-red-500">*</span>
            </label>
            <ClearableInput type="text" required value={proveedorForm.nombre} onChange={e => setProveedorForm(p => ({ ...p, nombre: e.target.value }))}
              className={ic} placeholder="Ej: TechSupply SA" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contacto / Email</label>
            <ClearableInput type="text" value={proveedorForm.contacto} onChange={e => setProveedorForm(p => ({ ...p, contacto: e.target.value }))}
              className={ic} placeholder="ventas@proveedor.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Phone size={13} className="text-[#00a6d6]" />
                Teléfono
              </span>
            </label>
            <ClearableInput
              type="tel"
              value={proveedorForm.telefono}
              onChange={e => setProveedorForm(p => ({ ...p, telefono: e.target.value }))}
              className={ic}
              placeholder="Ej: 011 4321-5678 / 0800-999-0000"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                if (!editingProveedor) clearProveedorFormPersistence(); // ← Cancelar limpia el draft
                setShowProveedorModal(false);
                setEditingProveedor(null);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">Cancelar</button>
            <button type="submit" disabled={saving}
              className="bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? (editingProveedor ? 'Actualizando...' : 'Creando...') : (editingProveedor ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Proveedor */}
      <Modal isOpen={showDeleteProveedorModal} onClose={() => setShowDeleteProveedorModal(false)} title="Eliminar Proveedor" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que querés eliminar a <strong className="text-gray-900 dark:text-white">{proveedorToDelete?.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowDeleteProveedorModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">Cancelar</button>
            <button onClick={async () => {
              if (!proveedorToDelete) return; setSaving(true);
              try {
                await deleteProveedor(proveedorToDelete.id);
                setProveedores(prev => prev.filter(p => p.id !== proveedorToDelete.id));
                toast.success('Proveedor eliminado');
                addLog(`Proveedor "${proveedorToDelete.nombre}" eliminado`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
                setShowDeleteProveedorModal(false); setProveedorToDelete(null);
              } catch (err: any) { toast.error(err?.message ?? 'Error al eliminar'); }
              finally { setSaving(false); }
            }} disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Área */}
      <Modal
        isOpen={showAreaModal}
        onClose={() => {
          // X: NO limpiar draft
          setShowAreaModal(false);
          setEditingArea(null);
        }}
        title={editingArea ? 'Editar Área' : 'Nueva Área'}
        size="md"
      >
        <form onSubmit={async e => {
          e.preventDefault(); setSaving(true);
          try {
            if (editingArea) {
              await updateArea(editingArea.id, areaForm);
              setAreas(prev => prev.map(a => a.id === editingArea.id ? { ...a, nombre: areaForm } : a).sort((a, b) => a.nombre.localeCompare(b.nombre)));
              toast.success('Área actualizada');
              addLog(`Área "${areaForm}" actualizada`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
            } else {
              const created = await createArea(areaForm);
              setAreas(prev => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
              toast.success('Área creada');
              addLog(`Área "${areaForm}" creada`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
            }
            setShowAreaModal(false);
            clearAreaFormPersistence(); // ← Limpiar draft al guardar
            setEditingArea(null);
          } catch { toast.error('Error al guardar'); }
          finally { setSaving(false); }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del Área <span className="text-red-500">*</span>
            </label>
            <ClearableInput type="text" required value={areaForm} onChange={e => setAreaForm(e.target.value)}
              className={ic} placeholder="Ej: IT, Matemáticas, Administración..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                if (!editingArea) clearAreaFormPersistence(); // ← Cancelar limpia el draft
                setShowAreaModal(false);
                setEditingArea(null);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">Cancelar</button>
            <button type="submit" disabled={saving}
              className="bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? (editingArea ? 'Actualizando...' : 'Creando...') : (editingArea ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Área */}
      <Modal isOpen={showDeleteAreaModal} onClose={() => setShowDeleteAreaModal(false)} title="Eliminar Área" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que querés eliminar el área <strong className="text-gray-900 dark:text-white">{areaToDelete?.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowDeleteAreaModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">Cancelar</button>
            <button onClick={async () => {
              if (!areaToDelete) return; setSaving(true);
              try {
                await deleteArea(areaToDelete.id);
                setAreas(prev => prev.filter(a => a.id !== areaToDelete.id));
                toast.success('Área eliminada');
                addLog(`Área "${areaToDelete.nombre}" eliminada`, 'Administración', usuario?.nombre ?? 'Sistema', usuario?.rol ?? '');
                setShowDeleteAreaModal(false); setAreaToDelete(null);
              } catch { toast.error('Error al eliminar'); }
              finally { setSaving(false); }
            }} disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Limpiar Logs */}
      <Modal isOpen={showClearLogsModal} onClose={() => setShowClearLogsModal(false)} title="Limpiar Historial de Logs" size="md">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Esta acción eliminará <strong>todo el historial de logs</strong> del sistema de forma permanente. No se puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowClearLogsModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm">
              Cancelar
            </button>
            <button onClick={async () => {
              try {
                await clearLogs();
                setLogs([]);
                setShowClearLogsModal(false);
                toast.success('Historial de logs limpiado');
              } catch {
                toast.error('Error al limpiar los logs');
              }
            }}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors text-sm">
              Limpiar Todo
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
