import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Check, ChevronDown, Paperclip } from 'lucide-react';
import { createTarea, getActivos, getUbicaciones, getUsuarios } from '../services/apiClient';
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

const selectClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent';

export default function NuevaTareaForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [activos, setActivos] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showAsignadosDropdown, setShowAsignadosDropdown] = useState(false);

  const [formData, setFormData, clearFormPersistence] = useFormPersistence(
    'gestec:tarea:new',
    INITIAL_TAREA,
  );

  const hasDraftOnMount = hasPersistedData('gestec:tarea:new');

  const activosFiltrados = formData.ubicacion
    ? activos.filter(a => a.sector === formData.ubicacion)
    : [];

  useEffect(() => {
    Promise.all([getActivos(), getUbicaciones(), getUsuarios()]).then(
      ([activosData, ubicacionesData, usuariosData]) => {
        setActivos(activosData);
        setUbicaciones(ubicacionesData);
        setUsuarios(
          usuariosData.filter(
            (u: any) => u.rol === 'administrador' || u.rol === 'operaciones',
          ),
        );
      },
    );
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
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
      clearFormPersistence();
      navigate('/tareas');
    } catch {
      toast.error('Error al crear la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tareas')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="dark:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nueva Tarea</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Completá el formulario para crear una tarea en el tablero
          </p>
        </div>
      </div>

      {/* Draft Banner */}
      <DraftBanner
        show={hasDraftOnMount}
        onDiscard={() => clearFormPersistence()}
      />

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            name="titulo"
            type="text"
            required
            value={formData.titulo}
            onChange={handleChange}
            className={selectClass}
            placeholder="Ej: Instalar Windows en nuevas PCs"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            name="descripcion"
            required
            rows={4}
            value={formData.descripcion}
            onChange={handleChange}
            className={`${selectClass} resize-none`}
            placeholder="Describí la tarea con el mayor detalle posible..."
          />
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
              noSort
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Límite
            </label>
            <input
              name="fechaLimite"
              type="date"
              value={formData.fechaLimite}
              onChange={handleChange}
              className={selectClass}
            />
          </div>
        </div>

        {/* Ubicación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ubicación
          </label>
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
                    ...activosFiltrados.map(a => ({
                      value: a.id,
                      label: `${a.codigo} — ${a.marca} ${a.modelo}`,
                    })),
                  ]
                : [{ value: '', label: 'Ninguno' }]
            }
            value={formData.activoId}
            onChange={v => setFormData(prev => ({ ...prev, activoId: v }))}
            placeholder={!formData.ubicacion ? 'Seleccioná una ubicación primero' : 'Ninguno'}
            disabled={!formData.ubicacion}
            noClear
          />
          {!formData.ubicacion && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Seleccioná primero una ubicación para ver los equipos disponibles.
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

        {/* Responsables */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Responsables
          </label>
          <div className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowAsignadosDropdown(v => !v)}
              onKeyDown={e =>
                (e.key === 'Enter' || e.key === ' ') && setShowAsignadosDropdown(v => !v)
              }
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:border-[#00a6d6] transition-colors cursor-pointer select-none"
            >
              <span className="flex flex-wrap gap-1.5 flex-1 text-left text-sm min-h-[24px]">
                {formData.asignados.length === 0 ? (
                  <span className="text-gray-400 dark:text-gray-500">Sin asignar</span>
                ) : (
                  formData.asignados.map(n => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e6f7fc] dark:bg-[#004d63]/30 text-[#007a9e] dark:text-[#00c8f0] text-xs"
                    >
                      {n}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          toggleAsignado(n);
                        }}
                        className="hover:text-red-500 transition-colors leading-none"
                      >
                        ×
                      </button>
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
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAsignado(u.nombre)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selected ? 'bg-[#e6f7fc] dark:bg-[#004d63]/20' : ''}`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-[#00a6d6] border-[#00a6d6]' : 'border-gray-300 dark:border-gray-600'}`}
                      >
                        {selected && <Check size={11} className="text-white" />}
                      </div>
                      <div>
                        <p className={`font-medium ${selected ? 'text-[#007a9e] dark:text-[#00c8f0]' : 'text-gray-900 dark:text-white'}`}>
                          {u.nombre}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {u.rol === 'administrador' ? 'Administrador' : 'Operaciones'}
                        </p>
                      </div>
                    </button>
                  );
                })}
                <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setShowAsignadosDropdown(false)}
                    className="text-xs text-[#00a6d6] hover:underline"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Adjuntos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
            <Paperclip size={14} />
            Archivos adjuntos
            <span className="text-xs text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
            <MultimediaUpload
              adjuntos={formData.adjuntos}
              onChange={adj => setFormData(p => ({ ...p, adjuntos: adj }))}
              maxFiles={5}
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              clearFormPersistence();
              navigate('/tareas');
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
            {saving ? 'Creando...' : 'Crear Tarea'}
          </button>
        </div>
      </form>
    </div>
  );
}
