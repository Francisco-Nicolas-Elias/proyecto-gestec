import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Send, Paperclip, Monitor } from 'lucide-react';
import { createTicket, getActivos, getUbicaciones } from '../services/apiClient';
import MultimediaUpload, { type Adjunto } from '../components/MultimediaUpload';
import SearchableSelect from '../components/SearchableSelect';
import DraftBanner from '../components/DraftBanner';
import { toast } from 'sonner@2.0.3';
import { useFormPersistence, hasPersistedData } from '../services/useFormPersistence';

const selectClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed';

const INITIAL_FORM = {
  activoId: '',
  ubicacion: '',
  tipo: '',
  descripcion: '',
};

const INITIAL_ADJUNTOS: Adjunto[] = [];

export default function CrearReporte() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [activos, setActivos] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);

  // Persistencia del formulario: sobrevive a la navegación entre pestañas
  const [formData, setFormData, clearFormPersistence] = useFormPersistence(
    'gestec:reporte:new',
    INITIAL_FORM,
  );
  // Los adjuntos usan URLs de objeto que sobreviven a la sesión SPA
  const [adjuntos, setAdjuntos, clearAdjuntosPersistence] = useFormPersistence(
    'gestec:reporte:adjuntos',
    INITIAL_ADJUNTOS,
  );

  // Capturar si había draft ANTES del primer render (para el banner)
  const hadDraftRef = useRef(
    hasPersistedData('gestec:reporte:new') || hasPersistedData('gestec:reporte:adjuntos'),
  );

  // Activos filtrados según la ubicación elegida
  const activosFiltrados = activos.filter(a => a.sector === formData.ubicacion);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [activosData, ubicacionesData] = await Promise.all([
        getActivos(),
        getUbicaciones(),
      ]);
      setActivos(activosData);
      setUbicaciones(ubicacionesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Al cambiar ubicación, resetear el equipo seleccionado
    if (name === 'ubicacion') {
      setFormData(prev => ({ ...prev, ubicacion: value, activoId: '' }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const clearAll = () => {
    clearFormPersistence();
    clearAdjuntosPersistence();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ubicacion) {
      toast.error('Seleccioná una ubicación');
      return;
    }
    if (!formData.activoId) {
      toast.error('Seleccioná el equipo con el problema');
      return;
    }

    setSaving(true);
    try {
      const activo = activos.find(a => a.id === formData.activoId);
      const ticketData: any = {
        ubicacion: formData.ubicacion,
        tipo: formData.tipo,
        descripcion: formData.descripcion,
        activoId: activo?.id,
        activo: activo?.codigo,
      };

      const ticket = await createTicket({ ...ticketData, adjuntos });
      toast.success('Reporte creado correctamente');
      clearAll(); // ← Limpiar draft al guardar con éxito
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Error al crear el ticket');
    } finally {
      setSaving(false);
    }
  };

  const tiposProblema = [
    'Falla de hardware',
    'Problema de software',
    'Conectividad',
    'Impresión',
    'Pantalla/Display',
    'Teclado/Mouse',
    'Audio',
    'Otro',
  ];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="dark:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reportar Falla o Problema</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Completá el formulario para que el equipo técnico pueda atender tu solicitud
          </p>
        </div>
      </div>

      {/* Draft Banner */}
      <DraftBanner show={hadDraftRef.current} onDiscard={clearAll} />

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">

        {/* Paso 1 — Ubicación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ubicación <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={ubicaciones}
            value={formData.ubicacion}
            onChange={v => {
              setFormData(prev => ({ ...prev, ubicacion: v, activoId: '' }));
            }}
            placeholder="Seleccioná dónde ocurre el problema..."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Indicá el lugar donde se encuentra el equipo o donde ocurre la falla.
          </p>
        </div>

        {/* Paso 2 — Equipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
            <Monitor size={15} />
            Equipo con el problema <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={activosFiltrados.map(a => ({
              value: a.id,
              label: `${a.codigo} — ${a.marca} ${a.modelo}`,
            }))}
            value={formData.activoId}
            onChange={v => setFormData(prev => ({ ...prev, activoId: v }))}
            placeholder={
              !formData.ubicacion
                ? 'Primero seleccioná una ubicación...'
                : activosFiltrados.length === 0
                  ? 'No hay equipos registrados en esta ubicación'
                  : 'Seleccioná el equipo...'
            }
            disabled={!formData.ubicacion || activosFiltrados.length === 0}
          />
          {formData.ubicacion && activosFiltrados.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              No se encontraron equipos registrados en esta ubicación. Contactá al equipo de soporte.
            </p>
          )}
          {formData.ubicacion && activosFiltrados.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activosFiltrados.length} equipo{activosFiltrados.length !== 1 ? 's' : ''} disponible{activosFiltrados.length !== 1 ? 's' : ''} en esta ubicación.
            </p>
          )}
        </div>

        {/* Tipo de Problema */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo de Problema <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={tiposProblema}
            value={formData.tipo}
            onChange={v => setFormData(prev => ({ ...prev, tipo: v }))}
            placeholder="Seleccionar..."
          />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descripción del Problema <span className="text-red-500">*</span>
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            required
            rows={5}
            value={formData.descripcion}
            onChange={handleChange}
            className={`${selectClass} resize-none`}
            placeholder="Describí con el mayor detalle posible el problema: qué estabas haciendo, qué mensaje de error apareció, desde cuándo sucede, etc."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Cuanto más detallado, más rápido podremos resolver el problema.
          </p>
        </div>

        {/* Adjuntos multimedia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <Paperclip size={15} />
            Archivos adjuntos
            <span className="text-xs text-gray-400 font-normal">(opcional — imagen, video o nota de voz)</span>
          </label>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
            <MultimediaUpload
              adjuntos={adjuntos}
              onChange={setAdjuntos}
              maxFiles={5}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Adjuntá capturas de pantalla, videos del problema o una nota de voz explicando la falla.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Importante:</strong> Una vez enviado el ticket, recibirás un número de seguimiento.
            El equipo técnico revisará tu solicitud y se pondrá en contacto contigo lo antes posible.
            Podés ver el estado de tu ticket en cualquier momento desde la sección "Mis Tickets".
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              clearAll(); // ← Limpiar draft al cancelar
              navigate('/tickets');
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
            <Send size={18} />
            {saving ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </div>
      </form>
    </div>
  );
}