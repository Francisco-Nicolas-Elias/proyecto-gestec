import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Pencil, Trash2, Monitor, HardDrive, Cpu, Wifi,
  MapPin, User, Calendar, Settings, Printer, X, FileText, FileDown, Lock, CircuitBoard, Package, Zap,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getActivoById, getTickets, deleteActivo,
  getHistorialComponentesByActivo,
  type Activo, type HistorialEquipoEntry, type HistorialComponenteMovimiento,
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

type Tab = 'hardware' | 'historial' | 'componentes' | 'tickets';

export default function ActivoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activo, setActivo] = useState<Activo | null>(null);
  const [historialComponentes, setHistorialComponentes] = useState<HistorialComponenteMovimiento[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('hardware');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = hasPermission('activos');

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [a, ticks, histComp] = await Promise.all([
        getActivoById(id!),
        getTickets(),
        getHistorialComponentesByActivo(id!),
      ]);
      if (!a) { toast.error('Equipo no encontrado'); navigate('/activos'); return; }
      setActivo(a);
      setTickets(ticks.filter((t: any) => t.activoId === id));
      setHistorialComponentes(histComp);
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
    doc.text('Historial del Equipo', 14, 22);
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

    // ── Historial del Equipo ──
    const historial = activo.historial ?? [];

    doc.setFontSize(9);
    doc.setTextColor(...cyan);
    doc.setFont('helvetica', 'bold');
    doc.text(`Historial del Equipo (${historial.length})`, 14, y);
    doc.setFont('helvetica', 'normal');
    y += 4;

    if (historial.length === 0) {
      doc.setTextColor(160, 160, 160);
      doc.setFontSize(8);
      doc.text('Sin registros de historial.', 14, y + 5);
      y += 12;
    } else {
      autoTable(doc, {
        startY: y,
        columns: [
          { header: 'Fecha',    dataKey: 'fecha'     },
          { header: 'Técnico',  dataKey: 'tecnico'   },
          { header: 'Cambios',  dataKey: 'cambios'   },
        ],
        body: historial.map((h: HistorialEquipoEntry) => ({
          fecha:     fmtDate(h.fecha),
          tecnico:   h.tecnico || '—',
          cambios:   h.cambios.length ? h.cambios.join('\n') : '—',
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
          fecha:     { cellWidth: 22 },
          tecnico:   { cellWidth: 30 },
          cambios:   { cellWidth: 'auto' as any },
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
        toast.success(`Historial exportado · ${historial.length} registros`);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename; a.click();
          URL.revokeObjectURL(url);
          toast.success(`Historial exportado · ${historial.length} registros`);
        }
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Historial exportado · ${historial.length} registros`);
    }
  };

  if (loading || authLoading) return <div className="p-6"><LoadingSpinner /></div>;
  if (!activo) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'hardware', label: 'Detalles Técnicos' },
    { id: 'historial', label: `Historial (${activo.historial.length})` },
    { id: 'componentes', label: `Historial Componentes (${historialComponentes.length})` },
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

                {/* Placa Madre */}
                <Card title="Placa Madre" icon={CircuitBoard}>
                  <Row label="Marca" value={activo.placaMadreMarca} />
                  <Row label="Modelo" value={activo.placaMadreModelo} />
                  <Row label="N° de Serie" value={activo.placaMadreNroSerie} />
                </Card>

                {/* Fuente */}
                <Card title="Fuente" icon={Zap}>
                  <Row label="Marca" value={activo.fuenteMarca} />
                  <Row label="Modelo" value={activo.fuenteModelo} />
                  <Row label="N° de Serie" value={activo.fuenteNroSerie} />
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
                  <Row label="Memoria" value={(activo as any).placaVideoCapacidad} />
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
                {activo.ramModulos && activo.ramModulos.length > 0 && (() => {
                  // Agrupar módulos por modelo para mostrar "2x ValueRAM DDR4"
                  const grupos: Record<string, { modulos: typeof activo.ramModulos; capacidad: string }> = {};
                  activo.ramModulos.forEach(m => {
                    const clave = `${m.marca} ${m.modelo}`.trim() || 'Sin modelo';
                    if (!grupos[clave]) grupos[clave] = { modulos: [], capacidad: m.capacidad };
                    grupos[clave].modulos.push(m);
                  });
                  return (
                    <div className="py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Módulos instalados ({activo.ramModulos.length})
                      </dt>
                      <dd className="space-y-2">
                        {Object.entries(grupos).map(([clave, { modulos, capacidad }]) => (
                          <div key={clave} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-800 dark:text-white">
                                {modulos.length > 1 ? `${modulos.length}×` : ''} {clave}
                              </span>
                              {capacidad && (
                                <span className="text-xs font-medium text-[#00a6d6] dark:text-[#00c4f0]">
                                  {modulos.length > 1 ? `${modulos.length}×${capacidad}` : capacidad}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                              {modulos.map((m, i) => (
                                <div key={m.id} className="font-mono">
                                  {modulos.length > 1 ? `#${i + 1} ` : ''}N° Serie: {m.nroSerie || '—'}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </dd>
                    </div>
                  );
                })()}
              </Card>

              {/* Impresora */}
              <Card title="Impresora" icon={Printer}>
                <Row label="Marca" value={activo.impresoraMarca} />
                <Row label="Modelo" value={activo.impresoraModelo} />
                <Row label="N° de Serie" value={activo.impresoraNroSerie} />
              </Card>

              {/* Otros periféricos — sin sección propia, gestionados desde Stock */}
              <Card title="Otros Periféricos" icon={Package}>
                {activo.otrosComponentes.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-2.5 text-center">Sin periféricos vinculados</p>
                ) : (
                  activo.otrosComponentes.map(c => (
                    <div key={c.id} className="py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{c.tipo}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{c.nroSerie}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{[c.marca, c.modelo].filter(Boolean).join(' ') || '—'}</p>
                    </div>
                  ))
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
                  Se vinculan/desvinculan desde Stock — Editar Componente.
                </p>
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

          {/* ── Historial del Equipo ── */}
          {tab === 'historial' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold dark:text-white">Historial del Equipo</h3>
                <button
                  onClick={exportarHistorialPDF}
                  className="flex items-center gap-1.5 text-sm border border-[#00a6d6] text-[#00a6d6] hover:bg-[#00a6d6]/10 dark:hover:bg-[#00a6d6]/20 px-3 py-1.5 rounded-lg transition-colors"
                  title="Exportar historial a PDF"
                >
                  <FileDown size={14} />
                  <span className="hidden sm:inline">Exportar PDF</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Se genera automáticamente cada vez que se edita el equipo con cambios reales. Para agregar una entrada, usá "Editar".
              </p>

              {/* Lista de registros */}
              {activo.historial.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Calendar size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin registros de historial</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {activo.historial.map((h: HistorialEquipoEntry, i, arr) => (
                    <div key={h.id} className="flex gap-4">
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-3 h-3 rounded-full shrink-0 bg-[#00a6d6]" />
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />}
                      </div>
                      <div className="pb-5 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <span className="text-sm font-semibold dark:text-white">{fmtDate(h.fecha)}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">por {h.tecnico}</span>
                        </div>
                        {h.cambios.length > 0 && (
                          <ul className="mt-1.5 space-y-1 list-disc list-inside">
                            {h.cambios.map((c, ci) => (
                              <li key={ci} className="text-sm text-gray-700 dark:text-gray-300">{c}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Historial de Componentes ── */}
          {tab === 'componentes' && (
            <div className="space-y-4">
              <h3 className="font-semibold dark:text-white">Historial de Cambios de Componentes</h3>
              {historialComponentes.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Cpu size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin cambios de componentes registrados</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {historialComponentes.map((h, i, arr) => {
                    const accionColor =
                      h.accion === 'instalado'   ? 'bg-green-500' :
                      h.accion === 'removido'    ? 'bg-red-400' :
                      h.accion === 'transferido' ? 'bg-blue-400' :
                                                   'bg-gray-400';
                    const accionBadge =
                      h.accion === 'instalado'   ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      h.accion === 'removido'    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                      h.accion === 'transferido' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
                    const accionLabel =
                      h.accion === 'instalado'   ? 'Instalado' :
                      h.accion === 'removido'    ? 'Removido' :
                      h.accion === 'transferido' ? 'Transferido' :
                                                   'Registrado';
                    return (
                      <div key={h.id} className="flex gap-4">
                        <div className="flex flex-col items-center pt-1">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${accionColor}`} />
                          {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />}
                        </div>
                        <div className="pb-5 flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold dark:text-white">{fmtDate(h.fecha)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accionBadge}`}>{accionLabel}</span>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {h.componente.tipoComponente.nombre} — {h.componente.marca.nombre} {h.componente.modelo}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">por {h.responsable}</span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">S/N: {h.componente.numeroSerie} · ID: {h.componente.idManual}</p>
                            {(h.ubicacionOrigen || h.ubicacionDestino) && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {h.ubicacionOrigen && <span>Desde: <span className="font-medium">{h.ubicacionOrigen}</span></span>}
                                {h.ubicacionOrigen && h.ubicacionDestino && <span className="mx-1">→</span>}
                                {h.ubicacionDestino && <span>Hacia: <span className="font-medium">{h.ubicacionDestino}</span></span>}
                              </p>
                            )}
                            {h.observaciones && <p className="text-xs text-gray-600 dark:text-gray-300 italic">{h.observaciones}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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