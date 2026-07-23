import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus, Search, Eye, Pencil, Trash2, Filter, X, Monitor,
  ChevronUp, ChevronDown as ChevronDownIcon, Calendar, FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  getActivos, deleteActivo, getSectores,
  type Activo,
} from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import { toast } from 'sonner@2.0.3';

type SortKey = keyof Activo | '';
type SortDir = 'asc' | 'desc';

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

// Colapsa espacios repetidos para que la búsqueda no falle por datos del Excel
// con espacios dobles (ej. "Laboratorio  2.5")
const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

const PAGE_SIZE = 30;

export default function Activos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [filtered, setFiltered] = useState<Activo[]>([]);
  const [sectores, setSectores] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterEstado, setFilterEstado] = useState(() => searchParams.get('estado') ?? '');
  const [showFilters, setShowFilters] = useState(!!searchParams.get('estado'));
  const [sortKey, setSortKey] = useState<SortKey>('nroPc');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [toDelete, setToDelete] = useState<Activo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [page, setPage] = useState(1);
  // Modal historial mantenimiento desde la grilla
  const [historialActivo, setHistorialActivo] = useState<Activo | null>(null);

  const canEdit = hasPermission('activos');

  // ── Barra de scroll horizontal fija al pie de la pantalla ─────────────────
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const bottomSpacerRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'grid' | 'bottom' | null>(null);
  const [showBottomScroll, setShowBottomScroll] = useState(false);

  useEffect(() => {
    const grid = gridScrollRef.current;
    const bar = bottomScrollRef.current;
    const spacer = bottomSpacerRef.current;
    if (!grid || !bar || !spacer) return;
    // Actualiza estilos vía refs (no estado) para no re-renderizar la grilla en cada medición
    const measure = () => {
      setShowBottomScroll(grid.scrollWidth > grid.clientWidth + 1);
      const rect = grid.getBoundingClientRect();
      bar.style.left = `${rect.left}px`;
      bar.style.width = `${rect.width}px`;
      spacer.style.width = `${grid.scrollWidth}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [filtered]);

  const handleGridScroll = () => {
    if (syncingRef.current === 'bottom') { syncingRef.current = null; return; }
    if (gridScrollRef.current && bottomScrollRef.current) {
      syncingRef.current = 'grid';
      bottomScrollRef.current.scrollLeft = gridScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (syncingRef.current === 'grid') { syncingRef.current = null; return; }
    if (gridScrollRef.current && bottomScrollRef.current) {
      syncingRef.current = 'bottom';
      gridScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [activos, search, filterSector, filterEstado, sortKey, sortDir]);

  // El input de búsqueda es no-controlado: así escribir no dispara el
  // re-render (pesado) de la grilla en cada tecla, solo al hacer una pausa
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); }, []);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearch(value), 250);
  };

  const loadData = async () => {
    try {
      const [data, sects] = await Promise.all([getActivos(), getSectores()]);
      setActivos(data);
      setSectores(sects);
    } catch { toast.error('Error al cargar equipos'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    setPage(1);
    let list = [...activos];
    if (search) {
      const words = normalize(search).split(' ').filter(Boolean);
      list = list.filter(a => {
        const text = [
          a.nroPc, a.usuario, a.sector, a.ip, a.mac, a.idAD, a.sistemaOperativo,
        ].map(normalize).join(' ');
        return words.every(w => text.includes(w));
      });
    }
    if (filterSector) list = list.filter(a => a.sector === filterSector);
    if (filterEstado) list = list.filter(a => a.estado === filterEstado);

    if (sortKey) {
      list.sort((a, b) => {
        const va = String(a[sortKey as keyof Activo] ?? '').toLowerCase();
        const vb = String(b[sortKey as keyof Activo] ?? '').toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    setFiltered(list);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteActivo(toDelete.id);
      setActivos(prev => prev.filter(a => a.id !== toDelete.id));
      toast.success(`PC ${toDelete.nroPc} eliminado`);
      setToDelete(null);
    } catch { toast.error('Error al eliminar'); }
    finally { setDeleting(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDownIcon size={13} className="text-gray-300 dark:text-gray-600" />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-[#00a6d6]" />
      : <ChevronDownIcon size={13} className="text-[#00a6d6]" />;
  };

  const Th = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-[#00a6d6] dark:hover:text-[#00c4f0] select-none ${className}`}
    >
      <span className="flex items-center gap-1">{label}<SortIcon col={col} /></span>
    </th>
  );

  const clearFilters = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchInputRef.current) searchInputRef.current.value = '';
    setSearch('');
    setFilterSector('');
    setFilterEstado('');
    setPage(1);
  };
  const hasActiveFilters = search || filterSector || filterEstado;

  // ── Exportar grilla a PDF ─────────────────────────────────────────────────
  const exportToPDF = async () => {
    if (exportingPDF || filtered.length === 0) return;
    setExportingPDF(true);
    try {
      // A4 landscape: 297 × 210 mm
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();   // 297
      const pageH = doc.internal.pageSize.getHeight();  // 210
      const MX = 7;   // horizontal margin (left & right)
      const usableW = pageW - MX * 2;                  // 283 mm usable
      const cyan:     [number, number, number] = [0, 166, 214];
      const cyanDark: [number, number, number] = [0, 100, 130];

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const fechaExport = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const filename = `equipos_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.pdf`;

      // ── Estilos comunes para ambas tablas ──────────────────────────────────
      const headStyles = {
        fillColor:   cyan,
        textColor:   [255, 255, 255] as [number, number, number],
        fontStyle:   'bold'   as const,
        fontSize:    7.5,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
        halign:      'center' as const,
      };
      const bodyStyles = {
        fontSize:    7.5,
        textColor:   [30, 30, 30] as [number, number, number],
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      };
      const tableMargin = { left: MX, right: MX, top: 20, bottom: 12 };

      // ── Datos calculados una sola vez ──────────────────────────────────────
      const filtrosActivos: string[] = [];
      if (search)       filtrosActivos.push(`Búsqueda: "${search}"`);
      if (filterSector) filtrosActivos.push(`Sector: ${filterSector}`);
      if (filterEstado) filtrosActivos.push(`Estado: ${filterEstado === 'activa' ? 'Activo' : 'Inactivo'}`);

      const bodyData = filtered.map(a => ({
        nroPc:     a.nroPc,
        usuario:   a.usuario   || '—',
        sector:    a.sector    || '—',
        piso:      a.piso      || '—',
        oficina:   a.oficina   || '—',
        cpuMarca:  a.microMarca  || '—',
        cpuModelo: a.microModelo || '—',
        ram:       a.ramTotal    || '—',
        almMarca:
          (a.almacenamientoModulos && a.almacenamientoModulos.length > 0)
            ? a.almacenamientoModulos.map(m => m.marca).filter(Boolean).join(' / ') || '—'
            : a.discoMarca || '—',
        almModelo:
          (a.almacenamientoModulos && a.almacenamientoModulos.length > 0)
            ? a.almacenamientoModulos.map(m => m.modelo).filter(Boolean).join(' / ') || '—'
            : a.discoModelo || '—',
        almTotal:  a.almacenamientoTotal || '—',
        gpu:       (a.placaVideoMarca || a.placaVideoModelo)
          ? `${a.placaVideoMarca} ${a.placaVideoModelo}`.trim()
          : '------',
        ip:        a.ip   || '—',
        mac:       a.mac  || '—',
        idAD:      a.idAD || '—',
        pAD:       a.pAD  || '—',
        so:        a.sistemaOperativo || '—',
        cambioPC:  fmtDate(a.fechaCambioPC),
        ultMant:   fmtDate(a.fechaUltimoMantenimiento),
        estado:    a.estado === 'activa' ? 'Activo' : 'Inactivo',
      }));

      // ── Helpers ────────────────────────────────────────────────────────────

      /** Dibuja el banner cyan institucional en la página actual */
      const drawPageHeader = (subtitulo: string) => {
        doc.setFillColor(...cyan);
        doc.rect(0, 0, pageW, 26, 'F');
        doc.setFillColor(...cyanDark);
        doc.rect(0, 22, pageW, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('GESTEC — Colegio Universitario IES', MX, 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(subtitulo, MX, 19);
        doc.text(`Exportado: ${fechaExport}`, pageW - MX, 19, { align: 'right' });
      };

      /** Mini-banner cyan en páginas de continuación (autoTable overflow) */
      const drawContinuationBanner = (secLabel: string) => {
        doc.setFillColor(...cyan);
        doc.rect(0, 0, pageW, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('GESTEC — Inventario de Equipos — continuación', MX, 9);
        doc.setFont('helvetica', 'normal');
        doc.text(secLabel, pageW - MX, 9, { align: 'right' });
      };

      /** Bloque de filtros aplicados (amarillo suave) */
      const drawFilters = (y: number): number => {
        if (filtrosActivos.length === 0) return y;
        doc.setFillColor(255, 249, 215);
        doc.setDrawColor(200, 155, 0);
        doc.setLineWidth(0.3);
        doc.roundedRect(MX, y, usableW, 9, 2, 2, 'FD');
        doc.setFontSize(7.5);
        doc.setTextColor(110, 70, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('Filtros aplicados:', MX + 3, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(filtrosActivos.join('   |   '), MX + 38, y + 6);
        return y + 13;
      };

      /** Cabecera de sección (pill cyan claro) */
      const drawSectionLabel = (y: number, label: string): number => {
        doc.setFillColor(225, 245, 252);
        doc.setDrawColor(...cyan);
        doc.setLineWidth(0.4);
        doc.roundedRect(MX, y, usableW, 10, 2, 2, 'FD');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 90, 130);
        doc.setFont('helvetica', 'bold');
        doc.text(label, MX + 3, y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(
          `${filtered.length} equipo${filtered.length !== 1 ? 's' : ''}  ·  ${sortKey ? `Ordenado: ${String(sortKey)} ${sortDir === 'asc' ? '↑' : '↓'}` : 'sin orden'}`,
          pageW - MX, y + 7, { align: 'right' },
        );
        return y + 13;
      };

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN 1 / 2 — Identificación y Hardware
      // Columnas: N°PC · Usuario · Sector · Piso · Oficina ·
      //           CPU Marca · CPU Modelo · RAM · Alm.Marca · Alm.Modelo · Alm.Total
      // Ancho total: 14+26+24+13+19+18+27+13+18+27+15 = 214 mm  ✓ (< 283)
      // ══════════════════════════════════════════════════════════════════════
      drawPageHeader('Inventario de Equipos — Sección 1/2: Identificación y Hardware');
      let y1 = 31;
      y1 = drawFilters(y1);
      y1 = drawSectionLabel(y1, 'Sección 1 de 2 — Identificación y Hardware del Equipo');

      autoTable(doc, {
        startY: y1,
        margin: tableMargin,
        columns: [
          { header: 'N° PC',        dataKey: 'nroPc'      },
          { header: 'Usuario',      dataKey: 'usuario'    },
          { header: 'Sector',       dataKey: 'sector'     },
          { header: 'Piso',         dataKey: 'piso'       },
          { header: 'Oficina',      dataKey: 'oficina'    },
          { header: 'CPU Marca',    dataKey: 'cpuMarca'   },
          { header: 'CPU Modelo',   dataKey: 'cpuModelo'  },
          { header: 'RAM',          dataKey: 'ram'        },
          { header: 'Alm. Marca',   dataKey: 'almMarca'   },
          { header: 'Alm. Modelo',  dataKey: 'almModelo'  },
          { header: 'Alm. Total',   dataKey: 'almTotal'   },
          { header: 'GPU',          dataKey: 'gpu'        },
        ],
        body: bodyData,
        theme: 'grid',
        headStyles,
        bodyStyles,
        alternateRowStyles: { fillColor: [235, 248, 253] },
        columnStyles: {
          nroPc:     { cellWidth: 14, fontStyle: 'bold', halign: 'center', textColor: [0, 100, 140] as [number,number,number] },
          usuario:   { cellWidth: 24 },
          sector:    { cellWidth: 22 },
          piso:      { cellWidth: 12, halign: 'center' },
          oficina:   { cellWidth: 17 },
          cpuMarca:  { cellWidth: 16 },
          cpuModelo: { cellWidth: 25 },
          ram:       { cellWidth: 12, halign: 'center' },
          almMarca:  { cellWidth: 16 },
          almModelo: { cellWidth: 25 },
          almTotal:  { cellWidth: 14, halign: 'center' },
          gpu:       { cellWidth: 28 },
        },
        didDrawPage: (data: any) => {
          if (data.pageNumber > 1) drawContinuationBanner('Sección 1/2: Identificación y Hardware');
        },
      });

      // ══════════════════════════════════════════════════════════════════════
      // SECCIÓN 2 / 2 — Red, Acceso y Estado
      // Columnas: N°PC · IP · MAC · ID AD · P AD · S.O. · Cambio PC · Últ.Mant. · Estado
      // Ancho total: 14+30+36+25+20+22+20+20+16 = 203 mm  ✓ (< 283)
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      drawPageHeader('Inventario de Equipos — Sección 2/2: Red, Acceso y Estado');
      let y2 = 31;
      y2 = drawFilters(y2);
      y2 = drawSectionLabel(y2, 'Sección 2 de 2 — Red, Acceso y Estado');

      autoTable(doc, {
        startY: y2,
        margin: tableMargin,
        columns: [
          { header: 'N° PC',       dataKey: 'nroPc'    },
          { header: 'IP',          dataKey: 'ip'        },
          { header: 'MAC',         dataKey: 'mac'       },
          { header: 'ID AD',       dataKey: 'idAD'      },
          { header: 'P AD',        dataKey: 'pAD'       },
          { header: 'S.O.',        dataKey: 'so'        },
          { header: 'Cambio PC',   dataKey: 'cambioPC'  },
          { header: 'Últ. Mant.',  dataKey: 'ultMant'   },
          { header: 'Estado',      dataKey: 'estado'    },
        ],
        body: bodyData,
        theme: 'grid',
        headStyles,
        bodyStyles,
        alternateRowStyles: { fillColor: [235, 248, 253] },
        columnStyles: {
          nroPc:    { cellWidth: 14, fontStyle: 'bold', halign: 'center', textColor: [0, 100, 140] as [number,number,number] },
          ip:       { cellWidth: 30, font: 'courier', halign: 'center' },
          mac:      { cellWidth: 36, font: 'courier', halign: 'center' },
          idAD:     { cellWidth: 25 },
          pAD:      { cellWidth: 20, font: 'courier', halign: 'center' },
          so:       { cellWidth: 22 },
          cambioPC: { cellWidth: 20, halign: 'center' },
          ultMant:  { cellWidth: 20, halign: 'center' },
          estado:   { cellWidth: 16, halign: 'center' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.dataKey === 'estado') {
            const val = data.cell.raw as string;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = val === 'Activo'
              ? [5, 120, 50] as [number,number,number]
              : [180, 50, 50] as [number,number,number];
          }
        },
        didDrawPage: (data: any) => {
          if (data.pageNumber > 1) drawContinuationBanner('Sección 2/2: Red, Acceso y Estado');
        },
      });

      // ── Pie de página global (post-processing con total real) ──────────────
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(6.5);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `GESTEC – Colegio Universitario IES  |  Pág. ${p} de ${totalPages}`,
          pageW / 2, pageH - 5, { align: 'center' },
        );
      }

      // ── Guardar PDF ────────────────────────────────────────────────────────
      const url = URL.createObjectURL(doc.output('blob'));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`PDF exportado: ${filtered.length} equipo${filtered.length !== 1 ? 's' : ''} · ${totalPages} página${totalPages !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const exportarEquiposExcel = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmtFecha = (v: string | null | undefined) => {
      if (!v) return '';
      const [y, m, day] = v.split('-');
      return `${day}/${m}/${y}`;
    };
    const rows = filtered.map(a => ({
      'N° PC':        a.nroPc || '',
      'Usuario':      a.usuario || '',
      'Sector':       a.sector || '',
      'Piso':         a.piso || '',
      'Oficina':      a.oficina || '',
      'CPU Marca':    a.microMarca || '',
      'CPU Modelo':   a.microModelo || '',
      'Placa Madre':  a.placaMadreMarca || '',
      'RAM Total':    a.ramTotal || '',
      'Alm. Marca':   (a.almacenamientoModulos?.length > 0 ? a.almacenamientoModulos.map((m: any) => m.marca).filter(Boolean).join(' / ') : a.discoMarca) || '',
      'Alm. Modelo':  (a.almacenamientoModulos?.length > 0 ? a.almacenamientoModulos.map((m: any) => m.modelo).filter(Boolean).join(' / ') : a.discoModelo) || '',
      'Alm. Total':   a.almacenamientoTotal || '',
      'GPU':          [a.placaVideoMarca, a.placaVideoModelo].filter(Boolean).join(' ') || '',
      'IP':           a.ip || '',
      'MAC':          a.mac || '',
      'ID AD':        a.idAD || '',
      'P AD':         a.pAD || '',
      'S.O.':         a.sistemaOperativo || '',
      'Cambio PC':    fmtFecha(a.fechaCambioPC),
      'Últ. Mant.':   fmtFecha(a.fechaUltimoMantenimiento),
      'Estado':       a.estado === 'activa' ? 'Activo' : 'Inactivo',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
    XLSX.writeFile(wb, `equipos_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.xlsx`);
    toast.success(`Excel exportado · ${filtered.length} equipo${filtered.length !== 1 ? 's' : ''}`);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading || authLoading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} equipo{filtered.length !== 1 ? 's' : ''} registrado{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Exportar a Excel */}
          <button
            onClick={exportarEquiposExcel}
            disabled={filtered.length === 0}
            title={filtered.length === 0 ? 'No hay datos para exportar' : `Exportar ${filtered.length} equipo${filtered.length !== 1 ? 's' : ''} a Excel`}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-green-500 text-green-600 dark:text-green-400 dark:border-green-500 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
          {/* Exportar a PDF */}
          <button
            onClick={exportToPDF}
            disabled={exportingPDF || filtered.length === 0}
            title={filtered.length === 0 ? 'No hay datos para exportar' : `Exportar ${filtered.length} equipo${filtered.length !== 1 ? 's' : ''} a PDF`}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#00a6d6] hover:text-[#00a6d6] dark:hover:text-[#00c4f0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={16} className={exportingPDF ? 'animate-bounce' : ''} />
            <span className="hidden sm:inline">{exportingPDF ? 'Generando...' : 'Exportar PDF'}</span>
          </button>
          {canEdit && (
            <button
              onClick={() => navigate('/activos/nuevo')}
              className="flex items-center gap-2 bg-[#00a6d6] hover:bg-[#0095c0] text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>Nuevo Equipo</span>
            </button>
          )}
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por N° PC, usuario, sector, IP, MAC, ID AD, S.O..."
              defaultValue={search}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => {
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  if (searchInputRef.current) searchInputRef.current.value = '';
                  setSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${showFilters || hasActiveFilters
              ? 'bg-[#00a6d6]/10 border-[#00a6d6] text-[#00a6d6] dark:text-[#00c4f0]'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filtros</span>
            {hasActiveFilters && <span className="w-2 h-2 bg-[#00a6d6] rounded-full" />}
          </button>
          {(filterSector || filterEstado) && (
            <button onClick={clearFilters} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" title="Limpiar filtros">
              <X size={16} />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sector</label>
              <SearchableSelect
                options={sectores}
                value={filterSector}
                onChange={setFilterSector}
                placeholder="Todos los sectores"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Estado</label>
              <SearchableSelect
                options={[{ value: 'activa', label: 'Activo' }, { value: 'inactiva', label: 'Inactivo' }]}
                value={filterEstado}
                onChange={setFilterEstado}
                placeholder="Todos"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div ref={gridScrollRef} onScroll={handleGridScroll} className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <Th col="nroPc"     label="N° PC"         className="pl-4 sticky left-0 bg-gray-50 dark:bg-gray-700 z-10" />
                <Th col="usuario"   label="Usuario"            className="hidden sm:table-cell" />
                <Th col="sector"    label="Sector" />
                <Th col="piso"      label="Piso"           className="hidden xl:table-cell" />
                <Th col="oficina"   label="Oficina"        className="hidden xl:table-cell" />
                <Th col="microMarca" label="CPU Marca"     className="hidden md:table-cell" />
                <Th col="microModelo" label="CPU Modelo"   className="hidden lg:table-cell" />
                <Th col="placaMadreMarca" label="Placa Madre" className="hidden xl:table-cell" />
                <Th col="ramTotal"  label="RAM Total"      className="hidden md:table-cell" />
                <Th col="discoMarca"  label="Alm. Marca"  className="hidden xl:table-cell" />
                <Th col="discoModelo" label="Alm. Modelo" className="hidden xl:table-cell" />
                <Th col="almacenamientoTotal" label="Alm. Total" className="hidden lg:table-cell" />
                <Th col="placaVideoMarca" label="GPU"      className="hidden xl:table-cell" />
                <Th col="ip"        label="IP"             className="hidden lg:table-cell" />
                <Th col="mac"       label="MAC"            className="hidden xl:table-cell" />
                <Th col="idAD"      label="ID AD"          className="hidden xl:table-cell" />
                <Th col="pAD"       label="P AD"           className="hidden xl:table-cell" />
                <Th col="sistemaOperativo" label="S.O."    className="hidden lg:table-cell" />
                <Th col="fechaCambioPC"    label="Cambio PC" className="hidden xl:table-cell" />
                <Th col="fechaUltimoMantenimiento" label="Últ. Mant." className="hidden lg:table-cell" />
                <Th col="estado"    label="Estado" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-gray-700 z-10">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-4 py-16 text-center">
                    <Monitor size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron equipos</p>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="mt-2 text-sm text-[#00a6d6] hover:underline">
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRows.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                    {/* N° PC - sticky */}
                    <td className="px-4 py-2.5 sticky left-0 z-10 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 transition-colors">
                      <span className="font-mono font-semibold text-sm text-[#00a6d6] dark:text-[#00a6d6]">
                        {a.nroPc}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap hidden sm:table-cell">{a.usuario || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{a.sector}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden xl:table-cell">{a.piso}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden xl:table-cell">{a.oficina || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden md:table-cell">{a.microMarca || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden lg:table-cell">{a.microModelo || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden xl:table-cell">
                      {(a.placaMadreMarca || a.placaMadreModelo)
                        ? `${a.placaMadreMarca} ${a.placaMadreModelo}`.trim()
                        : <span className="text-gray-400 font-mono tracking-widest">------</span>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden md:table-cell">{a.ramTotal || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden xl:table-cell">
                      {(a.almacenamientoModulos && a.almacenamientoModulos.length > 0)
                        ? a.almacenamientoModulos.map(m => m.marca).filter(Boolean).join(' / ') || '—'
                        : a.discoMarca || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden xl:table-cell">
                      {(a.almacenamientoModulos && a.almacenamientoModulos.length > 0)
                        ? a.almacenamientoModulos.map(m => m.modelo).filter(Boolean).join(' / ') || '—'
                        : a.discoModelo || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden lg:table-cell">{a.almacenamientoTotal || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden xl:table-cell">
                      {(a.placaVideoMarca || a.placaVideoModelo)
                        ? `${a.placaVideoMarca} ${a.placaVideoModelo}`.trim()
                        : <span className="text-gray-400 font-mono tracking-widest">------</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap hidden lg:table-cell">{a.ip || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap hidden xl:table-cell">{a.mac || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap hidden xl:table-cell">{a.idAD || '—'}</td>
                    {/* P AD — mostrar solo valor encriptado */}
                    <td className="px-3 py-2.5 whitespace-nowrap hidden xl:table-cell">
                      {a.pAD ? (
                        <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono text-xs text-gray-700 dark:text-gray-300 tracking-widest">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          {a.pAD}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap hidden lg:table-cell">{a.sistemaOperativo || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap hidden xl:table-cell">{fmtDate(a.fechaCambioPC)}</td>
                    {/* Último mantenimiento - clickable */}
                    <td className="px-3 py-2.5 whitespace-nowrap hidden lg:table-cell">
                      {a.fechaUltimoMantenimiento ? (
                        <button
                          onClick={() => setHistorialActivo(a)}
                          className="flex items-center gap-1 text-sm text-[#00a6d6] dark:text-[#00c4f0] hover:underline"
                          title="Ver historial de mantenimiento"
                        >
                          <Calendar size={13} />
                          {fmtDate(a.fechaUltimoMantenimiento)}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusBadge status={a.estado} type="activo" />
                    </td>
                    {/* Acciones - sticky */}
                    <td className="px-3 py-2.5 sticky right-0 z-10 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 transition-colors">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/activos/${a.id}`)}
                          title="Ver detalle"
                          className="p-2 rounded-lg hover:bg-[#00a6d6]/10 text-gray-500 hover:text-[#00a6d6] dark:text-gray-400 dark:hover:text-[#00c4f0] transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => navigate(`/activos/${a.id}/editar`)}
                              title="Editar"
                              className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setToDelete(a)}
                              title="Eliminar"
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} equipos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Anterior
              </button>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <span>Pág.</span>
                <input
                  key={page}
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={page}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = parseInt((e.target as HTMLInputElement).value);
                      if (!isNaN(v) && v >= 1 && v <= totalPages) setPage(v);
                    }
                  }}
                  onBlur={e => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 1 && v <= totalPages) setPage(v);
                    else e.target.value = String(page);
                  }}
                  className="w-12 text-center px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span>de {totalPages}</span>
              </div>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barra de scroll horizontal fija al pie de la pantalla */}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        className={`fixed bottom-0 z-30 h-4 overflow-x-auto overflow-y-hidden bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${showBottomScroll ? '' : 'hidden'}`}
      >
        <div ref={bottomSpacerRef} style={{ height: 1 }} />
      </div>

      {/* Modal Eliminar */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setToDelete(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">¿Eliminar equipo?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Se eliminará <strong className="text-[#00a6d6]">{toDelete.nroPc}</strong> ({toDelete.usuario}) de forma permanente.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Mantenimiento */}
      {historialActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHistorialActivo(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-semibold dark:text-white">Historial de Mantenimiento</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {historialActivo.nroPc} — {historialActivo.usuario}
                </p>
              </div>
              <button onClick={() => setHistorialActivo(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3">
              {historialActivo.historialMantenimiento.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Sin registros</p>
              ) : (
                historialActivo.historialMantenimiento.map(m => (
                  <div key={m.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${m.tipo === 'Correctivo' ? 'bg-amber-400' : 'bg-[#00a6d6]'}`} />
                      <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                    </div>
                    <div className="pb-4 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium dark:text-white">{fmtDate(m.fecha)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${m.tipo === 'Correctivo' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-[#e6f7fc] dark:bg-[#00a6d6]/20 text-[#00a6d6] dark:text-[#00c8f0]'}`}>
                          {m.tipo}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{m.descripcion}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Técnico: {m.tecnico}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => { navigate(`/activos/${historialActivo.id}`); setHistorialActivo(null); }}
                className="text-sm text-[#00a6d6] hover:underline"
              >
                Ver detalle completo →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}