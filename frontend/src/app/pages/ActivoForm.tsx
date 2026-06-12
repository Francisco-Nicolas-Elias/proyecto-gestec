import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Save, Monitor, HardDrive, Cpu, Wifi, Settings, Printer, MapPin, User, Plus, Trash2, Lock, CircuitBoard,
} from 'lucide-react';
import {
  getActivoById, createActivo, updateActivo, updateComponente,
  getSectores, getPisoForSector, buscarComponentePorSerie,
  type ModuloRAM, type ModuloAlmacenamiento,
} from '../services/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import { toast } from 'sonner@2.0.3';
import { useFormPersistence, hasPersistedData } from '../services/useFormPersistence';
import DraftBanner from '../components/DraftBanner';

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500';
const readonlyClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg cursor-default';

// ── Encriptación P AD ──────────────────────────────────────────────────────
// Formato original: 4 letras (a-j) + 4 dígitos (0-9) → Ej: caja1210
// Letras → números: a=0, b=1 … j=9
// Dígitos → letras: 0=a, 1=b … 9=j
// Resultado: números_transformados + letras_transformadas → Ej: 2090bcba
const encriptarPAD = (raw: string): string => {
  const letras = raw.slice(0, 4).toLowerCase().split('');
  const numeros = raw.slice(4, 8).split('');
  const numTransformados = letras.map(l => String(l.charCodeAt(0) - 97));
  const letrasTransformadas = numeros.map(n => String.fromCharCode(97 + parseInt(n)));
  return numTransformados.join('') + letrasTransformadas.join('');
};

const PAD_REGEX = /^[a-j]{4}[0-9]{4}$/;

