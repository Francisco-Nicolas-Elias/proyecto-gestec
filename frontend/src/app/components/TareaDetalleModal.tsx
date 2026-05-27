import { useEffect, useState, useRef } from 'react';
import {
  X, Calendar, MapPin, User, Monitor, Clock, MessageSquare, Send, AlertCircle,
  Pencil, Trash2, Check, ChevronDown, Paperclip, Users,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import MultimediaUpload, { type Adjunto } from './MultimediaUpload';
import SearchableSelect from './SearchableSelect';
import {
  addComentarioTarea, updateTarea, deleteTarea,
  getUbicaciones, getUsuarios,
  updateComentarioTarea, deleteComentarioTarea, getCurrentUser, getTareaById,
} from '../services/apiClient';
import { toast } from 'sonner@2.0.3';

interface Comentario {
  id: string;
  autor: string;
  fecha: string;
  texto: string;
  adjuntos?: Adjunto[];
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_curso' | 'finalizada';
  fechaLimite?: string;
  fechaCreacion: string;
  fechaInicio?: string;
  fechaFinalizacion?: string;
  ubicacion?: string;
  activoCodigo?: string;
  creadoPor: string;
  asignados?: string[];
  finalizadoPor?: string;
  comentarios: Comentario[];
  historial: { fecha: string; accion: string; usuario: string }[];
  adjuntos?: Adjunto[];
}

interface Props {
  tarea: Tarea;
  onClose: () => void;
  onComentarioAgregado: (tareaId: string, comentario: Comentario) => void;
  onTareaActualizada: (tarea: Tarea) => void;
  onTareaEliminada: (tareaId: string) => void;
}

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En Curso',
  finalizada: 'Finalizada',
};

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent';

