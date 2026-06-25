import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { getStockMovimientos, getStock, createStockMovimiento } from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { toast } from 'sonner@2.0.3';

export default function StockMovimientos() {
  const navigate = useNavigate();
  const { hasPermission, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    itemId: '',
    tipo: 'entrada' as 'entrada' | 'salida' | 'ajuste',
    cantidad: 1,
    motivo: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [movimientosData, stockData] = await Promise.all([
        getStockMovimientos(),
        getStock(),
      ]);
      setMovimientos(movimientosData);
      setStockItems(stockData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'cantidad' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const item = stockItems.find(s => s.id === formData.itemId);
      if (!item) {
        toast.error('Seleccione un ítem válido');
        return;
      }

      await createStockMovimiento({
        ...formData,
        itemNombre: item.nombre,
      });

      toast.success('Movimiento registrado correctamente');
      setShowModal(false);
      setFormData({
        itemId: '',
        tipo: 'entrada',
        cantidad: 1,
        motivo: '',
      });
      await loadData();
    } catch (error) {
      console.error('Error creating movement:', error);
      toast.error('Error al registrar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <TrendingUp className="text-green-600" size={18} />;
      case 'salida':
        return <TrendingDown className="text-red-600" size={18} />;
      case 'ajuste':
        return <RefreshCw className="text-blue-600" size={18} />;
      default:
        return null;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'Entrada';
      case 'salida':
        return 'Salida';
      case 'ajuste':
        return 'Ajuste';
      default:
        return tipo;
    }
  };

  if (authLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasPermission('stock')) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/stock')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="dark:text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movimientos de Stock</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Historial de entradas, salidas y ajustes</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Nuevo Movimiento</span>
        </button>
      </div>

      {/* Movimientos List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ítem</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cantidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Motivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : (
                movimientos.map(mov => (
                  <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(mov.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(mov.tipo)}
                        <span className="text-sm font-medium dark:text-white">{getTipoLabel(mov.tipo)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {mov.itemNombre}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        mov.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 
                        mov.tipo === 'salida' ? 'text-red-600 dark:text-red-400' : 
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {mov.tipo === 'entrada' ? '+' : mov.tipo === 'salida' ? '-' : '±'}{mov.cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {mov.motivo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {mov.usuario}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Nuevo Movimiento */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar Movimiento de Stock"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ítem <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={stockItems.map(item => ({
                value: item.id,
                label: `${item.nombre} (Stock actual: ${item.cantidad})`,
              }))}
              value={formData.itemId}
              onChange={v => setFormData(prev => ({ ...prev, itemId: v }))}
              placeholder="Seleccionar ítem..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Movimiento <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={[
                { value: 'entrada', label: 'Entrada (Agregar stock)' },
                { value: 'salida', label: 'Salida (Reducir stock)' },
                { value: 'ajuste', label: 'Ajuste (Corrección)' },
              ]}
              value={formData.tipo}
              onChange={v => setFormData(prev => ({ ...prev, tipo: v as any }))}
              placeholder="Seleccionar tipo..."
              noClear
            />
          </div>

          <div>
            <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cantidad <span className="text-red-500">*</span>
            </label>
            <input
              id="cantidad"
              name="cantidad"
              type="number"
              min="1"
              required
              value={formData.cantidad}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="motivo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              id="motivo"
              name="motivo"
              required
              rows={3}
              value={formData.motivo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Compra a proveedor, Usado en reparación, Corrección de inventario..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}