const TIPO_BADGE: Record<string, string> = {
  'SSD': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'HDD': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'M.2': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const empty = {
  sector: '', piso: '', oficina: '', nroPc: '', usuario: '',
  microNroSerie: '', microMarca: '', microModelo: '',
  placaMadreNroSerie: '', placaMadreMarca: '', placaMadreModelo: '',
  ramModulos: [] as ModuloRAM[],
  ramTotal: '',
  almacenamientoModulos: [] as ModuloAlmacenamiento[],
  almacenamientoTotal: '',
  placaVideoNroSerie: '', placaVideoMarca: '', placaVideoModelo: '', placaVideoCapacidad: '',
  ip: '', mac: '', idAD: '', pAD: '',
  sistemaOperativo: '',
  impresoraNroSerie: '', impresoraMarca: '', impresoraModelo: '',
  observaciones: '',
  fechaCambioPC: '', fechaUltimoMantenimiento: '',
  estado: 'activa' as 'activa' | 'inactiva',
};

const ESTADO_OPTIONS = [
  { value: 'activa', label: 'Activo' },
  { value: 'inactiva', label: 'Inactivo' },
];

// ── Sub-componentes de layout ──────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
        <Icon size={18} className="text-[#00a6d6]" />
        <h3 className="font-semibold text-gray-800 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function ActivoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const storageKey = isEdit ? `gestec:activo:edit:${id}` : 'gestec:activo:new';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm, clearFormPersistence] = useFormPersistence(storageKey, empty);
  const [sectores, setSectores] = useState<string[]>([]);

  // P AD: input raw (nunca persiste) — se encripta al guardar
  const [pADInput, setPADInput] = useState('');
  const [pADError, setPADError] = useState('');

  const hadPersistedDataRef = useRef(hasPersistedData(storageKey));
  const showDraftBanner = !isEdit && hadPersistedDataRef.current;
  const originalGpuSerialRef = useRef<string>('');
  const originalMotherboardSerialRef = useRef<string>('');

  const inp = (field: keyof typeof empty) => (field === 'ramModulos' || field === 'almacenamientoModulos' ? {} : {
    value: form[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value })),
    className: inputClass,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const sects = await getSectores();
        setSectores(sects);
        if (isEdit && id) {
          const activo = await getActivoById(id);
          if (activo) {
            originalGpuSerialRef.current = activo.placaVideoNroSerie || '';
            originalMotherboardSerialRef.current = activo.placaMadreNroSerie || '';
            setForm({
              sector: activo.sector,
              piso: activo.piso,
              oficina: activo.oficina,
              nroPc: activo.nroPc,
              usuario: activo.usuario,
              microModelo: activo.microModelo,
              microMarca: activo.microMarca,
              microNroSerie: activo.microNroSerie,
              placaMadreModelo: activo.placaMadreModelo,
              placaMadreMarca: activo.placaMadreMarca,
              placaMadreNroSerie: activo.placaMadreNroSerie,
              ramModulos: activo.ramModulos || [],
              ramTotal: activo.ramTotal,
              almacenamientoModulos: activo.almacenamientoModulos || [],
              almacenamientoTotal: activo.almacenamientoTotal || '',
              placaVideoModelo: activo.placaVideoModelo,
              placaVideoMarca: activo.placaVideoMarca,
              placaVideoNroSerie: activo.placaVideoNroSerie,
              placaVideoCapacidad: (activo as any).placaVideoCapacidad || '',
              ip: activo.ip,
              mac: activo.mac,
              idAD: activo.idAD,
              pAD: activo.pAD,
              sistemaOperativo: activo.sistemaOperativo,
              impresoraModelo: activo.impresoraModelo,
              impresoraMarca: activo.impresoraMarca,
              impresoraNroSerie: activo.impresoraNroSerie,
              observaciones: activo.observaciones ?? '',
              fechaCambioPC: activo.fechaCambioPC,
              fechaUltimoMantenimiento: activo.fechaUltimoMantenimiento,
              estado: activo.estado,
            });
          }
        }
      } catch {
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  // Auto-completar piso al seleccionar sector
  const handleSectorChange = (val: string) => {
    const pisoBySector = getPisoForSector(val);
    setForm(prev => ({ ...prev, sector: val, piso: pisoBySector }));
  };

  const warnIfEnUso = (comp: any) => {
    if (comp.activoId && comp.activoId !== id) {
      toast.warning(`Este componente ya está instalado en ${comp.ubicacion ?? comp.activoId}`);
    }
  };

  // Autocompletar marca/modelo para micro, placaMadre, placaVideo, impresora
  const handleComponenteSerieChange = async (
    field: 'micro' | 'placaMadre' | 'placaVideo' | 'impresora',
    nroSerie: string
  ) => {
    setForm(prev => ({
      ...prev,
      [`${field}NroSerie`]: nroSerie,
      [`${field}Marca`]: '',
      [`${field}Modelo`]: '',
      ...(field === 'placaVideo' ? { placaVideoCapacidad: '' } : {}),
    }));
    if (nroSerie.trim()) {
      try {
        const comp = await buscarComponentePorSerie(nroSerie);
        if (comp) {
          warnIfEnUso(comp);
          setForm(prev => ({
            ...prev,
            [`${field}Marca`]: comp.marca,
            [`${field}Modelo`]: comp.modelo,
            ...(field === 'placaVideo' ? { placaVideoCapacidad: comp.capacidad ?? '' } : {}),
          }));
        }
      } catch { /* silencioso */ }
    }
  };

  // ── RAM ──────────────────────────────────────────────────────────────────
  const handleAddRAM = () => {
    setForm(prev => ({
      ...prev,
      ramModulos: [
        ...prev.ramModulos,
        { id: `ram-${Date.now()}`, nroSerie: '', marca: '', modelo: '', capacidad: '' },
      ],
    }));
  };

  const handleRemoveRAM = (index: number) => {
    setForm(prev => ({ ...prev, ramModulos: prev.ramModulos.filter((_, i) => i !== index) }));
  };

  const handleRAMChange = async (index: number, field: keyof ModuloRAM, value: string) => {
    const newModulos = [...form.ramModulos];
    newModulos[index] = { ...newModulos[index], [field]: value };
    setForm(prev => ({ ...prev, ramModulos: newModulos }));
    if (field === 'nroSerie' && value.trim()) {
      try {
        const comp = await buscarComponentePorSerie(value);
        if (comp) {
          warnIfEnUso(comp);
          newModulos[index] = { ...newModulos[index], marca: comp.marca, modelo: comp.modelo, capacidad: comp.capacidad ?? '' };
          setForm(prev => ({ ...prev, ramModulos: [...newModulos] }));
        }
      } catch { /* silencioso */ }
    }
  };

  const calcularRAMTotal = (modulos: ModuloRAM[] | undefined): string => {
    if (!modulos?.length) return '';
    let totalGB = 0;
    let allParsed = true;
    for (const m of modulos) {
      const match = m.capacidad?.match(/^(\d+(?:\.\d+)?)\s*GB$/i);
      if (match) totalGB += parseFloat(match[1]);
      else { allParsed = false; break; }
    }
    return allParsed && totalGB > 0 ? `${totalGB} GB` : modulos.map(m => m.capacidad).filter(Boolean).join(' + ');
  };

  useEffect(() => {
    setForm(prev => ({ ...prev, ramTotal: calcularRAMTotal(prev.ramModulos || []) }));
  }, [form.ramModulos]);

  // ── Almacenamiento ───────────────────────────────────────────────────────
  const handleAddAlmacenamiento = () => {
    setForm(prev => ({
      ...prev,
      almacenamientoModulos: [
        ...prev.almacenamientoModulos,
        { id: `dsk-${Date.now()}`, nroSerie: '', tipo: '', marca: '', modelo: '', capacidad: '' },
      ],
    }));
  };

  const handleRemoveAlmacenamiento = (index: number) => {
    setForm(prev => ({
      ...prev,
      almacenamientoModulos: prev.almacenamientoModulos.filter((_, i) => i !== index),
    }));
  };

  const handleAlmacenamientoSerieChange = async (index: number, nroSerie: string) => {
    const newModulos = [...form.almacenamientoModulos];
    newModulos[index] = { ...newModulos[index], nroSerie, tipo: '', marca: '', modelo: '', capacidad: '' };
    setForm(prev => ({ ...prev, almacenamientoModulos: newModulos }));
    if (nroSerie.trim()) {
      try {
        const comp = await buscarComponentePorSerie(nroSerie);
        if (comp) {
          warnIfEnUso(comp);
          newModulos[index] = {
            ...newModulos[index],
            tipo: comp.tipoComponente,
            marca: comp.marca,
            modelo: comp.modelo,
            capacidad: comp.capacidad ?? '',
          };
          setForm(prev => ({ ...prev, almacenamientoModulos: [...newModulos] }));
        }
      } catch { /* silencioso */ }
    }
  };

  const calcularAlmacenamientoTotal = (modulos: ModuloAlmacenamiento[] | undefined): string => {
    if (!modulos?.length) return '';
    let totalGB = 0;
    let allParsed = true;
    for (const m of modulos) {
      const matchTB = m.capacidad?.match(/^(\d+(?:\.\d+)?)\s*TB$/i);
      const matchGB = m.capacidad?.match(/^(\d+(?:\.\d+)?)\s*GB$/i);
      const matchMB = m.capacidad?.match(/^(\d+(?:\.\d+)?)\s*MB$/i);
      if (matchTB) totalGB += parseFloat(matchTB[1]) * 1024;
      else if (matchGB) totalGB += parseFloat(matchGB[1]);
      else if (matchMB) totalGB += parseFloat(matchMB[1]) / 1024;
      else { allParsed = false; break; }
    }
    if (!allParsed) return modulos.map(m => m.capacidad).filter(Boolean).join(' + ');
    if (totalGB >= 1024) {
      const tb = totalGB / 1024;
      return `${Number.isInteger(tb) ? tb : tb.toFixed(1)} TB`;
    }
    return `${totalGB} GB`;
  };

  useEffect(() => {
    setForm(prev => ({ ...prev, almacenamientoTotal: calcularAlmacenamientoTotal(prev.almacenamientoModulos || []) }));
  }, [form.almacenamientoModulos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nroPc.match(/^PC\d{3}$/)) {
      toast.error('N° PC inválido. Formato requerido: PC000 – PC999');
      return;
    }
    if (!form.sector) {
      toast.error('El sector es obligatorio');
      return;
    }

    // Validar y encriptar P AD si el usuario ingresó una nueva
    let pADFinal = form.pAD;
    if (pADInput.trim()) {
      if (!PAD_REGEX.test(pADInput)) {
        setPADError('Formato inválido: 4 letras (a–j) + 4 dígitos (0–9). Ej: caja1210');
        toast.error('P AD con formato inválido');
        return;
      }
      pADFinal = encriptarPAD(pADInput);
    }

    // Validar que los componentes ingresados no estén en uso en otro equipo
    const seriesAValidar: { serie: string; etiqueta: string }[] = [
      ...(form.microNroSerie.trim() ? [{ serie: form.microNroSerie, etiqueta: 'Procesador' }] : []),
      ...(form.placaMadreNroSerie?.trim() ? [{ serie: form.placaMadreNroSerie, etiqueta: 'Placa Madre' }] : []),
      ...(form.placaVideoNroSerie?.trim() ? [{ serie: form.placaVideoNroSerie, etiqueta: 'Placa de video' }] : []),
      ...(form.impresoraNroSerie?.trim() ? [{ serie: form.impresoraNroSerie, etiqueta: 'Impresora' }] : []),
      ...form.ramModulos.filter(m => m.nroSerie?.trim()).map((m, i) => ({ serie: m.nroSerie, etiqueta: `RAM módulo ${i + 1}` })),
      ...form.almacenamientoModulos.filter(m => m.nroSerie?.trim()).map((m, i) => ({ serie: m.nroSerie, etiqueta: `Almacenamiento módulo ${i + 1}` })),
    ];
    if (seriesAValidar.length > 0) {
      const conflictos: string[] = [];
      await Promise.all(seriesAValidar.map(async ({ serie, etiqueta }) => {
        try {
          const comp = await buscarComponentePorSerie(serie);
          if (comp && comp.activoId && comp.activoId !== id) {
            conflictos.push(`${etiqueta} (N° serie: ${serie}) ya está instalado en ${comp.ubicacion ?? comp.activoId}`);
          }
        } catch { /* ignorar errores de búsqueda */ }
      }));
      if (conflictos.length > 0) {
        conflictos.forEach(msg => toast.error(msg, { duration: 6000 }));
        return;
      }
    }

    const payload = { ...form, pAD: pADFinal };

    setSaving(true);
    try {
      let savedId = id;
      if (isEdit && id) {
        await updateActivo(id, payload);
      } else {
        const created = await createActivo(payload);
        savedId = created.id;
      }

      // Sincronizar placa de video: actualizar activoId del componente
      const newGpuSerial = form.placaVideoNroSerie?.trim() || '';
      const oldGpuSerial = originalGpuSerialRef.current;
      if (newGpuSerial !== oldGpuSerial) {
        if (oldGpuSerial) {
          try {
            const oldComp = await buscarComponentePorSerie(oldGpuSerial);
            if (oldComp && oldComp.activoId === savedId) {
              await updateComponente(oldComp.id, { activoId: null } as any);
            }
          } catch { /* silencioso */ }
        }
        if (newGpuSerial) {
          try {
            const newComp = await buscarComponentePorSerie(newGpuSerial);
            if (newComp) await updateComponente(newComp.id, { activoId: savedId } as any);
          } catch { /* silencioso */ }
        }
      }

      // Sincronizar placa madre: actualizar activoId del componente
      const newMbSerial = form.placaMadreNroSerie?.trim() || '';
      const oldMbSerial = originalMotherboardSerialRef.current;
      if (newMbSerial !== oldMbSerial) {
        if (oldMbSerial) {
          try {
            const oldComp = await buscarComponentePorSerie(oldMbSerial);
            if (oldComp && oldComp.activoId === savedId) {
              await updateComponente(oldComp.id, { activoId: null } as any);
            }
          } catch { /* silencioso */ }
        }
        if (newMbSerial) {
          try {
            const newComp = await buscarComponentePorSerie(newMbSerial);
            if (newComp) await updateComponente(newComp.id, { activoId: savedId } as any);
          } catch { /* silencioso */ }
        }
      }

      toast.success(isEdit ? 'Equipo actualizado correctamente' : 'Equipo creado correctamente');
      clearFormPersistence();
      navigate('/activos');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('único') || msg.includes('unique') || msg.includes('P2002')) {
        toast.error('Ya existe un equipo con ese N° PC');
      } else if (msg && msg.length < 120) {
        toast.error(msg);
      } else {
        toast.error('No se pudo guardar el equipo. Revisá los datos e intentá nuevamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/activos')}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Modificar Equipo' : 'Crear Equipo'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isEdit ? `Editando ${form.nroPc}` : 'Completar los datos del nuevo equipo'}
          </p>
        </div>
      </div>

      <DraftBanner show={showDraftBanner} onDiscard={clearFormPersistence} />

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── 1. Identificación ── */}
        <Section icon={User} title="Identificación">
          <Grid2>
            <Field label="N° PC" required hint="Formato: PC000 – PC999">
              <input
                type="text"
                value={form.nroPc}
                maxLength={5}
                placeholder="Ej: PC001"
                onChange={e => {
                  const raw = e.target.value.toUpperCase().replace(/[^PC0-9]/g, '');
                  setForm(prev => ({ ...prev, nroPc: raw }));
                }}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Usuario">
              <input {...inp('usuario')} placeholder="Ej: Prof. Ana Martínez" />
            </Field>
          </Grid2>
        </Section>

        {/* ── 2. Ubicación ── */}
        <Section icon={MapPin} title="Ubicación">
          <Grid3>
            <Field label="Sector" required>
              <SearchableSelect
                options={sectores}
                value={form.sector}
                onChange={handleSectorChange}
                placeholder="Seleccionar sector..."
              />
            </Field>
            <Field label="Piso" hint="Se completa automáticamente">
              <input
                type="text"
                value={form.piso}
                readOnly
                placeholder="Auto-completado por sector"
                className={readonlyClass}
              />
            </Field>
            <Field label="Oficina / Aula">
              <input {...inp('oficina')} placeholder="Ej: Aula 12, Of. Dirección" />
            </Field>
          </Grid3>
        </Section>

        {/* ── 3. Microprocesador ── */}
        <Section icon={Cpu} title="Procesador">
          <Grid3>
            <Field label="N° de Serie" hint="Autocompleta marca/modelo">
              <input
                type="text"
                value={form.microNroSerie}
                onChange={e => handleComponenteSerieChange('micro', e.target.value)}
                placeholder="Ej: SN-CPU-001"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Marca" hint="Autocompletado">
              <input type="text" value={form.microMarca} readOnly className={readonlyClass} placeholder="—" />
            </Field>
            <Field label="Modelo" hint="Autocompletado">
              <input type="text" value={form.microModelo} readOnly className={readonlyClass} placeholder="—" />
            </Field>
          </Grid3>
        </Section>

        {/* ── 3.5. Placa Madre ── */}
        <Section icon={CircuitBoard} title="Placa Madre">
          <Grid3>
            <Field label="N° de Serie" hint="Autocompleta marca/modelo">
              <input
                type="text"
                value={form.placaMadreNroSerie}
                onChange={e => handleComponenteSerieChange('placaMadre', e.target.value)}
                placeholder="Ej: SN-MB-001"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Marca" hint="Autocompletado">
              <input type="text" value={form.placaMadreMarca} readOnly className={readonlyClass} placeholder="—" />
            </Field>
            <Field label="Modelo" hint="Autocompletado">
              <input type="text" value={form.placaMadreModelo} readOnly className={readonlyClass} placeholder="—" />
            </Field>
          </Grid3>
        </Section>

        {/* ── 4. Memoria RAM ── */}
        <Section icon={Monitor} title="Memoria RAM">
          <div className="space-y-3">
            {(form.ramModulos || []).map((modulo, index) => (
              <div key={modulo.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Módulo {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRAM(index)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="Eliminar módulo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="N° de Serie" hint="Autocompleta">
                    <input
                      type="text"
                      value={modulo.nroSerie}
                      onChange={e => handleRAMChange(index, 'nroSerie', e.target.value)}
                      placeholder="Ej: SN-RAM-001"
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                  <Field label="Marca">
                    <input type="text" value={modulo.marca} readOnly className={readonlyClass} placeholder="—" />
                  </Field>
                  <Field label="Modelo">
                    <input type="text" value={modulo.modelo} readOnly className={readonlyClass} placeholder="—" />
                  </Field>
                  <Field label="Capacidad" hint="Autocompleta">
                    <input type="text" value={modulo.capacidad} readOnly className={readonlyClass} placeholder="—" />
                  </Field>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddRAM}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus size={16} />
              Agregar módulo de RAM
            </button>
            <Field label="Capacidad total" hint="Calculada automáticamente">
              <input type="text" value={form.ramTotal} readOnly placeholder="—" className={readonlyClass} />
            </Field>
          </div>
        </Section>

        {/* ── 5. Almacenamiento ── */}
        <Section icon={HardDrive} title="Almacenamiento">
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ingresá el N° de serie de cada dispositivo. El tipo, marca y capacidad se completan automáticamente desde el catálogo (HDD, SSD, M.2).
            </p>
            {(form.almacenamientoModulos || []).map((modulo, index) => (
              <div key={modulo.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dispositivo {index + 1}</span>
                    {modulo.tipo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_BADGE[modulo.tipo] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {modulo.tipo}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAlmacenamiento(index)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="Eliminar dispositivo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="N° de Serie" hint="Autocompleta">
                    <input
                      type="text"
                      value={modulo.nroSerie}
                      onChange={e => handleAlmacenamientoSerieChange(index, e.target.value)}
                      placeholder="Ej: SN-DSK-001"
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                  <Field label="Marca" hint="Autocompletado">
                    <input type="text" value={modulo.marca} readOnly className={readonlyClass} placeholder="—" />
                  </Field>
                  <Field label="Modelo" hint="Autocompletado">
                    <input type="text" value={modulo.modelo} readOnly className={readonlyClass} placeholder="—" />
                  </Field>
                  <Field label="Capacidad" hint="Autocompletada">
                    <input type="text" value={modulo.capacidad} readOnly className={readonlyClass} placeholder="—" />
                  </Field>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddAlmacenamiento}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus size={16} />
              Agregar dispositivo de almacenamiento
            </button>
            <Field label="Capacidad total" hint="Calculada automáticamente">
              <input type="text" value={form.almacenamientoTotal} readOnly placeholder="—" className={readonlyClass} />
            </Field>
          </div>
        </Section>

        {/* ── 6. Placa de Video ── */}
        <Section icon={Monitor} title="Placa de Video">
          <Grid3>
            <Field label="N° de Serie" hint="Autocompleta marca/modelo/memoria">
              <input
                type="text"
                value={form.placaVideoNroSerie}
                onChange={e => handleComponenteSerieChange('placaVideo', e.target.value)}
                placeholder="Ej: SN-GPU-001"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Marca" hint="Autocompletado">
              <input type="text" value={form.placaVideoMarca} readOnly className={readonlyClass} placeholder="—" />
            </Field>
            <Field label="Modelo" hint="Autocompletado">
              <input type="text" value={form.placaVideoModelo} readOnly className={readonlyClass} placeholder="—" />
            </Field>
            <Field label="Memoria" hint="Autocompletado">
              <input type="text" value={(form as any).placaVideoCapacidad} readOnly className={readonlyClass} placeholder="—" />
            </Field>
          </Grid3>
        </Section>

        {/* ── 7. Red ── */}
        <Section icon={Wifi} title="Red">
          <Grid2>
            <Field label="Dirección IP">
              <input {...inp('ip')} placeholder="Ej: 192.168.1.100" className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Dirección MAC">
              <input {...inp('mac')} placeholder="Ej: AA:BB:CC:DD:EE:FF" className={`${inputClass} font-mono`} />
            </Field>
            <Field label="ID AD" hint="ID de Active Directory">
              <input {...inp('idAD')} placeholder="Ej: jdoe" className={`${inputClass} font-mono`} />
            </Field>
            <Field label="P AD" hint="4 letras (a–j) + 4 dígitos (0–9) · Ej: caja1210">
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={pADInput}
                  onChange={e => {
                    const v = e.target.value.toLowerCase().replace(/[^a-j0-9]/g, '').slice(0, 8);
                    setPADInput(v);
                    setPADError('');
                  }}
                  placeholder={isEdit && form.pAD ? 'Dejar vacío para conservar la actual' : 'Ej: caja1210'}
                  maxLength={8}
                  className={`${inputClass} font-mono ${pADError ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                {pADError && (
                  <p className="text-xs text-red-500">{pADError}</p>
                )}
                {pADInput && PAD_REGEX.test(pADInput) && (
                  <div className="flex items-center gap-1.5 bg-[#e6f7fc] dark:bg-[#00a6d6]/10 border border-[#00a6d6]/30 rounded-lg px-3 py-1.5">
                    <Lock size={11} className="text-[#00a6d6] shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Encriptado:</span>
                    <span className="text-xs font-mono font-semibold text-[#00a6d6] dark:text-[#00c4f0] tracking-widest">
                      {encriptarPAD(pADInput)}
                    </span>
                  </div>
                )}
                {pADInput && !PAD_REGEX.test(pADInput) && pADInput.length > 0 && (
                  <p className="text-xs text-amber-500 dark:text-amber-400">
                    {pADInput.length < 8
                      ? `${8 - pADInput.length} carácter${8 - pADInput.length !== 1 ? 'es' : ''} restante${8 - pADInput.length !== 1 ? 's' : ''}`
                      : 'Formato inválido — Ej: caja1210'}
                  </p>
                )}
                {isEdit && form.pAD && !pADInput && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Lock size={11} />
                    <span>Contraseña actual conservada</span>
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 tracking-widest">
                      {form.pAD}
                    </span>
                  </div>
                )}
              </div>
            </Field>
          </Grid2>
        </Section>

        {/* ── 8. Sistema Operativo ── */}
        <Section icon={Settings} title="Sistema Operativo">
          <div className="max-w-sm">
            <Field label="Sistema Operativo">
              <input {...inp('sistemaOperativo')} placeholder="Ej: Windows 10 LTSC, Ubuntu 22.04" />
            </Field>
          </div>
        </Section>

        {/* ── 9. Impresora ── */}
        <Section icon={Printer} title="Impresora">
          <Grid3>
            <Field label="N° de Serie" hint="Autocompleta marca/modelo">
              <input
                type="text"
                value={form.impresoraNroSerie}
                onChange={e => handleComponenteSerieChange('impresora', e.target.value)}
                placeholder="Ej: SN-IMP-001"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Marca" hint="Autocompletado">
              <input type="text" value={form.impresoraMarca} readOnly className={readonlyClass} placeholder="—" />
            </Field>
            <Field label="Modelo" hint="Autocompletado">
              <input type="text" value={form.impresoraModelo} readOnly className={readonlyClass} placeholder="—" />
            </Field>
          </Grid3>
        </Section>

        {/* ── 10. Estado y Fechas ── */}
        <Section icon={Settings} title="Estado y Fechas">
          <Grid3>
            <Field label="Fecha de Cambio de PC">
              <input
                type="date"
                value={form.fechaCambioPC}
                onChange={e => setForm(prev => ({ ...prev, fechaCambioPC: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="Fecha Último Mantenimiento">
              <input
                type="date"
                value={form.fechaUltimoMantenimiento}
                onChange={e => setForm(prev => ({ ...prev, fechaUltimoMantenimiento: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="Estado" required>
              <SearchableSelect
                options={ESTADO_OPTIONS}
                value={form.estado}
                onChange={val => setForm(prev => ({ ...prev, estado: val as 'activa' | 'inactiva' }))}
                placeholder="Seleccionar..."
                noClear
              />
            </Field>
          </Grid3>
          <Field label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={e => setForm(prev => ({ ...prev, observaciones: e.target.value }))}
              rows={3}
              placeholder="Notas adicionales sobre el equipo..."
              className={inputClass}
            />
          </Field>
        </Section>

        {/* ── Botones ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { clearFormPersistence(); navigate('/activos'); }}
            className="px-5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-[#00a6d6] hover:bg-[#0095c0] text-white rounded-lg transition-colors disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear equipo'}
          </button>
        </div>
      </form>
    </div>
  );
}