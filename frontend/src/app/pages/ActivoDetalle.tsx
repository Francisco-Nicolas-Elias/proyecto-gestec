import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Pencil, Wrench, Trash2, Monitor, HardDrive, Cpu, Wifi,
  MapPin, User, Calendar, Settings, Printer, X, Plus, Check, FileText, FileDown, Lock,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getActivoById, getIntervenciones, getTickets, deleteActivo,
  addMantenimientoRecord, getCurrentUser,
  type Activo, type MantenimientoRecord,
} from '../services/apiClient';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner@2.0.3';

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between items-start py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 gap-4">
    <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
    <dd className="text-sm font-medium text-gray-900 dark:text-white text-right font-mono break-all">
      {value || <span className="font-normal text-gray-400 dark:text-gray-500 font-sans">—</span>}
    </dd>
  </div>
);

// Fila especial para valores encriptados (P AD)
const RowEncrypted = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 gap-4">
    <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0 flex items-center gap-1.5">
      <Lock size={12} className="text-gray-400 dark:text-gray-500" />
      {label}
    </dt>
    <dd className="text-right">
      {value ? (
        <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 px-2.5 py-1 rounded-lg">
          <Lock size={10} className="text-[#00a6d6] shrink-0" />
          <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200 tracking-widest">{value}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">enc.</span>
        </span>
      ) : (
        <span className="text-sm text-gray-400 dark:text-gray-500 font-sans">—</span>
      )}
    </dd>
  </div>
);

const Card = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
      <Icon size={15} className="text-[#00a6d6]" />
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h3>
    </div>
    <dl className="px-5">{children}</dl>
  </div>
);

type Tab = 'hardware' | 'historial' | 'tickets';

