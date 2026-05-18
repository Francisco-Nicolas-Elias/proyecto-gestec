import React, { useEffect, useState } from 'react';
import { Plus, Check, ChevronDown, Paperclip } from 'lucide-react';
import { getTareas, createTarea, updateTaskStatus, getActivos, getUbicaciones, getUsuarios } from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import KanbanCard from '../components/KanbanCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import TareaDetalleModal from '../components/TareaDetalleModal';
import MultimediaUpload, { type Adjunto } from '../components/MultimediaUpload';
import SearchableSelect from '../components/SearchableSelect';
import DraftBanner from '../components/DraftBanner';
import { toast } from 'sonner@2.0.3';
import { useFormPersistence, hasPersistedData } from '../services/useFormPersistence';

const INITIAL_TAREA = {
  titulo: '',
  descripcion: '',
  prioridad: 'media' as 'baja' | 'media' | 'alta',
  fechaLimite: '',
  ubicacion: '',
  activoId: '',
  asignados: [] as string[],
  adjuntos: [] as Adjunto[],
};

export default function Tareas() {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tareas, setTareas] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activos, setActivos] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<any | null>(null);

  // Persistencia del formulario Nueva Tarea
  const [formData, setFormData, clearFormPersistence] = useFormPersistence(
    'gestec:tarea:new',
    INITIAL_TAREA,
  );
  const [showAsignadosDropdown, setShowAsignadosDropdown] = useState(false);

  // Detectar si hay borrador al abrir el modal
  const [hasDraftOnOpen, setHasDraftOnOpen] = useState(false);

  // Activos filtrados según la ubicación elegida en el formulario
  const activosFiltrados = formData.ubicacion
    ? activos.filter(a => a.ubicacion === formData.ubicacion)
    : [];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tareasData, activosData, ubicacionesData, usuariosData] = await Promise.all([
        getTareas(), getActivos(), getUbicaciones(), getUsuarios(),
      ]);
      setTareas(tareasData);
      setActivos(activosData);
      setUbicaciones(ubicacionesData);
      setUsuarios(usuariosData.filter((u: any) => u.rol === 'administrador' || u.rol === 'operaciones'));
    } catch (error) {
      console.error('Error loading tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleAsignado = (nombre: string) => {
    setFormData(prev => ({
      ...prev,
      asignados: prev.asignados.includes(nombre)
        ? prev.asignados.filter(n => n !== nombre)
        : [...prev.asignados, nombre],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const activo = formData.activoId ? activos.find(a => a.id === formData.activoId) : undefined;
      await createTarea({ ...formData, activoCodigo: activo?.codigo });
      toast.success('Tarea creada correctamente');
      setShowModal(false);
      clearFormPersistence(); // ← Limpiar draft al guardar con éxito
      setShowAsignadosDropdown(false);
      setHasDraftOnOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error creating tarea:', error);
      toast.error('Error al crear la tarea');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, tareaId: string) => {
    e.dataTransfer.setData('tareaId', tareaId);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = async (e: React.DragEvent, nuevoEstado: 'pendiente' | 'en_curso' | 'finalizada') => {
    e.preventDefault();
    const tareaId = e.dataTransfer.getData('tareaId');
    if (!tareaId) { toast.error('Error: ID de tarea no válido'); return; }
    const tareaExiste = tareas.find(t => t.id === tareaId);
    if (!tareaExiste) { toast.error('Error: Tarea no encontrada'); return; }
    try {
      await updateTaskStatus(tareaId, nuevoEstado);
      await loadData();
      toast.success('Estado actualizado');
    } catch {
      toast.error('Error al actualizar la tarea');
    }
  };

  const handleComentarioAgregado = (tareaId: string, comentario: any) => {
    setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, comentarios: [...(t.comentarios || []), comentario] } : t));
    if (tareaSeleccionada?.id === tareaId) {
      setTareaSeleccionada((prev: any) => ({ ...prev, comentarios: [...(prev.comentarios || []), comentario] }));
    }
  };

  const handleTareaActualizada = (tareaActualizada: any) => {
    setTareas(prev => prev.map(t => t.id === tareaActualizada.id ? tareaActualizada : t));
    setTareaSeleccionada(tareaActualizada);
  };

  const handleTareaEliminada = (tareaId: string) => {
    setTareas(prev => prev.filter(t => t.id !== tareaId));
    setTareaSeleccionada(null);
  };

  const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');
  const tareasEnCurso = tareas.filter(t => t.estado === 'en_curso');
  const tareasFinalizadas = tareas.filter(t => t.estado === 'finalizada');

  if (!hasPermission('tareas')) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  const selectClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent';

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tablero de Tareas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'} en total
          </p>
        </div>
        <button
          onClick={() => {
            setHasDraftOnOpen(hasPersistedData('gestec:tarea:new'));
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{tareasPendientes.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pendientes</div>
        </div>
        <div className="bg-[#e6f7fc] dark:bg-[#004d63]/20 rounded-lg border-2 border-[#b3e7f7] dark:border-[#004d63]/40 p-4 text-center">
          <div className="text-2xl font-bold text-[#007a9e] dark:text-[#00c8f0]">{tareasEnCurso.length}</div>
          <div className="text-sm text-[#007a9e] dark:text-[#00a6d6] mt-1">En Curso</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800 p-4 text-center">
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{tareasFinalizadas.length}</div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-1">Finalizadas</div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pendientes */}
        <div onDragOver={handleDragOver} onDrop={e => handleDrop(e, 'pendiente')}
          className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Pendientes</h3>
            <span className="text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">{tareasPendientes.length}</span>
          </div>
          <div className="space-y-3">
            {tareasPendientes.map(tarea => (
              <div key={tarea.id} draggable onDragStart={e => handleDragStart(e, tarea.id)}>
                <KanbanCard tarea={tarea} onClick={() => setTareaSeleccionada(tarea)} />
              </div>
            ))}
            {tareasPendientes.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No hay tareas pendientes</p>}
          </div>
        </div>

        {/* En Curso */}
        <div onDragOver={handleDragOver} onDrop={e => handleDrop(e, 'en_curso')}
          className="bg-[#e6f7fc] dark:bg-[#004d63]/10 rounded-xl p-4 min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#007a9e] dark:text-[#00c8f0]">En Curso</h3>
            <span className="text-sm bg-[#b3e7f7] dark:bg-[#004d63]/40 text-[#007a9e] dark:text-[#00c8f0] px-2 py-1 rounded">{tareasEnCurso.length}</span>
          </div>
          <div className="space-y-3">
            {tareasEnCurso.map(tarea => (
              <div key={tarea.id} draggable onDragStart={e => handleDragStart(e, tarea.id)}>
                <KanbanCard tarea={tarea} onClick={() => setTareaSeleccionada(tarea)} />
              </div>
            ))}
            {tareasEnCurso.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No hay tareas en curso</p>}
          </div>
        </div>

        {/* Finalizadas */}
        <div onDragOver={handleDragOver} onDrop={e => handleDrop(e, 'finalizada')}
          className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-green-900 dark:text-green-300">Finalizadas</h3>
            <span className="text-sm bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded">{tareasFinalizadas.length}</span>
          </div>
          <div className="space-y-3">
            {tareasFinalizadas.map(tarea => (
              <div key={tarea.id} draggable onDragStart={e => handleDragStart(e, tarea.id)}>
                <KanbanCard tarea={tarea} onClick={() => setTareaSeleccionada(tarea)} />
              </div>
            ))}
            {tareasFinalizadas.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No hay tareas finalizadas</p>}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-[#e6f7fc] dark:bg-[#004d63]/20 border border-[#b3e7f7] dark:border-[#004d63]/40 rounded-lg p-4">
        <p className="text-sm text-[#007a9e] dark:text-[#00c8f0]">
          <strong>Tip:</strong> Arrastrá las tarjetas entre columnas para cambiar su estado. También podés hacer clic en una tarea para ver más detalles.
        </p>
      </div>

      {/* Modal Detalle */}
      {tareaSeleccionada && (
        <TareaDetalleModal
          tarea={tareaSeleccionada}
          onClose={() => setTareaSeleccionada(null)}
          onComentarioAgregado={handleComentarioAgregado}
          onTareaActualizada={handleTareaActualizada}
          onTareaEliminada={handleTareaEliminada}
        />
      )}

      {/* Modal Nueva Tarea */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          // Cerrar con X: mantener draft (NO limpiar)
          setShowModal(false);
          setShowAsignadosDropdown(false);
        }}
        title="Nueva Tarea"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Draft Banner dentro del modal */}
          <DraftBanner
            show={hasDraftOnOpen}
            onDiscard={() => { clearFormPersistence(); setHasDraftOnOpen(false); }}
          />

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input id="titulo" name="titulo" type="text" required value={formData.titulo}
              onChange={handleChange} className={selectClass}
              placeholder="Ej: Instalar Windows en nuevas PCs" />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea id="descripcion" name="descripcion" required rows={3} value={formData.descripcion}
              onChange={handleChange} className={selectClass}
              placeholder="Describe la tarea con el mayor detalle posible..." />
          </div>

          {/* Prioridad + Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioridad <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: 'baja', label: 'Baja' },
                  { value: 'media', label: 'Media' },
                  { value: 'alta', label: 'Alta' },
                ]}
                value={formData.prioridad}
                onChange={v => setFormData(prev => ({ ...prev, prioridad: v as any }))}
                placeholder="Seleccionar..."
                noClear
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Límite</label>
              <input id="fechaLimite" name="fechaLimite" type="date" value={formData.fechaLimite}
                onChange={handleChange} className={selectClass} />
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
            <SearchableSelect
              options={ubicaciones}
              value={formData.ubicacion}
              onChange={v => setFormData(prev => ({ ...prev, ubicacion: v, activoId: '' }))}
              placeholder="Seleccionar..."
            />
          </div>

          {/* Activo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Equipo Relacionado <span className="text-xs text-gray-400">(opcional)</span>
            </label>
            <SearchableSelect
              options={
                formData.ubicacion
                  ? [
                      { value: '', label: 'Ninguno' },
                      ...activosFiltrados.map(a => ({ value: a.id, label: `${a.codigo} — ${a.marca} ${a.modelo}` })),
                    ]
                  : [{ value: '', label: 'Ninguno' }]
              }
              value={formData.activoId}
              onChange={v => setFormData(prev => ({ ...prev, activoId: v }))}
              placeholder={!formData.ubicacion ? 'Seleccioná una ubicación primero' : 'Ninguno'}
              disabled={!formData.ubicacion}
              noClear
            />
            {/* Mensajes de ayuda contextual */}
            {!formData.ubicacion && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <span>Seleccioná primero una ubicación para ver los equipos disponibles.</span>
              </p>
            )}
            {formData.ubicacion && activosFiltrados.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                No hay equipos registrados en esta ubicación.
              </p>
            )}
            {formData.ubicacion && activosFiltrados.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {activosFiltrados.length} equipo{activosFiltrados.length !== 1 ? 's' : ''} disponible{activosFiltrados.length !== 1 ? 's' : ''} en esta ubicación.
              </p>
            )}
          </div>

          {/* Responsables — multi-select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsables</label>
            <div className="relative">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowAsignadosDropdown(v => !v)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowAsignadosDropdown(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:border-[#00a6d6] transition-colors cursor-pointer select-none"
              >
                <span className="flex flex-wrap gap-1.5 flex-1 text-left text-sm min-h-[24px]">
                  {formData.asignados.length === 0 ? (
                    <span className="text-gray-400 dark:text-gray-500">Sin asignar</span>
                  ) : (
                    formData.asignados.map(n => (
                      <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e6f7fc] dark:bg-[#004d63]/30 text-[#007a9e] dark:text-[#00c8f0] text-xs">
                        {n}
                        <button type="button" onClick={e => { e.stopPropagation(); toggleAsignado(n); }}
                          className="hover:text-red-500 transition-colors leading-none">×</button>
                      </span>
                    ))
                  )}
                </span>
                <ChevronDown size={14} className="text-gray-400 ml-2 shrink-0" />
              </div>

              {showAsignadosDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {usuarios.map(u => {
                    const selected = formData.asignados.includes(u.nombre);
                    return (
                      <button key={u.id} type="button" onClick={() => toggleAsignado(u.nombre)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selected ? 'bg-[#e6f7fc] dark:bg-[#004d63]/20' : ''}`}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-[#00a6d6] border-[#00a6d6]' : 'border-gray-300 dark:border-gray-600'}`}>
                          {selected && <Check size={11} className="text-white" />}
                        </div>
                        <div>
                          <p className={`font-medium ${selected ? 'text-[#007a9e] dark:text-[#00c8f0]' : 'text-gray-900 dark:text-white'}`}>{u.nombre}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {u.rol === 'administrador' ? 'Administrador' : 'Operaciones'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
                    <button type="button" onClick={() => setShowAsignadosDropdown(false)}
                      className="text-xs text-[#00a6d6] hover:underline">
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Adjuntos multimedia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Paperclip size={14} />
              Archivos adjuntos
              <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </label>
            <MultimediaUpload
              adjuntos={formData.adjuntos}
              onChange={adj => setFormData(p => ({ ...p, adjuntos: adj }))}
              maxFiles={5}
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                clearFormPersistence(); // ← Limpiar draft al cancelar
                setShowModal(false);
                setShowAsignadosDropdown(false);
                setHasDraftOnOpen(false);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Creando...' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}