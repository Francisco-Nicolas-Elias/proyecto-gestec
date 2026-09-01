import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../components/AuthContext';
import { ArrowLeft, QrCode, User, Calendar, Save, Loader2 } from 'lucide-react';
import { useFormPersistence } from '../services/useFormPersistence';
import SearchableSelect from '../components/SearchableSelect';
import ClearableInput from '../components/ClearableInput';
import QrScannerModal from '../components/QrScannerModal';
import {
  getCurrentUser,
  getUbicaciones,
  getTiposComponente,
  getMarcas,
  getProveedores,
  getComponentes,
  createComponente,
  buscarComponentePorSerie,
  type Componente,
} from '../services/apiClient';
import { toast } from 'sonner@2.0.3';

const today = () => new Date().toISOString().split('T')[0];

const formatDateDisplay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500';

export default function NuevoComponenteForm() {
  const navigate = useNavigate();
  const { hasPermission, loading: authLoading } = useAuth();
  const usuario = getCurrentUser();

  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [tiposComponente, setTiposComponente] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  const [form, setForm, clearFormPersistence] = useFormPersistence('gestec:stock:nuevo-componente', {
    idManual: '',
    ubicacion: 'Depósito IT',
    tipoComponente: '',
    numeroSerie: '',
    marca: '',
    modelo: '',
    proveedor: '',
    capacidad: '',
  });

  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [ultimoIdManual, setUltimoIdManual] = useState<string | null>(null);
  const [serieConflicto, setSerieConflicto] = useState<Componente | null>(null);
  const [serieChecking, setSerieChecking] = useState(false);

  useEffect(() => {
    if (!authLoading && !hasPermission('stock')) navigate('/stock', { replace: true });
  }, [authLoading]);

  useEffect(() => {
    Promise.all([
      getUbicaciones(),
      getTiposComponente(),
      getMarcas(),
      getProveedores(),
      getComponentes(),
    ]).then(([ubs, tipos, mks, provs, componentes]) => {
      setUbicaciones(ubs);
      setTiposComponente(tipos.map((t: any) => t.nombre));
      setMarcas(mks.map((m: any) => m.nombre));
      setProveedores(provs.map((p: any) => p.nombre));

      let maxNum = -1;
      let maxId: string | null = null;
      for (const c of componentes) {
        const match = /^IMP-(\d+)$/i.exec(c.idManual.trim());
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
            maxId = c.idManual.trim();
          }
        }
      }
      setUltimoIdManual(maxId);
      if (maxNum >= 0) {
        const nextId = `IMP-${String(maxNum + 1).padStart(4, '0')}`;
        setForm(f => ({ ...f, idManual: nextId }));
      }
    }).finally(() => setLoadingCatalogos(false));
  }, []);

  useEffect(() => {
    const serie = form.numeroSerie.trim();
    if (!serie) { setSerieConflicto(null); return; }
    setSerieChecking(true);
    const timer = setTimeout(async () => {
      try {
        const encontrado = await buscarComponentePorSerie(serie);
        setSerieConflicto(encontrado ?? null);
      } catch {
        setSerieConflicto(null);
      } finally {
        setSerieChecking(false);
      }
    }, 500);
    return () => { clearTimeout(timer); setSerieChecking(false); };
  }, [form.numeroSerie]);

  const isFormValid =
    form.idManual.trim() !== '' &&
    form.tipoComponente !== '' &&
    form.numeroSerie.trim() !== '' &&
    serieConflicto === null &&
    !serieChecking &&
    form.marca !== '' &&
    form.modelo.trim() !== '' &&
    form.proveedor !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setSaving(true);
    try {
      const nuevo = await createComponente({
        idManual: form.idManual.trim(),
        ubicacion: form.ubicacion,
        tipoComponente: form.tipoComponente,
        fecha: today(),
        responsable: usuario?.nombre || '',
        numeroSerie: form.numeroSerie.trim(),
        marca: form.marca,
        modelo: form.modelo.trim(),
        proveedor: form.proveedor,
        capacidad: form.capacidad.trim() || undefined,
      });
      toast.success(`Componente "${nuevo.idManual}" registrado correctamente`);
      clearFormPersistence();
      navigate('/stock');
    } catch {
      toast.error('Error al guardar el componente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/stock')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="dark:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nuevo Componente</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Completá todos los campos para registrar el componente
          </p>
        </div>
      </div>

      {loadingCatalogos ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Cargando catálogos...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">

          {/* Fila 1: ID Manual + N° Serie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID Manual <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono">
                {form.idManual || <span className="text-gray-400 dark:text-gray-500">Cargando...</span>}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Asignado automáticamente. No editable.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número de Serie <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <ClearableInput
                  type="text"
                  value={form.numeroSerie}
                  onChange={e => setForm(f => ({ ...f, numeroSerie: e.target.value }))}
                  placeholder="Ej: SN12345678"
                  wrapperClassName="flex-1"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  title="Escanear código QR"
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#00a6d6] text-white text-sm rounded-lg hover:bg-[#008bb8] transition-colors flex-shrink-0"
                >
                  <QrCode size={16} />
                  <span className="hidden sm:inline">QR</span>
                </button>
              </div>
              {serieChecking && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Verificando...</p>
              )}
              {!serieChecking && serieConflicto && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                  {serieConflicto.activoId
                    ? `Este N° de serie se encuentra asignado al equipo ${serieConflicto.ubicacion}.`
                    : 'Este N° de serie ya está registrado en el sistema (en depósito).'}
                </p>
              )}
              {!serieChecking && !serieConflicto && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Ingresá manualmente o escaneá el código QR.
                </p>
              )}
            </div>
          </div>

          {/* Fila 2: Componente + Capacidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Componente <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={tiposComponente}
                value={form.tipoComponente}
                onChange={v => setForm(f => ({ ...f, tipoComponente: v }))}
                placeholder="Seleccionar tipo..."
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Administrable desde Administración &rsaquo; Componentes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Capacidad
              </label>
              <ClearableInput
                type="text"
                value={form.capacidad}
                onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))}
                placeholder="Ej: 8GB, 16GB, 480GB, 1TB"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Aplicable a RAM, SSD, HDD y similares.
              </p>
            </div>
          </div>

          {/* Fila 3: Marca + Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Marca <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={marcas}
                value={form.marca}
                onChange={v => setForm(f => ({ ...f, marca: v }))}
                placeholder="Seleccionar marca..."
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Administrable desde Administración &rsaquo; Marcas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Modelo <span className="text-red-500">*</span>
              </label>
              <ClearableInput
                type="text"
                value={form.modelo}
                onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                placeholder="Ej: ValueRAM 16GB DDR5"
                className={inputClass}
              />
            </div>
          </div>

          {/* Fila 4: Proveedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={proveedores}
                value={form.proveedor}
                onChange={v => setForm(f => ({ ...f, proveedor: v }))}
                placeholder="Seleccionar proveedor..."
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Administrable desde Administración &rsaquo; Proveedores
              </p>
            </div>
          </div>

          {/* Fila 5: Fecha + Responsable (readonly) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha de alta
              </label>
              <div className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                <Calendar size={15} className="text-gray-400 flex-shrink-0" />
                <span>{formatDateDisplay(today())}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Autocompletada. No editable.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsable
              </label>
              <div className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                <User size={15} className="text-gray-400 flex-shrink-0" />
                <span>{usuario?.nombre || '—'}</span>
                {usuario?.area && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">· {usuario.area}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Autocompletado con el usuario logueado. No editable.
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <span className="text-blue-500 text-sm mt-0.5">ℹ</span>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              El <strong>ID interno</strong> es generado automáticamente por el sistema y no es visible en el frontend.
              El <strong>ID Manual</strong> es el único identificador visible para los usuarios.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            {serieConflicto && (
              <p className="text-xs text-red-600 dark:text-red-400 text-right">
                1 número de serie en conflicto — no se puede guardar.
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="text-red-500">*</span> Campos obligatorios
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { clearFormPersistence(); navigate('/stock'); }}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-[#00a6d6] text-white rounded-lg hover:bg-[#008bb8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                  ) : (
                    <><Save size={15} /> Registrar Componente</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <QrScannerModal
        isOpen={showQr}
        onClose={() => setShowQr(false)}
        onScan={value => {
          setForm(f => ({ ...f, numeroSerie: value }));
          toast.success(`QR escaneado: ${value}`);
        }}
      />
    </div>
  );
}