export default function ActivoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const usuario = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [activo, setActivo] = useState<Activo | null>(null);
  const [intervenciones, setIntervenciones] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('hardware');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Agregar mantenimiento
  const [showAddMant, setShowAddMant] = useState(false);
  const [savingMant, setSavingMant] = useState(false);
  const [mantForm, setMantForm] = useState({ fecha: '', tipo: 'Preventivo', descripcion: '' });

  const canEdit = hasPermission('activos');

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [a, ints, ticks] = await Promise.all([
        getActivoById(id!),
        getIntervenciones(id!),
        getTickets(),
      ]);
      if (!a) { toast.error('Equipo no encontrado'); navigate('/activos'); return; }
      setActivo(a);
      setIntervenciones(ints);
      setTickets(ticks.filter((t: any) => t.activoId === id));
    } catch { toast.error('Error al cargar el equipo'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteActivo(id!);
      toast.success('Equipo eliminado');
      navigate('/activos');
    } catch { toast.error('Error al eliminar'); setDeleting(false); }
  };

  const handleAddMant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mantForm.fecha || !mantForm.descripcion.trim()) {
      toast.error('Completá la fecha y la descripción');
      return;
    }
    setSavingMant(true);
    try {
      await addMantenimientoRecord(id!, {
        fecha: mantForm.fecha,
        tipo: mantForm.tipo,
        descripcion: mantForm.descripcion.trim(),
        tecnico: usuario?.nombre || 'Sistema',
      });
      await loadData();
      setShowAddMant(false);
      setMantForm({ fecha: '', tipo: 'Preventivo', descripcion: '' });
      toast.success('Mantenimiento registrado');
    } catch { toast.error('Error al registrar'); }
    finally { setSavingMant(false); }
  };

  // ── Exportar Historial a PDF ──
  const exportarHistorialPDF = async () => {
    if (!activo) return;

    const doc = new jsPDF({ orientation: 'portrait' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const cyan: [number, number, number] = [0, 166, 214];
    const cyanDark: [number, number, number] = [0, 100, 130];

    const now = new Date();
    const fechaExport = now.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `historial_${activo.nroPc}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.pdf`;

    // ── Cabecera institucional ──
    doc.setFillColor(...cyan);
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setFillColor(...cyanDark);
    doc.rect(0, 28, pageW, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('GESTEC — Colegio Universitario IES', 14, 12);
    doc.setFontSize(8.5);
    doc.text('Historial de Mantenimiento e Intervenciones', 14, 22);
    doc.text(`Exportado: ${fechaExport}`, pageW - 14, 22, { align: 'right' });

    // ── Ficha del activo ──
    let y = 42;
    doc.setFillColor(240, 250, 254);
    doc.roundedRect(10, y - 5, pageW - 20, 28, 3, 3, 'F');
    doc.setDrawColor(...cyan);
    doc.setLineWidth(0.4);
    doc.roundedRect(10, y - 5, pageW - 20, 28, 3, 3, 'S');

    doc.setFontSize(13);
    doc.setTextColor(0, 100, 140);
    doc.text(activo.nroPc, 16, y + 3);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const ficha = [
      `Sector: ${activo.sector || '—'}`,
      `Piso: ${activo.piso || '—'}`,
      activo.oficina ? `Oficina: ${activo.oficina}` : '',
      `Usuario: ${activo.usuario || '—'}`,
      `Estado: ${activo.estado || '—'}`,
      `S.O.: ${activo.sistemaOperativo || '—'}`,
    ].filter(Boolean);

    const col1 = ficha.slice(0, 3);
    const col2 = ficha.slice(3);
    col1.forEach((txt, i) => doc.text(txt, 16, y + 12 + i * 5));
    col2.forEach((txt, i) => doc.text(txt, pageW / 2, y + 12 + i * 5));

    y += 32;

    // ── Sección 1: Registros de Mantenimiento ──
    const mants = activo.historialMantenimiento ?? [];

    doc.setFontSize(9);
    doc.setTextColor(...cyan);
    doc.setFont('helvetica', 'bold');
    doc.text(`Registros de Mantenimiento (${mants.length})`, 14, y);
    doc.setFont('helvetica', 'normal');
    y += 4;

    if (mants.length === 0) {
      doc.setTextColor(160, 160, 160);
      doc.setFontSize(8);
      doc.text('Sin registros de mantenimiento.', 14, y + 5);
      y += 12;
    } else {
      autoTable(doc, {
        startY: y,
        columns: [
          { header: 'Fecha',        dataKey: 'fecha'       },
          { header: 'Tipo',         dataKey: 'tipo'        },
          { header: 'Técnico / Responsable', dataKey: 'tecnico'     },
          { header: 'Descripción',  dataKey: 'descripcion' },
        ],
        body: mants.map((m: any) => ({
          fecha:       fmtDate(m.fecha),
          tipo:        m.tipo || '—',
          tecnico:     m.tecnico || '—',
          descripcion: m.descripcion || '—',
        })),
        theme: 'grid',
        headStyles: {
          fillColor: cyan,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], cellPadding: 3 },
        alternateRowStyles: { fillColor: [237, 248, 254] },
        columnStyles: {
          fecha:       { cellWidth: 24 },
          tipo:        { cellWidth: 26 },
          tecnico:     { cellWidth: 38 },
          descripcion: { cellWidth: 'auto' as any },
        },
        didDrawPage: (data: any) => {
          const pc = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(160, 160, 160);
          doc.text(
            `GESTEC – ${activo.nroPc}  |  Pág. ${data.pageNumber} de ${pc}`,
            pageW / 2, pageH - 7, { align: 'center' },
          );
        },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Sección 2: Intervenciones Técnicas ──
    if (intervenciones.length > 0) {
      // Verificar si cabe en la misma página o saltar
      if (y > pageH - 60) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(9);
      doc.setTextColor(...cyan);
      doc.setFont('helvetica', 'bold');
      doc.text(`Intervenciones Técnicas (${intervenciones.length})`, 14, y);
      doc.setFont('helvetica', 'normal');
      y += 4;

      autoTable(doc, {
        startY: y,
        columns: [
          { header: 'Fecha',       dataKey: 'fecha'       },
          { header: 'Tipo',        dataKey: 'tipo'        },
          { header: 'Técnico',     dataKey: 'tecnico'     },
          { header: 'Diagnóstico / Descripción', dataKey: 'diagnostico' },
        ],
        body: intervenciones.map((i: any) => ({
          fecha:       fmtDate(i.fecha),
          tipo:        i.tipo || '—',
          tecnico:     i.tecnico || '—',
          diagnostico: [i.diagnostico, i.solucion, i.descripcion].filter(Boolean).join(' · ') || '—',
        })),
        theme: 'grid',
        headStyles: {
          fillColor: [80, 50, 140] as [number, number, number],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], cellPadding: 3 },
        alternateRowStyles: { fillColor: [246, 243, 255] },
        columnStyles: {
          fecha:       { cellWidth: 24 },
          tipo:        { cellWidth: 30 },
          tecnico:     { cellWidth: 34 },
          diagnostico: { cellWidth: 'auto' as any },
        },
        didDrawPage: (data: any) => {
          const pc = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(160, 160, 160);
          doc.text(
            `GESTEC – ${activo.nroPc}  |  Pág. ${data.pageNumber} de ${pc}`,
            pageW / 2, pageH - 7, { align: 'center' },
          );
        },
      });
    }

    // ── Pie en todas las páginas (re-render) ──
    const totalPags = doc.getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(
        `GESTEC – Colegio Universitario IES  |  Pág. ${p} de ${totalPags}`,
        pageW / 2, pageH - 7, { align: 'center' },
      );
    }

    // ── Guardar con diálogo nativo o fallback ──
    const blob = doc.output('blob');
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success(`Historial exportado · ${mants.length + intervenciones.length} registros`);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename; a.click();
          URL.revokeObjectURL(url);
          toast.success(`Historial exportado · ${mants.length + intervenciones.length} registros`);
        }
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Historial exportado · ${mants.length + intervenciones.length} registros`);
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  if (!activo) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'hardware', label: 'Detalles Técnicos' },
    { id: 'historial', label: `Historial (${activo.historialMantenimiento.length})` },
    { id: 'tickets', label: `Tickets (${tickets.length})` },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/activos')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0">
            <ArrowLeft size={22} className="dark:text-white" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold font-mono text-[#00a6d6] dark:text-[#00c4f0]">{activo.nroPc}</h1>
              <StatusBadge status={activo.estado} type="activo" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {activo.sector} · {activo.piso}{activo.oficina ? ` · ${activo.oficina}` : ''}
            </p>
            {activo.usuario && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 flex items-center gap-1">
                <User size={13} className="text-gray-400" /> {activo.usuario}
              </p>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(`/activos/${id}/intervencion`)}
              className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Wrench size={15} />
              <span className="hidden sm:inline">Intervención</span>
            </button>
            <button
              onClick={() => navigate(`/activos/${id}/editar`)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
              title="Editar"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">¿Eliminar el equipo {activo.nroPc}?</p>
          <p className="text-sm text-red-600 dark:text-red-400">Esta acción no se puede deshacer.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} disabled={deleting}
              className="px-3 py-1.5 text-sm border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              <Trash2 size={13} /> {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: HardDrive, label: 'RAM', value: activo.ramTotal || '—' },
          { icon: HardDrive, label: 'Almacenamiento', value: activo.almacenamientoTotal || activo.discoTotal || '—' },
          { icon: Settings, label: 'S.O.', value: activo.sistemaOperativo || '—' },
          { icon: Wifi, label: 'IP', value: activo.ip || '—' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
              <s.icon size={14} />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="font-semibold text-sm dark:text-white font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#00a6d6] text-[#00a6d6] dark:text-[#00c4f0]'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── Detalles Técnicos ── */}
          {tab === 'hardware' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ubicación */}
                <Card title="Ubicación" icon={MapPin}>
                  <Row label="Sector" value={activo.sector} />
                  <Row label="Piso" value={activo.piso} />
                  <Row label="Oficina" value={activo.oficina} />
                </Card>

                {/* Identificación */}
                <Card title="Identificación" icon={User}>
                  <Row label="N° PC" value={activo.nroPc} />
                  <Row label="Usuario" value={activo.usuario} />
                </Card>

                {/* Procesador */}
                <Card title="Microprocesador" icon={Cpu}>
                  <Row label="Marca" value={activo.microMarca} />
                  <Row label="Modelo" value={activo.microModelo} />
                  <Row label="N° de Serie" value={activo.microNroSerie} />
                </Card>

                {/* Almacenamiento */}
                <Card title="Almacenamiento" icon={HardDrive}>
                  {(activo.almacenamientoModulos && activo.almacenamientoModulos.length > 0) ? (
                    <div className="space-y-3">
                      {activo.almacenamientoModulos.map((mod, i) => (
                        <div key={mod.id ?? i} className="flex flex-col gap-1 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Dispositivo {i + 1}</span>
                            {mod.tipo && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                mod.tipo === 'SSD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : mod.tipo === 'HDD' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                : mod.tipo === 'M.2' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {mod.tipo}
                              </span>
                            )}
                          </div>
                          <Row label="Marca" value={mod.marca} />
                          <Row label="Modelo" value={mod.modelo} />
                          <Row label="N° de Serie" value={mod.nroSerie} />
                          <Row label="Capacidad" value={mod.capacidad} />
                        </div>
                      ))}
                      <Row label="Total" value={activo.almacenamientoTotal} />
                    </div>
                  ) : (
                    <>
                      <Row label="Marca" value={activo.discoMarca} />
                      <Row label="Modelo" value={activo.discoModelo} />
                      <Row label="N° de Serie" value={activo.discoNroSerie} />
                      <Row label="Espacio total" value={activo.discoTotal} />
                    </>
                  )}
                </Card>

                {/* Placa de video */}
                <Card title="Placa de Video" icon={Monitor}>
                  <Row label="Marca" value={activo.placaVideoMarca} />
                  <Row label="Modelo" value={activo.placaVideoModelo} />
                  <Row label="N° de Serie" value={activo.placaVideoNroSerie} />
                </Card>

                {/* Red */}
                <Card title="Red" icon={Wifi}>
                  <Row label="IP" value={activo.ip} />
                  <Row label="MAC" value={activo.mac} />
                  <Row label="ID AD" value={activo.idAD} />
                  <RowEncrypted label="P AD" value={activo.pAD} />
                </Card>

                {/* Sistema */}
                <Card title="Sistema Operativo" icon={Settings}>
                  <Row label="S.O." value={activo.sistemaOperativo} />
                </Card>
              </div>

              {/* RAM - Módulos individuales */}
              <Card title="Memoria RAM" icon={Monitor}>
                <Row label="Capacidad total" value={activo.ramTotal} />
                {activo.ramModulos && activo.ramModulos.length > 0 && (
                  <div className="py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">Módulos instalados</dt>
                    <dd className="space-y-2">
                      {activo.ramModulos.map((modulo, idx) => (
                        <div key={modulo.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Módulo {idx + 1}</span>
                            <span className="text-xs font-medium text-[#00a6d6] dark:text-[#00c4f0]">{modulo.capacidad || '—'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Marca:</span>
                              <span className="ml-1 text-gray-900 dark:text-white font-medium">{modulo.marca || '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Modelo:</span>
                              <span className="ml-1 text-gray-900 dark:text-white font-medium">{modulo.modelo || '—'}</span>
                            </div>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500 dark:text-gray-400">N° Serie:</span>
                            <span className="ml-1 text-gray-900 dark:text-white font-mono">{modulo.nroSerie || '—'}</span>
                          </div>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
              </Card>

              {/* Impresora */}
              <Card title="Impresora" icon={Printer}>
                <Row label="Marca" value={activo.impresoraMarca} />
                <Row label="Modelo" value={activo.impresoraModelo} />
                <Row label="N° de Serie" value={activo.impresoraNroSerie} />
              </Card>

              {/* Gestión */}
              <Card title="Gestión" icon={Calendar}>
                <Row label="Cambio de PC" value={fmtDate(activo.fechaCambioPC)} />
                <Row label="Último mantenimiento" value={fmtDate(activo.fechaUltimoMantenimiento)} />
                <div className="py-2.5 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Estado</dt>
                  <dd><StatusBadge status={activo.estado} type="activo" /></dd>
                </div>
              </Card>

              {/* Observaciones */}
              {activo.observaciones && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={15} className="text-[#00a6d6]" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Observaciones</h3>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{activo.observaciones}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Historial de Mantenimiento ── */}
          {tab === 'historial' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold dark:text-white">Historial de Mantenimiento</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportarHistorialPDF}
                    className="flex items-center gap-1.5 text-sm border border-[#00a6d6] text-[#00a6d6] hover:bg-[#00a6d6]/10 dark:hover:bg-[#00a6d6]/20 px-3 py-1.5 rounded-lg transition-colors"
                    title="Exportar historial a PDF"
                  >
                    <FileDown size={14} />
                    <span className="hidden sm:inline">Exportar PDF</span>
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => setShowAddMant(v => !v)}
                      className="flex items-center gap-1.5 text-sm bg-[#00a6d6] hover:bg-[#0095c0] text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Registrar
                    </button>
                  )}
                </div>
              </div>

              {/* Formulario agregar mantenimiento */}
              {showAddMant && (
                <form onSubmit={handleAddMant} className="bg-[#e6f7fc] dark:bg-[#00a6d6]/10 border border-[#00a6d6]/30 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-[#00a6d6] dark:text-[#00c4f0]">Nuevo Registro de Mantenimiento</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha *</label>
                      <input type="date" value={mantForm.fecha}
                        onChange={e => setMantForm(p => ({ ...p, fecha: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                      <select value={mantForm.tipo}
                        onChange={e => setMantForm(p => ({ ...p, tipo: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6]"
                      >
                        <option>Preventivo</option>
                        <option>Correctivo</option>
                        <option>Actualización</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción *</label>
                    <textarea
                      value={mantForm.descripcion}
                      onChange={e => setMantForm(p => ({ ...p, descripcion: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] resize-none"
                      placeholder="Describí el trabajo realizado..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddMant(false)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={savingMant}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#00a6d6] text-white rounded-lg hover:bg-[#0095c0] transition-colors disabled:opacity-50">
                      <Check size={14} /> {savingMant ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de registros */}
              {activo.historialMantenimiento.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Calendar size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin registros de mantenimiento</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {activo.historialMantenimiento.map((m: MantenimientoRecord, i, arr) => (
                    <div key={m.id} className="flex gap-4">
                      <div className="flex flex-col items-center pt-1">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${m.tipo === 'Correctivo' ? 'bg-amber-400' : m.tipo === 'Actualización' ? 'bg-purple-400' : 'bg-[#00a6d6]'}`} />
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />}
                      </div>
                      <div className={`pb-5 flex-1 min-w-0 ${i === arr.length - 1 ? '' : ''}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold dark:text-white">{fmtDate(m.fecha)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              m.tipo === 'Correctivo' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                              m.tipo === 'Actualización' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                              'bg-[#e6f7fc] dark:bg-[#00a6d6]/20 text-[#00a6d6] dark:text-[#00c8f0]'
                            }`}>
                              {m.tipo}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500">por {m.tecnico}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{m.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* También mostrar intervenciones técnicas */}
              {intervenciones.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <Wrench size={14} className="text-[#00a6d6]" />
                    Intervenciones Técnicas ({intervenciones.length})
                  </h4>
                  <div className="space-y-3">
                    {intervenciones.map(i => (
                      <div key={i.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium dark:text-white">{i.tipo}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(i.fecha)}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{i.diagnostico}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Técnico: {i.tecnico}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tickets ── */}
          {tab === 'tickets' && (
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FileText size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay tickets relacionados a este equipo</p>
                </div>
              ) : (
                tickets.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="w-full text-left bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">#{t.id}</span>
                        <StatusBadge status={t.estado} type="ticket" />
                        <StatusBadge status={t.prioridad} type="prioridad" />
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(t.fechaCreacion).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1.5 line-clamp-2">
                      {t.descripcion}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}