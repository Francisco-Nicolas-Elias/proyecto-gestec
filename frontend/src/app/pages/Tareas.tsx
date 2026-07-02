import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { getTareas, updateTaskStatus } from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import KanbanCard from '../components/KanbanCard';
import LoadingSpinner from '../components/LoadingSpinner';
import TareaDetalleModal from '../components/TareaDetalleModal';
import { toast } from 'sonner@2.0.3';

export default function Tareas() {
  const navigate = useNavigate();
  const { hasPermission, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tareas, setTareas] = useState<any[]>([]);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<any | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const tareasData = await getTareas();
      setTareas(tareasData);
    } catch (error) {
      console.error('Error loading tareas:', error);
    } finally {
      setLoading(false);
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

  if (authLoading) return <div className="p-6"><LoadingSpinner /></div>;

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
          onClick={() => navigate('/tareas/nueva')}
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
          className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 min-h-[200px] lg:min-h-[500px]">
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
          className="bg-[#e6f7fc] dark:bg-[#004d63]/10 rounded-xl p-4 min-h-[200px] lg:min-h-[500px]">
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
          className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 min-h-[200px] lg:min-h-[500px]">
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

    </div>
  );
}