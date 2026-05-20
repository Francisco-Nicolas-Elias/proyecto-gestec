import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Send, User, MapPin, Calendar, AlertCircle,
  Paperclip, Pencil, Trash2, Check, X, Monitor,
} from 'lucide-react';
import {
  getTicketById, updateTicketStatus, addComentario, getUsuarios,
  updateTicketAdjuntos, updateTicket, deleteTicket,
  getUbicaciones, getActivos,
} from '../services/apiClient';
import { type Adjunto } from '../components/MultimediaUpload';
import MultimediaUpload from '../components/MultimediaUpload';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../components/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'sonner@2.0.3';

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed';

const tiposProblema = [
  'Falla de hardware', 'Problema de software', 'Conectividad',
  'Impresión', 'Pantalla/Display', 'Teclado/Mouse', 'Audio', 'Otro',
];

export default function TicketDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [comentario, setComentario] = useState('');
  const [esInterno, setEsInterno] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Adjuntos
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [savingAdjuntos, setSavingAdjuntos] = useState(false);

  // Edición
  const [editMode, setEditMode] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editForm, setEditForm] = useState({
    descripcion: '',
    tipo: '',
    ubicacion: '',
    activoId: '',
    activoCodigo: '',
    prioridad: '' as '' | 'baja' | 'media' | 'alta' | 'urgente',
  });
  const [ubicacionesEdit, setUbicacionesEdit] = useState<string[]>([]);
  const [activosEdit, setActivosEdit] = useState<any[]>([]);

  // Eliminación
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const isOperations = hasPermission('tickets_gestion');

  // Solo admins y operadores pueden modificar la prioridad
  const canEditPrioridad = usuario?.rol === 'administrador' || usuario?.rol === 'operaciones';

  // Activos filtrados por la ubicación elegida en el formulario de edición
  const activosFiltradosEdit = activosEdit.filter(a => a.sector === editForm.ubicacion);

  // Permiso para editar/eliminar: creador del ticket o administrador
  const canEditDelete = usuario?.email === ticket?.creadorEmail || usuario?.rol === 'administrador';

  useEffect(() => {
    if (id) loadTicketData();
  }, [id]);

  // Cargar catálogos cuando se activa el modo edición
  useEffect(() => {
    if (!editMode) return;
    Promise.all([getUbicaciones(), getActivos()])
      .then(([ubs, acts]) => {
        setUbicacionesEdit(ubs);
        setActivosEdit(acts);
      })
      .catch(() => {});
  }, [editMode]);

  const loadTicketData = async () => {
    try {
      const [ticketData, usuariosData] = await Promise.all([
        getTicketById(id!),
        isOperations ? getUsuarios() : Promise.resolve([]),
      ]);

      if (!ticketData) {
        toast.error('Ticket no encontrado');
        navigate('/tickets');
        return;
      }

      setTicket(ticketData);
      setAdjuntos(ticketData.adjuntos || []);
      if (isOperations) {
        setUsuarios(usuariosData.filter((u: any) => u.rol === 'operaciones' || u.rol === 'administrador'));
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
      toast.error('Error al cargar el ticket');
    } finally {
      setLoading(false);
    }
  };

  // ── Adjuntos ──
  const handleAdjuntosChange = async (nuevosAdjuntos: Adjunto[]) => {
    const prev = adjuntos;
    setAdjuntos(nuevosAdjuntos);
    setSavingAdjuntos(true);
    try {
      await updateTicketAdjuntos(id!, nuevosAdjuntos);
      toast.success(nuevosAdjuntos.length < prev.length ? 'Archivo eliminado' : 'Archivo agregado');
    } catch {
      toast.error('Error al actualizar los archivos adjuntos');
    } finally {
      setSavingAdjuntos(false);
    }
  };

  // ── Edición ──
  const handleStartEdit = () => {
    setEditForm({
      descripcion: ticket.descripcion,
      tipo: ticket.tipo,
      ubicacion: ticket.ubicacion,
      activoId: ticket.activoId || '',
      activoCodigo: ticket.activo || '',
      prioridad: (ticket.prioridad as '' | 'baja' | 'media' | 'alta' | 'urgente') || '',
    });
    setConfirmDelete(false);
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleGuardar = async () => {
    if (!editForm.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }
    if (!editForm.ubicacion) {
      toast.error('La ubicación es obligatoria');
      return;
    }
    if (!editForm.activoId) {
      toast.error('Seleccioná el equipo con el problema');
      return;
    }
    setGuardando(true);
    try {
      const activoSeleccionado = activosEdit.find(a => a.id === editForm.activoId);
      const actualizado = await updateTicket(id!, {
        descripcion: editForm.descripcion.trim(),
        tipo: editForm.tipo,
        ubicacion: editForm.ubicacion,
        activoId: editForm.activoId || undefined,
        activo: activoSeleccionado?.codigo || editForm.activoCodigo || undefined,
        prioridad: (editForm.prioridad as 'baja' | 'media' | 'alta' | 'urgente') || null,
      });
      setTicket({ ...actualizado, comentarios: ticket.comentarios });
      setEditMode(false);
      toast.success('Reporte actualizado correctamente');
    } catch {
      toast.error('Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  // Al cambiar ubicación en edición, resetear activo
  const handleEditUbicacionChange = (value: string) => {
    setEditForm(p => ({ ...p, ubicacion: value, activoId: '', activoCodigo: '' }));
  };

  // ── Eliminación ──
  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await deleteTicket(id!);
      toast.success('Reporte eliminado');
      navigate('/tickets');
    } catch {
      toast.error('Error al eliminar el reporte');
      setEliminando(false);
    }
  };

  // ── Estado / Asignación ──
  const handleChangeStatus = async (nuevoEstado: string) => {
    try {
      await updateTicketStatus(id!, nuevoEstado as any);
      await loadTicketData();
      toast.success('Estado actualizado');
    } catch {
      toast.error('Error al actualizar el estado');
    }
  };

  const handleAsignar = async (asignadoId: string) => {
    try {
      const asignado = usuarios.find((u: any) => u.id === asignadoId);
      const updated = await updateTicketStatus(id!, ticket.estado, asignado?.nombre);
      setTicket({ ...updated, comentarios: ticket.comentarios });
      toast.success(asignado ? `Asignado a ${asignado.nombre}` : 'Asignación removida');
    } catch {
      toast.error('Error al asignar el ticket');
    }
  };

  // ── Comentarios ──
  const handleEnviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await addComentario(id!, comentario, esInterno);
      await loadTicketData();
      setComentario('');
      setEsInterno(false);
      toast.success('Comentario agregado');
    } catch {
      toast.error('Error al agregar el comentario');
    } finally {
      setEnviandoComentario(false);
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  if (!ticket) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={24} className="dark:text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{ticket.nro}</span>
            <StatusBadge status={ticket.estado} type="ticket" />
            <StatusBadge status={ticket.prioridad} type="prioridad" />
          </div>
          {!editMode && (
            <>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{ticket.descripcion}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.tipo}</p>
            </>
          )}
          {editMode && (
            <p className="text-sm font-semibold text-[#00a6d6]">Editando reporte</p>
          )}
        </div>

        {/* Botones editar / eliminar (solo para creador o admin) */}
        {canEditDelete && !confirmDelete && !editMode && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleStartEdit}
              title="Editar reporte"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
            >
              <Pencil size={17} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              title="Eliminar reporte"
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            >
              <Trash2 size={17} />
            </button>
          </div>
        )}
        {editMode && (
          <button
            onClick={handleCancelEdit}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 shrink-0"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Confirmación de eliminación */}
      {confirmDelete && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg shrink-0">
              <Trash2 size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">¿Eliminar este reporte?</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                Esta acción no se puede deshacer. Se eliminará el reporte <strong>{ticket.nro}</strong> permanentemente.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={eliminando}
              className="px-3 py-1.5 text-sm border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleEliminar}
              disabled={eliminando}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── MODO EDICIÓN ── */}
          {editMode ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h3 className="font-semibold dark:text-white">Editar Reporte</h3>

              {/* Ubicación */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Ubicación <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={ubicacionesEdit}
                  value={editForm.ubicacion}
                  onChange={handleEditUbicacionChange}
                  placeholder="Seleccioná una ubicación..."
                />
              </div>

              {/* Equipo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Monitor size={12} /> Equipo <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={activosFiltradosEdit.map(a => ({
                    value: a.id,
                    label: `${a.codigo} — ${a.marca} ${a.modelo}`,
                  }))}
                  value={editForm.activoId}
                  onChange={v => {
                    const act = activosEdit.find((a: any) => a.id === v);
                    setEditForm(p => ({ ...p, activoId: v, activoCodigo: act?.codigo || '' }));
                  }}
                  placeholder={
                    !editForm.ubicacion
                      ? 'Primero seleccioná una ubicación...'
                      : activosFiltradosEdit.length === 0
                        ? 'No hay equipos en esta ubicación'
                        : 'Seleccioná el equipo...'
                  }
                  disabled={!editForm.ubicacion}
                />
              </div>

              {/* Tipo + Prioridad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Tipo de problema
                  </label>
                  <SearchableSelect
                    options={tiposProblema}
                    value={editForm.tipo}
                    onChange={v => setEditForm(p => ({ ...p, tipo: v }))}
                    placeholder="Seleccionar..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Prioridad
                  </label>
                  {canEditPrioridad ? (
                    <SearchableSelect
                      options={[
                        { value: 'baja', label: 'Baja' },
                        { value: 'media', label: 'Media' },
                        { value: 'alta', label: 'Alta' },
                        { value: 'urgente', label: 'Urgente' },
                      ]}
                      value={editForm.prioridad}
                      onChange={v => setEditForm(p => ({ ...p, prioridad: v as any }))}
                      placeholder="Seleccionar..."
                      noClear
                    />
                  ) : (
                    <div className="pt-1 space-y-1">
                      <StatusBadge status={editForm.prioridad} type="prioridad" />
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Solo administradores y operadores pueden modificarla.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={editForm.descripcion}
                  onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCancelEdit}
                  disabled={guardando}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#00a6d6] hover:bg-[#0095c0] text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check size={14} />
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>

          ) : (
            /* ── MODO VISTA — Info Card ── */
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-4 dark:text-white">Información del Reporte</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="text-gray-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Reportado por</p>
                    <p className="font-medium dark:text-white">{ticket.creador}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.creadorEmail}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Ubicación</p>
                    <p className="font-medium dark:text-white">{ticket.ubicacion}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="text-gray-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Fecha de creación</p>
                    <p className="font-medium dark:text-white">{formatDate(ticket.fechaCreacion)}</p>
                  </div>
                </div>

                {ticket.activo && (
                  <div className="flex items-start gap-3">
                    <Monitor className="text-gray-400 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Equipo relacionado</p>
                      <button
                        onClick={() => navigate(`/activos/${ticket.activoId}`)}
                        className="font-medium text-[#00a6d6] hover:text-[#0095c0] dark:text-[#00c4f0]"
                      >
                        {ticket.activo}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Archivos Adjuntos ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold dark:text-white flex items-center gap-2">
                <Paperclip size={16} className="text-gray-500 dark:text-gray-400" />
                Archivos adjuntos
                {adjuntos.length > 0 && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {adjuntos.length}
                  </span>
                )}
              </h3>
              {savingAdjuntos && (
                <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">Guardando...</span>
              )}
            </div>
            <MultimediaUpload
              adjuntos={adjuntos}
              onChange={handleAdjuntosChange}
              maxFiles={8}
            />
          </div>

          {/* ── Timeline / Comentarios ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4 dark:text-white">Historial</h3>

            <div className="space-y-4">
              {/* Comentario inicial */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00a6d6]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-[#00a6d6]">
                    {ticket.creador.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm dark:text-white">{ticket.creador}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(ticket.fechaCreacion)}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{ticket.descripcion}</p>
                  </div>
                </div>
              </div>

              {/* Comentarios */}
              {ticket.comentarios.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {c.autor.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className={`rounded-lg p-4 ${c.esInterno
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-gray-50 dark:bg-gray-700'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm dark:text-white">{c.autor}</span>
                          {c.esInterno && (
                            <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                              Interno
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(c.fecha)}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{c.texto}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nuevo comentario */}
            <form onSubmit={handleEnviarComentario} className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribí un comentario..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                {isOperations && (
                  <label className="flex items-center gap-2 text-sm dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={esInterno}
                      onChange={(e) => setEsInterno(e.target.checked)}
                      className="rounded"
                    />
                    <span>Comentario interno (no visible para el usuario)</span>
                  </label>
                )}
                <div className={!isOperations ? 'w-full' : ''}>
                  <button
                    type="submit"
                    disabled={!comentario.trim() || enviandoComentario}
                    className={`flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${!isOperations ? 'w-full justify-center' : ''}`}
                  >
                    <Send size={18} />
                    {enviandoComentario ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ── Sidebar — Solo Operaciones ── */}
        {isOperations && (
          <div className="space-y-6">
            {/* Cambiar Estado */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-3 dark:text-white">Cambiar Estado</h3>
              <div className="space-y-2">
                {[
                  { value: 'nuevo', label: 'Nuevo' },
                  { value: 'en_progreso', label: 'En Progreso' },
                  { value: 'resuelto', label: 'Resuelto' },
                ].map(estado => (
                  <button
                    key={estado.value}
                    onClick={() => handleChangeStatus(estado.value)}
                    disabled={ticket.estado === estado.value}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${ticket.estado === estado.value
                      ? 'bg-[#00a6d6]/10 text-[#00a6d6] dark:text-[#00c4f0] font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    {estado.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asignar Técnico */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-3 dark:text-white">Asignar a</h3>
              <SearchableSelect
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...usuarios.map((u: any) => ({ value: u.id, label: u.nombre })),
                ]}
                value={usuarios.find((u: any) => u.nombre === ticket.asignado)?.id || ''}
                onChange={handleAsignar}
                placeholder="Sin asignar"
                noClear
              />
              {ticket.asignado && (
                <div className="mt-3 p-3 bg-[#00a6d6]/10 dark:bg-[#00a6d6]/10 rounded-lg">
                  <p className="text-xs text-[#00a6d6] font-medium">Asignado actualmente</p>
                  <p className="text-sm mt-1 dark:text-white">{ticket.asignado}</p>
                </div>
              )}
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-3 dark:text-white">Acciones Rápidas</h3>
              <div className="space-y-2">
                {ticket.estado === 'nuevo' && (
                  <button
                    onClick={() => handleChangeStatus('en_progreso')}
                    className="w-full text-left px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    ▶ Marcar en Progreso
                  </button>
                )}
                {ticket.estado === 'en_progreso' && (
                  <button
                    onClick={() => handleChangeStatus('resuelto')}
                    className="w-full text-left px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                  >
                    ✓ Marcar como Resuelto
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}