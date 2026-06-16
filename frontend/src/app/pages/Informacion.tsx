import { useState, useEffect } from 'react';
import {
  Phone, PhoneCall, Clock, Mail, Pencil, Plus, Trash2,
  Building2, Info, Check, Loader2, X,
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import {
  getInfoOperaciones, updateInfoOperaciones,
  type InfoOperaciones,
} from '../services/apiClient';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'sonner@2.0.3';
import { useFormPersistence } from '../services/useFormPersistence';

// ── shared input class ────────────────────────────────────────────────────────
const ic =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent text-sm placeholder:text-gray-400';

// ── InfoCard ─────────────────────────────────────────────────────────────────
function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#e6f7fc] dark:bg-[#004d63]/30 flex items-center justify-center">
        <Icon size={22} className="text-[#00a6d6]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <div className="text-gray-900 dark:text-white text-sm">{children}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Informacion() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.rol === 'administrador';

  const [info, setInfo] = useState<InfoOperaciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state con persistencia (solo admin edita)
  const [form, setForm, clearFormPersistence] = useFormPersistence<InfoOperaciones>(
    'gestec:info:edit',
    { telefono: '', telefonoInterno: '', horariosAtencion: '', mailsContacto: [''] },
  );

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getInfoOperaciones()
      .then(setInfo)
      .catch(() => toast.error('Error al cargar la información'))
      .finally(() => setLoading(false));
  }, []);

  // ── Open modal ────────────────────────────────────────────────────────────
  const openModal = () => {
    if (!info) return;
    // Siempre cargamos desde `info` al abrir, para garantizar datos frescos
    setForm({
      telefono: info.telefono,
      telefonoInterno: info.telefonoInterno,
      horariosAtencion: info.horariosAtencion,
      mailsContacto: info.mailsContacto.length ? [...info.mailsContacto] : [''],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    // Cerrar con X: NO limpiar draft
    setShowModal(false);
  };

  // ── Mail array helpers ────────────────────────────────────────────────────
  const addMail = () =>
    setForm(p => ({ ...p, mailsContacto: [...p.mailsContacto, ''] }));

  const removeMail = (idx: number) =>
    setForm(p => ({
      ...p,
      mailsContacto: p.mailsContacto.filter((_, i) => i !== idx),
    }));

  const updateMail = (idx: number, val: string) =>
    setForm(p => ({
      ...p,
      mailsContacto: p.mailsContacto.map((m, i) => (i === idx ? val : m)),
    }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Filtrar mails vacíos
    const mails = form.mailsContacto.map(m => m.trim()).filter(Boolean);
    if (!form.telefono.trim()) { toast.error('El teléfono es obligatorio'); return; }
    if (!form.horariosAtencion.trim()) { toast.error('El horario es obligatorio'); return; }
    if (!mails.length) { toast.error('Ingresá al menos un mail de contacto'); return; }

    setSaving(true);
    try {
      const payload: InfoOperaciones = { ...form, mailsContacto: mails };
      const updated = await updateInfoOperaciones(payload);
      setInfo(updated);
      toast.success('Información actualizada correctamente');
      clearFormPersistence(); // ← Limpiar draft al guardar con éxito
      closeModal();
    } catch {
      toast.error('Error al guardar la información');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#00a6d6] flex items-center justify-center shadow-md flex-shrink-0">
            <Info size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl dark:text-white">Información</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Área de Operaciones y Soporte Técnico
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors text-sm flex-shrink-0 shadow-sm"
          >
            <Pencil size={15} />
            <span className="hidden sm:inline">Editar</span>
          </button>
        )}
      </div>

      {/* ── Banner institucional ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00a6d6] to-[#0095c0] p-6 text-white shadow-lg">
        {/* decorative circles */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <p className="opacity-80 text-sm mb-0.5">Colegio Universitario IES</p>
            <p className="text-lg">Área de Operaciones</p>
            <p className="text-sm opacity-75 mt-0.5">
              Para consultas técnicas o reportar inconvenientes, contactanos por los medios indicados.
            </p>
          </div>
        </div>
      </div>

      {/* ── Tarjetas de información ───────────────────────────────────────── */}
      {info && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Teléfono */}
          <InfoCard icon={Phone} label="Teléfono">
            <a
              href={`tel:${info.telefono.replace(/\s/g, '')}`}
              className="text-[#00a6d6] hover:underline"
            >
              {info.telefono || <span className="text-gray-400 italic">Sin datos</span>}
            </a>
          </InfoCard>

          {/* Teléfono interno */}
          <InfoCard icon={PhoneCall} label="Teléfono interno">
            <span>
              {info.telefonoInterno || <span className="text-gray-400 italic">Sin datos</span>}
            </span>
          </InfoCard>

          {/* Horarios */}
          <InfoCard icon={Clock} label="Horarios de atención">
            <span className="whitespace-pre-line">
              {info.horariosAtencion || <span className="text-gray-400 italic">Sin datos</span>}
            </span>
          </InfoCard>

          {/* Mails */}
          <InfoCard icon={Mail} label="Correos de contacto">
            {info.mailsContacto.length ? (
              <ul className="space-y-1">
                {info.mailsContacto.map((mail, i) => (
                  <li key={i}>
                    <a
                      href={`mailto:${mail}`}
                      className="text-[#00a6d6] hover:underline break-all"
                    >
                      {mail}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-gray-400 italic">Sin datos</span>
            )}
          </InfoCard>

        </div>
      )}

      {/* ── Nota al pie ──────────────────────────────────────────────────── */}
      <div className="bg-[#e6f7fc] dark:bg-[#004d63]/20 border border-[#b3e7f7] dark:border-[#004d63]/40 rounded-xl p-4">
        <p className="text-sm text-[#007a9e] dark:text-[#00c8f0] flex gap-2 items-start">
          <Info size={15} className="flex-shrink-0 mt-0.5" />
          Esta información es provista por el Área de Operaciones. Ante cualquier duda o urgencia,
          comunicate directamente por los canales indicados.
        </p>
      </div>

      {/* ════ MODAL EDITAR ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Editar información de contacto"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Teléfono */}
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                className={`${ic} pl-8 ${form.telefono ? 'pr-8' : ''}`}
                placeholder="Ej: (011) 4523-0800"
              />
              {form.telefono && (
                <button type="button" onClick={() => setForm(p => ({ ...p, telefono: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Teléfono interno */}
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Teléfono interno
            </label>
            <div className="relative">
              <PhoneCall size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={form.telefonoInterno}
                onChange={e => setForm(p => ({ ...p, telefonoInterno: e.target.value }))}
                className={`${ic} pl-8 ${form.telefonoInterno ? 'pr-8' : ''}`}
                placeholder="Ej: 203 / 204"
              />
              {form.telefonoInterno && (
                <button type="button" onClick={() => setForm(p => ({ ...p, telefonoInterno: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Horarios */}
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Horarios de atención <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock size={15} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                required
                rows={2}
                value={form.horariosAtencion}
                onChange={e => setForm(p => ({ ...p, horariosAtencion: e.target.value }))}
                className={`${ic} pl-8 resize-none`}
                placeholder="Ej: Lunes a Viernes de 8:00 a 18:00 hs"
              />
            </div>
          </div>

          {/* Mails */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Correos de contacto <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addMail}
                className="flex items-center gap-1 text-xs text-[#00a6d6] hover:text-[#0095c0] transition-colors"
              >
                <Plus size={13} /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {form.mailsContacto.map((mail, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={mail}
                      onChange={e => updateMail(idx, e.target.value)}
                      className={`${ic} pl-8 ${mail ? 'pr-8' : ''}`}
                      placeholder="correo@institucion.edu.ar"
                    />
                    {mail && (
                      <button type="button" onClick={() => updateMail(idx, '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {form.mailsContacto.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMail(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                clearFormPersistence(); // ← Cancelar limpia el draft
                closeModal();
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin" /> Guardando...</>
              ) : (
                <><Check size={15} /> Guardar cambios</>
              )}
            </button>
          </div>

        </form>
      </Modal>
    </div>
  );
}