import React, { useState, useEffect } from 'react';
import { X, QrCode, User, Save, Loader2, Pencil } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import ClearableInput from './ClearableInput';
import QrScannerModal from './QrScannerModal';
import {
  getCurrentUser,
  getUbicaciones,
  getTiposComponente,
  getMarcas,
  getProveedores,
  updateComponente,
  type Componente,
} from '../services/apiClient';
import { toast } from 'sonner@2.0.3';

interface EditarComponenteModalProps {
  isOpen: boolean;
  componente: Componente | null;
  onClose: () => void;
  onUpdated: (componente: Componente) => void;
}

export default function EditarComponenteModal({
  isOpen, componente, onClose, onUpdated,
}: EditarComponenteModalProps) {
  const usuario = getCurrentUser();

  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [tiposComponente, setTiposComponente] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  const [form, setForm] = useState({
    idManual: '',
    ubicacion: '',
    tipoComponente: '',
    numeroSerie: '',
    marca: '',
    modelo: '',
    proveedor: '',
    capacidad: '',
  });

  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!isOpen || !componente) return;
    setLoadingCatalogos(true);

    Promise.all([getUbicaciones(), getTiposComponente(), getMarcas(), getProveedores()])
      .then(([ubs, tipos, mks, provs]) => {
        setUbicaciones(ubs);
        setTiposComponente(tipos.map(t => t.nombre));
        setMarcas(mks.map(m => m.nombre));
        setProveedores(provs.map(p => p.nombre));
      })
      .finally(() => setLoadingCatalogos(false));

    // Pre-cargar datos del componente
    setForm({
      idManual: componente.idManual,
      ubicacion: componente.ubicacion,
      tipoComponente: componente.tipoComponente,
      numeroSerie: componente.numeroSerie,
      marca: componente.marca,
      modelo: componente.modelo,
      proveedor: componente.proveedor,
      capacidad: componente.capacidad ?? '',
    });
  }, [isOpen, componente]);

  const isFormValid =
    form.idManual.trim() !== '' &&
    form.ubicacion !== '' &&
    form.tipoComponente !== '' &&
    form.numeroSerie.trim() !== '' &&
    form.marca !== '' &&
    form.modelo.trim() !== '' &&
    form.proveedor !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !componente) return;
    setSaving(true);
    try {
      const actualizado = await updateComponente(componente.id, {
        idManual: form.idManual.trim(),
        ubicacion: form.ubicacion,
        tipoComponente: form.tipoComponente,
        numeroSerie: form.numeroSerie.trim(),
        marca: form.marca,
        modelo: form.modelo.trim(),
        proveedor: form.proveedor,
        responsable: usuario?.nombre || componente.responsable,
        capacidad: form.capacidad.trim() || undefined,
      });
      toast.success(`Componente "${actualizado.idManual}" actualizado correctamente`);
      onUpdated(actualizado);
      onClose();
    } catch {
      toast.error('Error al actualizar el componente');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !componente) return null;

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-6">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Pencil size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Editar Componente
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ID: <span className="font-mono text-[#00a6d6]">{componente.idManual}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Body */}
          {loadingCatalogos ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Cargando catálogos...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* Fila 1: ID Manual + N° Serie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID Manual <span className="text-red-500">*</span>
                  </label>
                  <ClearableInput
                    type="text"
                    value={form.idManual}
                    onChange={e => setForm(f => ({ ...f, idManual: e.target.value }))}
                    placeholder="Ej: RAM-001"
                    className={inputClass}
                  />
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
                </div>
              </div>

              {/* Fila 2: Componente + Ubicación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Componente <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={tiposComponente}
                    value={form.tipoComponente}
                    onChange={v => setForm(f => ({ ...f, tipoComponente: v }))}
                    placeholder="Seleccionar tipo..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ubicación <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={ubicaciones}
                    value={form.ubicacion}
                    onChange={v => setForm(f => ({ ...f, ubicacion: v }))}
                    placeholder="Seleccionar ubicación..."
                  />
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Cambiar la ubicación registrará un movimiento en el historial.
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

              {/* Capacidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Proveedor */}
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
                </div>
              </div>

              {/* Responsable (readonly) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsable de la edición
                </label>
                <div className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  <User size={15} className="text-gray-400 flex-shrink-0" />
                  <span>{usuario?.nombre || '—'}</span>
                  {usuario?.area && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      · {usuario.area}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Autocompletado con el usuario logueado.
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="text-red-500">*</span> Todos los campos son obligatorios
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid || saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                    ) : (
                      <><Save size={15} /> Guardar cambios</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      <QrScannerModal
        isOpen={showQr}
        onClose={() => setShowQr(false)}
        onScan={value => {
          setForm(f => ({ ...f, numeroSerie: value }));
          toast.success(`QR escaneado: ${value}`);
        }}
      />
    </>
  );
}