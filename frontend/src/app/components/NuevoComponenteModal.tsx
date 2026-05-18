import React, { useState, useEffect } from 'react';
import { X, QrCode, User, Calendar, Save, Loader2 } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import QrScannerModal from './QrScannerModal';
import {
  getCurrentUser,
  getUbicaciones,
  getTiposComponente,
  getMarcas,
  getProveedores,
  createComponente,
  type Componente,
} from '../services/apiClient';
import { toast } from 'sonner@2.0.3';

interface NuevoComponenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (componente: Componente) => void;
}

const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const formatDateDisplay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

export default function NuevoComponenteModal({ isOpen, onClose, onCreated }: NuevoComponenteModalProps) {
  const usuario = getCurrentUser();

  // Catálogos
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [tiposComponente, setTiposComponente] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // Formulario
  const [form, setForm] = useState({
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

  // Cargar catálogos al abrir
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCatalogos(true);

    Promise.all([
      getUbicaciones(),
      getTiposComponente(),
      getMarcas(),
      getProveedores(),
    ]).then(([ubs, tipos, mks, provs]) => {
      setUbicaciones(ubs);
      setTiposComponente(tipos.map(t => t.nombre));
      setMarcas(mks.map(m => m.nombre));
      setProveedores(provs.map(p => p.nombre));
    }).finally(() => setLoadingCatalogos(false));

    // Reset form al abrir
    setForm({
      idManual: '',
      ubicacion: 'Depósito IT',
      tipoComponente: '',
      numeroSerie: '',
      marca: '',
      modelo: '',
      proveedor: '',
      capacidad: '',
    });
  }, [isOpen]);

  const isFormValid =
    form.idManual.trim() !== '' &&
    form.tipoComponente !== '' &&
    form.numeroSerie.trim() !== '' &&
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
      onCreated(nuevo);
      onClose();
    } catch {
      toast.error('Error al guardar el componente');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-6">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Nuevo Componente</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Complete todos los campos para registrar el componente
              </p>
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
                {/* ID Manual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID Manual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.idManual}
                    onChange={e => setForm(f => ({ ...f, idManual: e.target.value }))}
                    placeholder="Ej: RAM-001"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Identificador visible. Compatible con registros Excel anteriores.
                  </p>
                </div>

                {/* N° de Serie + Escanear QR */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número de Serie <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.numeroSerie}
                      onChange={e => setForm(f => ({ ...f, numeroSerie: e.target.value }))}
                      placeholder="Ej: SN12345678"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Ingrese manualmente o escanee el código QR.
                  </p>
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

                {/* Capacidad — campo libre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacidad
                  </label>
                  <input
                    type="text"
                    value={form.capacidad}
                    onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))}
                    placeholder="Ej: 8GB, 16GB, 480GB, 1TB"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                  <input
                    type="text"
                    value={form.modelo}
                    onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                    placeholder="Ej: ValueRAM 16GB DDR5"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Fila 4: Proveedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Administrable desde Administración &rsaquo; Proveedores
                  </p>
                </div>
              </div>

              {/* Fila 5: Fecha (readonly) */}
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

                {/* Responsable (readonly) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Responsable
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                    <User size={15} className="text-gray-400 flex-shrink-0" />
                    <span>{usuario?.nombre || '—'}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      {usuario?.area && `· ${usuario.area}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Autocompletado con el usuario logueado. No editable.
                  </p>
                </div>
              </div>

              {/* Info: ID interno */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-blue-500 text-sm mt-0.5">ℹ</span>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  El <strong>ID interno</strong> es generado automáticamente por el sistema y no es visible en el frontend.
                  El <strong>ID Manual</strong> es el único identificador visible para los usuarios.
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
            </form>
          )}
        </div>
      </div>

      {/* QR Scanner */}
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