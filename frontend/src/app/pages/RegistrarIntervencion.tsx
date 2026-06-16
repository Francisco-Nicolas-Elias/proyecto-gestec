import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { getActivoById, createIntervencion, getStock, createStockMovimiento } from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import ClearableInput from '../components/ClearableInput';
import DraftBanner from '../components/DraftBanner';
import { toast } from 'sonner@2.0.3';
import { useFormPersistence, hasPersistedData } from '../services/useFormPersistence';

// ── Clases de input reutilizables ─────────────────────────────────────────────
const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent';

const INIT_FORM = {
  tipo: '',
  diagnostico: '',
  accion: '',
  resultado: '',
  comentarios: '',
  tiempoEstimado: '',
  tiempoReal: '',
};

type FormData = typeof INIT_FORM;
type Repuesto = { itemId: string; itemNombre: string; cantidad: number };
const INIT_REPUESTOS: Repuesto[] = [];

export default function RegistrarIntervencion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activo, setActivo] = useState<any>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);

  // ── Persistencia del formulario ──────────────────────────────────────────
  // Se usa el ID del activo en la clave para que distintos activos no compartan draft
  const formKey     = `gestec:intervencion:${id ?? 'x'}:form`;
  const repuestosKey = `gestec:intervencion:${id ?? 'x'}:repuestos`;

  const [formData, setFormData, clearFormPersistence] = useFormPersistence<FormData>(formKey, INIT_FORM);
  const [repuestos, setRepuestos, clearRepuestosPersistence] = useFormPersistence<Repuesto[]>(repuestosKey, INIT_REPUESTOS);

  // Capturar si había draft ANTES del primer render (para el banner)
  const hadDraftRef = useRef(
    hasPersistedData(formKey) || hasPersistedData(repuestosKey),
  );

  const clearAll = () => {
    clearFormPersistence();
    clearRepuestosPersistence();
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [activoData, stockData] = await Promise.all([
        getActivoById(id!),
        getStock(),
      ]);

      if (!activoData) {
        toast.error('Equipo no encontrado');
        navigate('/activos');
        return;
      }

      setActivo(activoData);
      setStockItems(stockData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addRepuesto = () => {
    setRepuestos(prev => [...prev, { itemId: '', itemNombre: '', cantidad: 1 }]);
  };

  const updateRepuesto = (index: number, field: string, value: any) => {
    setRepuestos(prev => {
      const updated = [...prev];
      if (field === 'itemId') {
        const item = stockItems.find(s => s.id === value);
        updated[index] = { ...updated[index], itemId: value, itemNombre: item?.nombre || '' };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const removeRepuesto = (index: number) => {
    setRepuestos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const intervencion = await createIntervencion({
        activoId: id,
        fecha: new Date().toISOString().split('T')[0],
        tipo: formData.tipo,
        diagnostico: formData.diagnostico,
        accion: formData.accion,
        resultado: formData.resultado,
        comentarios: formData.comentarios,
        tecnico: usuario?.nombre || '',
        tiempoEstimado: formData.tiempoEstimado ? Number(formData.tiempoEstimado) : undefined,
        tiempoReal: formData.tiempoReal ? Number(formData.tiempoReal) : undefined,
        repuestos: repuestos.filter(r => r.itemId).map(r => ({ item: r.itemNombre, cantidad: r.cantidad })),
      });

      // Registrar movimientos de stock
      for (const repuesto of repuestos.filter(r => r.itemId)) {
        await createStockMovimiento({
          itemId: repuesto.itemId,
          itemNombre: repuesto.itemNombre,
          tipo: 'salida',
          cantidad: repuesto.cantidad,
          motivo: `Usado en intervención ${formData.tipo} - ${activo.codigo}`,
          referenciaIntervencion: intervencion.id,
        });
      }

      clearAll(); // ← Limpiar draft al guardar con éxito
      toast.success('Intervención registrada correctamente');
      navigate(`/activos/${id}`);
    } catch (error) {
      console.error('Error saving intervencion:', error);
      toast.error('Error al registrar la intervención');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activo) return null;

  const tiposIntervencion = [
    'Mantenimiento preventivo',
    'Mantenimiento correctivo',
    'Reparación',
    'Actualización de software',
    'Actualización de hardware',
    'Instalación',
    'Diagnóstico',
    'Otro',
  ];

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/activos/${id}`)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="dark:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registrar Intervención</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {activo.nroPc} — {activo.sector}
          </p>
        </div>
      </div>

      {/* Draft Banner */}
      <DraftBanner
        show={hadDraftRef.current}
        onDiscard={clearAll}
        message="Borrador recuperado — los datos de tu intervención anterior fueron restaurados automáticamente."
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">

        {/* Tipo y Diagnóstico */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Intervención <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={tiposIntervencion}
              value={formData.tipo}
              onChange={v => setFormData(prev => ({ ...prev, tipo: v }))}
              placeholder="Seleccionar..."
            />
          </div>

          <div>
            <label htmlFor="diagnostico" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Diagnóstico <span className="text-red-500">*</span>
            </label>
            <textarea
              id="diagnostico"
              name="diagnostico"
              required
              rows={3}
              value={formData.diagnostico}
              onChange={handleChange}
              className={inputClass}
              placeholder="Describa el problema o situación detectada..."
            />
          </div>

          <div>
            <label htmlFor="accion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Acción Realizada <span className="text-red-500">*</span>
            </label>
            <textarea
              id="accion"
              name="accion"
              required
              rows={3}
              value={formData.accion}
              onChange={handleChange}
              className={inputClass}
              placeholder="Describa las acciones realizadas para resolver el problema..."
            />
          </div>
        </div>

        {/* Repuestos Usados */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold dark:text-white">Repuestos Utilizados</h3>
            <button
              type="button"
              onClick={addRepuesto}
              className="flex items-center gap-1 text-sm text-[#00a6d6] hover:text-[#0095c0] transition-colors"
            >
              <Package size={16} />
              Agregar Repuesto
            </button>
          </div>

          {repuestos.length > 0 ? (
            <div className="space-y-3">
              {repuestos.map((repuesto, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <SearchableSelect
                      options={stockItems.map(item => ({
                        value: item.id,
                        label: `${item.nombre} (Disponible: ${item.cantidad})`,
                      }))}
                      value={repuesto.itemId}
                      onChange={v => updateRepuesto(index, 'itemId', v)}
                      placeholder="Seleccionar repuesto..."
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      value={repuesto.cantidad}
                      onChange={(e) => updateRepuesto(index, 'cantidad', Number(e.target.value))}
                      className={inputClass}
                      placeholder="Cant."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRepuesto(index)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              No se utilizaron repuestos en esta intervención
            </p>
          )}
        </div>

        {/* Tiempo y Resultado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tiempoEstimado" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tiempo Estimado (minutos)
            </label>
            <input
              id="tiempoEstimado"
              name="tiempoEstimado"
              type="number"
              min="0"
              value={formData.tiempoEstimado}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="tiempoReal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tiempo Real (minutos)
            </label>
            <input
              id="tiempoReal"
              name="tiempoReal"
              type="number"
              min="0"
              value={formData.tiempoReal}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="resultado" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resultado <span className="text-red-500">*</span>
            </label>
            <ClearableInput
              id="resultado"
              name="resultado"
              type="text"
              required
              value={formData.resultado}
              onChange={handleChange}
              className={inputClass}
              placeholder="Ej: Equipo funcionando correctamente, En espera de repuesto, etc."
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="comentarios" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comentarios Adicionales
            </label>
            <textarea
              id="comentarios"
              name="comentarios"
              rows={2}
              value={formData.comentarios}
              onChange={handleChange}
              className={inputClass}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        {/* Técnico */}
        <div className="bg-[#e6f7fc] dark:bg-[#004d63]/20 border border-[#b3e7f7] dark:border-[#004d63]/40 p-4 rounded-xl">
          <p className="text-sm text-[#005f80] dark:text-[#7dd6f0]">
            <span className="font-medium">Técnico:</span> {usuario?.nombre}
          </p>
          <p className="text-sm text-[#005f80] dark:text-[#7dd6f0] mt-0.5">
            <span className="font-medium">Fecha:</span>{' '}
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              clearAll(); // ← Limpiar draft al cancelar
              navigate(`/activos/${id}`);
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
            <Save size={18} />
            {saving ? 'Guardando...' : 'Registrar Intervención'}
          </button>
        </div>
      </form>
    </div>
  );
}