export default function TareaDetalleModal({
  tarea, onClose, onComentarioAgregado, onTareaActualizada, onTareaEliminada,
}: Props) {
  const usuarioActual = getCurrentUser();

  // ── Comentarios ──
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [comentarioAdjuntos, setComentarioAdjuntos] = useState<Adjunto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [comentarios, setComentarios] = useState<Comentario[]>([...tarea.comentarios]);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ── Edición de comentarios ──
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);

  // ── Edición de tarea ──
  const [editMode, setEditMode] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    prioridad: tarea.prioridad,
    estado: tarea.estado,
    fechaLimite: tarea.fechaLimite || '',
    ubicacion: tarea.ubicacion || '',
    asignados: tarea.asignados || [],
    adjuntos: tarea.adjuntos || [] as Adjunto[],
  });
  const [showAsignadosDropdown, setShowAsignadosDropdown] = useState(false);

  // ── Eliminación ──
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // ── Datos reactivos ──
  const [datosTarea, setDatosTarea] = useState<Tarea>(tarea);

  // ── Catálogos ──
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [usuariosAsignables, setUsuariosAsignables] = useState<{ id: string; nombre: string; rol: string }[]>([]);

  useEffect(() => {
    if (!editMode) return;
    getUbicaciones().then(setUbicaciones).catch(() => {});
    getUsuarios()
      .then(users => setUsuariosAsignables(users.filter(u => u.rol === 'administrador' || u.rol === 'operaciones')))
      .catch(() => {});
  }, [editMode]);

  // Fetch completo al abrir el modal (la lista del Kanban no incluye comentarios ni adjuntos)
  useEffect(() => {
    getTareaById(tarea.id).then(full => {
      if (!full) return;
      setDatosTarea(full as Tarea);
      setComentarios((full as any).comentarios ?? []);
      setFormData({
        titulo: (full as any).titulo,
        descripcion: (full as any).descripcion,
        prioridad: (full as any).prioridad,
        estado: (full as any).estado,
        fechaLimite: (full as any).fechaLimite || '',
        ubicacion: (full as any).ubicacion || '',
        asignados: (full as any).asignados || [],
        adjuntos: (full as any).adjuntos || [],
      });
    }).catch(() => {});
  }, [tarea.id]);

  // Scroll al último comentario al agregar uno nuevo
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comentarios]);

  const formatDate = (dateString: string, withTime = false) => {
    let date: Date;
    if (!withTime && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateString);
    }
    return date.toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
  };

  const isOverdue = (() => {
    if (!datosTarea.fechaLimite || datosTarea.estado === 'finalizada') return false;
    const [y, m, d] = datosTarea.fechaLimite.split('-').map(Number);
    const limite = new Date(y, m - 1, d);
    const hoy = new Date();
    return limite < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  })();

  // ── Toggle asignado ──
  const toggleAsignado = (nombre: string) => {
    setFormData(prev => ({
      ...prev,
      asignados: prev.asignados.includes(nombre)
        ? prev.asignados.filter(n => n !== nombre)
        : [...prev.asignados, nombre],
    }));
  };

  // ── Comentarios handlers ──
  const handleEnviarComentario = async () => {
    const texto = nuevoComentario.trim();
    if (!texto && comentarioAdjuntos.length === 0) return;
    setEnviando(true);
    try {
      const comentario = await addComentarioTarea(datosTarea.id, texto, comentarioAdjuntos);
      const actualizados = [...comentarios, comentario];
      setComentarios(actualizados);
      onTareaActualizada({ ...datosTarea, comentarios: actualizados });
      setNuevoComentario('');
      setComentarioAdjuntos([]);
      toast.success('Comentario agregado');
    } catch {
      toast.error('Error al agregar el comentario');
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEnviarComentario();
  };

  const handleIniciarEdicionComentario = (c: Comentario) => {
    setEditingCommentId(c.id);
    setEditingCommentText(c.texto);
    setConfirmDeleteCommentId(null);
  };

  const handleGuardarComentarioEditado = async (comentarioId: string) => {
    const texto = editingCommentText.trim();
    if (!texto) return;
    setSavingComment(true);
    try {
      const actualizado = await updateComentarioTarea(datosTarea.id, comentarioId, texto);
      setComentarios(prev => prev.map(c => c.id === comentarioId ? { ...c, texto: actualizado.texto } : c));
      setEditingCommentId(null);
      toast.success('Comentario actualizado');
    } catch {
      toast.error('Error al actualizar el comentario');
    } finally {
      setSavingComment(false);
    }
  };

  const handleEliminarComentario = async (comentarioId: string) => {
    setDeletingCommentId(comentarioId);
    try {
      await deleteComentarioTarea(datosTarea.id, comentarioId);
      const filtrados = comentarios.filter(c => c.id !== comentarioId);
      setComentarios(filtrados);
      onTareaActualizada({ ...datosTarea, comentarios: filtrados });
      toast.success('Comentario eliminado');
    } catch {
      toast.error('Error al eliminar el comentario');
    } finally {
      setDeletingCommentId(null);
      setConfirmDeleteCommentId(null);
    }
  };

  // ── Edición handlers ──
  const handleCancelEdit = () => {
    setFormData({
      titulo: datosTarea.titulo,
      descripcion: datosTarea.descripcion,
      prioridad: datosTarea.prioridad,
      estado: datosTarea.estado,
      fechaLimite: datosTarea.fechaLimite || '',
      ubicacion: datosTarea.ubicacion || '',
      asignados: datosTarea.asignados || [],
      adjuntos: datosTarea.adjuntos || [],
    });
    setEditMode(false);
    setShowAsignadosDropdown(false);
  };

  const handleGuardar = async () => {
    if (!formData.titulo.trim() || !formData.descripcion.trim()) {
      toast.error('El título y la descripción son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      const actualizada = await updateTarea(datosTarea.id, {
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim(),
        prioridad: formData.prioridad,
        estado: formData.estado,
        fechaLimite: formData.fechaLimite || undefined,
        ubicacion: formData.ubicacion || undefined,
        asignados: formData.asignados,
        adjuntos: formData.adjuntos,
      });
      setDatosTarea({ ...actualizada, comentarios });
      onTareaActualizada({ ...actualizada, comentarios });
      setEditMode(false);
      setShowAsignadosDropdown(false);
      toast.success('Tarea actualizada correctamente');
    } catch {
      toast.error('Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await deleteTarea(datosTarea.id);
      onTareaEliminada(datosTarea.id);
      toast.success('Tarea eliminada');
      onClose();
    } catch {
      toast.error('Error al eliminar la tarea');
      setEliminando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={confirmDelete ? undefined : onClose}
      />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex-1 pr-4 min-w-0">
            {!editMode ? (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <StatusBadge status={datosTarea.prioridad} type="prioridad" />
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    datosTarea.estado === 'finalizada'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : datosTarea.estado === 'en_curso'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {estadoLabels[datosTarea.estado]}
                  </span>
                  {datosTarea.adjuntos && datosTarea.adjuntos.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      <Paperclip size={10} />
                      {datosTarea.adjuntos.length}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug truncate">
                  {datosTarea.titulo}
                </h2>
              </>
            ) : (
              <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">Editando tarea</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editMode && !confirmDelete && (
              <>
                <button onClick={() => setEditMode(true)} title="Editar"
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400">
                  <Pencil size={17} />
                </button>
                <button onClick={() => setConfirmDelete(true)} title="Eliminar"
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                  <Trash2 size={17} />
                </button>
              </>
            )}
            <button
              onClick={editMode ? handleCancelEdit : onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body: 2 columnas en desktop, apilado en móvil ── */}
        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row min-h-0">

          {/* ── IZQUIERDA: Detalle de la tarea ── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 min-w-0 max-h-[46vh] lg:max-h-none">

            {/* Confirmación de eliminación */}
            {confirmDelete && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg shrink-0">
                    <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">¿Eliminar esta tarea?</p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                      Esta acción no se puede deshacer. Se eliminará <strong>"{datosTarea.titulo}"</strong> permanentemente.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmDelete(false)} disabled={eliminando}
                    className="px-3 py-1.5 text-sm border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={handleEliminar} disabled={eliminando}
                    className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    <Trash2 size={13} />
                    {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}

            {/* ── MODO EDICIÓN ── */}
            {editMode ? (
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={formData.titulo}
                    onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))}
                    className={inputClass} />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={3} value={formData.descripcion}
                    onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))}
                    className={`${inputClass} resize-none`} />
                </div>

                {/* Prioridad + Estado */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Prioridad</label>
                    <SearchableSelect
                      options={[
                        { value: 'baja', label: 'Baja' },
                        { value: 'media', label: 'Media' },
                        { value: 'alta', label: 'Alta' },
                      ]}
                      value={formData.prioridad}
                      onChange={v => setFormData(p => ({ ...p, prioridad: v as any }))}
                      placeholder="Seleccionar..."
                      noClear
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Estado</label>
                    <SearchableSelect
                      options={[
                        { value: 'pendiente', label: 'Pendiente' },
                        { value: 'en_curso', label: 'En Curso' },
                        { value: 'finalizada', label: 'Finalizada' },
                      ]}
                      value={formData.estado}
                      onChange={v => setFormData(p => ({ ...p, estado: v as any }))}
                      placeholder="Seleccionar..."
                      noClear
                    />
                  </div>
                </div>

                {/* Fecha límite + Ubicación */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Fecha límite</label>
                    <input type="date" value={formData.fechaLimite}
                      onChange={e => setFormData(p => ({ ...p, fechaLimite: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Ubicación</label>
                    <SearchableSelect
                      options={[{ value: '', label: 'Sin ubicación' }, ...ubicaciones]}
                      value={formData.ubicacion}
                      onChange={v => setFormData(p => ({ ...p, ubicacion: v }))}
                      placeholder="Sin ubicación"
                      noClear
                    />
                  </div>
                </div>

                {/* Responsables */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Responsables
                  </label>
                  <div className="relative">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setShowAsignadosDropdown(v => !v)}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowAsignadosDropdown(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:border-cyan-400 transition-colors cursor-pointer select-none"
                    >
                      <span className="flex flex-wrap gap-1.5 flex-1 text-left">
                        {formData.asignados.length === 0 ? (
                          <span className="text-gray-400 dark:text-gray-500">Sin asignar</span>
                        ) : (
                          formData.asignados.map(n => (
                            <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs">
                              {n}
                              <button type="button" onClick={e => { e.stopPropagation(); toggleAsignado(n); }}
                                className="hover:text-red-500 transition-colors">×</button>
                            </span>
                          ))
                        )}
                      </span>
                      <ChevronDown size={14} className="text-gray-400 ml-2 shrink-0" />
                    </div>

                    {showAsignadosDropdown && (
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                        {usuariosAsignables.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
                        ) : (
                          usuariosAsignables.map(u => {
                            const selected = formData.asignados.includes(u.nombre);
                            return (
                              <button key={u.id} type="button"
                                onClick={() => toggleAsignado(u.nombre)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selected ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''}`}>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                  {selected && <Check size={11} className="text-white" />}
                                </div>
                                <div>
                                  <p className={`font-medium ${selected ? 'text-cyan-700 dark:text-cyan-300' : 'text-gray-900 dark:text-white'}`}>{u.nombre}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{u.rol.replace('_', ' ')}</p>
                                </div>
                              </button>
                            );
                          })
                        )}
                        <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
                          <button type="button" onClick={() => setShowAsignadosDropdown(false)}
                            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline">
                            Cerrar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Adjuntos de la tarea */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Paperclip size={12} />
                    Archivos adjuntos
                  </label>
                  <MultimediaUpload
                    adjuntos={formData.adjuntos}
                    onChange={adj => setFormData(p => ({ ...p, adjuntos: adj }))}
                    maxFiles={5}
                  />
                </div>

                {/* Guardar / Cancelar */}
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={handleCancelEdit} disabled={guardando}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={handleGuardar} disabled={guardando}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50">
                    <Check size={14} />
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>

            ) : (
              /* ── MODO VISTA ── */
              <>
                {/* Descripción */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Descripción</h3>
                  <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{datosTarea.descripcion}</p>
                </div>

                {/* Alerta plazo vencido */}
                {isOverdue && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                    <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300 font-medium">Esta tarea tiene el plazo vencido</span>
                  </div>
                )}

                {/* Grid de datos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
                      <Calendar size={15} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de creación</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{formatDate(datosTarea.fechaCreacion, true)}</p>
                    </div>
                  </div>

                  {datosTarea.fechaLimite && (
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <Calendar size={15} className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fecha límite</p>
                        <p className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-800 dark:text-gray-200'}`}>
                          {formatDate(datosTarea.fechaLimite)}{isOverdue ? ' · Plazo vencido' : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {datosTarea.fechaInicio && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0">
                        <Clock size={15} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Inicio</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{formatDate(datosTarea.fechaInicio, true)}</p>
                      </div>
                    </div>
                  )}

                  {datosTarea.fechaFinalizacion && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg shrink-0">
                        <Clock size={15} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Finalización</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{formatDate(datosTarea.fechaFinalizacion, true)}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
                      <User size={15} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Creado por</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{datosTarea.creadoPor}</p>
                    </div>
                  </div>

                  {datosTarea.ubicacion && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
                        <MapPin size={15} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ubicación</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{datosTarea.ubicacion}</p>
                      </div>
                    </div>
                  )}

                  {datosTarea.activoCodigo && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
                        <Monitor size={15} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Equipo relacionado</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{datosTarea.activoCodigo}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Responsables */}
                {datosTarea.asignados && datosTarea.asignados.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Users size={13} />
                      Responsables ({datosTarea.asignados.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {datosTarea.asignados.map(nombre => (
                        <span key={nombre}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-sm text-cyan-700 dark:text-cyan-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-400 dark:bg-cyan-600 flex items-center justify-center text-white shrink-0"
                            style={{ fontSize: '9px', fontWeight: 700 }}>
                            {nombre.charAt(0).toUpperCase()}
                          </div>
                          {nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adjuntos de la tarea (vista) */}
                {datosTarea.adjuntos && datosTarea.adjuntos.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Paperclip size={13} />
                      Archivos adjuntos ({datosTarea.adjuntos.length})
                    </h3>
                    <MultimediaUpload
                      adjuntos={datosTarea.adjuntos}
                      onChange={() => {}}
                      readOnly
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── DERECHA: Panel de Comentarios ── */}
          <div className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 flex flex-col min-h-0 max-h-[48vh] lg:max-h-none">

            {/* Encabezado comentarios */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50/70 dark:bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <MessageSquare size={15} className="text-cyan-500" />
                Comentarios
                {comentarios.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs font-bold">
                    {comentarios.length}
                  </span>
                )}
              </h3>
            </div>

            {/* Lista de comentarios — scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {comentarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <MessageSquare size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                    Sin comentarios aún.<br />¡Sé el primero en comentar!
                  </p>
                </div>
              ) : (
                comentarios.map((c, idx) => (
                  <div
                    key={`${c.id}-${idx}`}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm space-y-2"
                  >
                    {/* Autor + Fecha */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white shrink-0"
                          style={{ fontSize: '11px', fontWeight: 700 }}
                        >
                          {c.autor.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.autor}</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatDate(c.fecha, true)}</span>
                    </div>

                    {/* Texto o input de edición */}
                    {editingCommentId === c.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={e => setEditingCommentText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleGuardarComentarioEditado(c.id)}
                            disabled={!editingCommentText.trim() || savingComment}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-md text-xs transition-colors"
                          >
                            <Check size={11} />
                            {savingComment ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {c.texto && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{c.texto}</p>
                        )}
                        {/* Adjuntos del comentario */}
                        {c.adjuntos && c.adjuntos.length > 0 && (
                          <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
                            <MultimediaUpload
                              adjuntos={c.adjuntos}
                              onChange={() => {}}
                              readOnly
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Acciones (editar/eliminar, solo propios) */}
                    {c.autor === usuarioActual?.nombre && editingCommentId !== c.id && (
                      <div className="flex items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => handleIniciarEdicionComentario(c)}
                          title="Editar comentario"
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCommentId(c.id)}
                          title="Eliminar comentario"
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Confirmación de eliminar comentario */}
                    {confirmDeleteCommentId === c.id && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-red-800 dark:text-red-300">¿Eliminar este comentario?</p>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setConfirmDeleteCommentId(null)}
                            disabled={deletingCommentId !== null}
                            className="px-2.5 py-1 text-xs border border-red-200 rounded-md text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleEliminarComentario(c.id)}
                            disabled={deletingCommentId !== null}
                            className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <Trash2 size={11} />
                            {deletingCommentId === c.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* ── Compositor de comentario ── */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-3 shrink-0 bg-gray-50/60 dark:bg-gray-800/40 space-y-2">
              {/* Textarea */}
              <textarea
                value={nuevoComentario}
                onChange={e => setNuevoComentario(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí un comentario…"
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              />

              {/* Adjuntos del comentario en curso (archivo / voz) */}
              <MultimediaUpload
                adjuntos={comentarioAdjuntos}
                onChange={setComentarioAdjuntos}
                maxFiles={3}
              />

              {/* Fila de envío */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">Ctrl+Enter para enviar</span>
                <button
                  onClick={handleEnviarComentario}
                  disabled={(!nuevoComentario.trim() && comentarioAdjuntos.length === 0) || enviando}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg text-sm transition-colors ml-auto"
                >
                  <Send size={13} />
                  {enviando ? 'Enviando…' : 'Comentar'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
