import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, Search, Filter, X, TrendingDown, Package, Cpu, Pencil, Trash2, Clock, Monitor, Warehouse, Eye, BarChart3, CheckCircle2, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  getStock, getComponentes, deleteComponente,
  type Componente,
} from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import EditarComponenteModal from '../components/EditarComponenteModal';
import HistorialComponenteModal from '../components/HistorialComponenteModal';
import SearchableSelect from '../components/SearchableSelect';
import { toast } from 'sonner@2.0.3';

const normalize = (s: string) => (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ');

export default function Stock() {
  const navigate = useNavigate();
  const { hasPermission, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  // ── Stock Items (inventario de cantidades) ──
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState(() => {
    const e = searchParams.get('estado') || '';
    // Solo acepta valores válidos del selector; cualquier otro valor se ignora
    return ['ok', 'bajo', 'critico'].includes(e) ? e : '';
  });
  const [filterCategoria, setFilterCategoria] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAlertasModal, setShowAlertasModal] = useState(false);

  // ── Componentes ──
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [componenteSearch, setComponenteSearch] = useState('');
  const [compPage, setCompPage] = useState(1);

  // ── Filtros de columna de componentes ──
  const [compFilterId, setCompFilterId] = useState('');
  const [compFilterTipo, setCompFilterTipo] = useState('');
  const [compFilterFecha, setCompFilterFecha] = useState('');
  const [compFilterProveedor, setCompFilterProveedor] = useState('');
  const [showCompFilters, setShowCompFilters] = useState(false);

  // ── Ordenamiento de componentes ──
  const [compSort, setCompSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  // ── Acciones de componente ──
  const [componenteToEdit, setComponenteToEdit] = useState<Componente | null>(null);
  const [componenteHistorial, setComponenteHistorial] = useState<Componente | null>(null);
  const [componenteToDelete, setComponenteToDelete] = useState<Componente | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Detalle por modelo (Control de Stock) ──
  const [stockDetalleItem, setStockDetalleItem] = useState<any | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [stockData, compData] = await Promise.all([getStock(), getComponentes()]);
      setItems(stockData);
      setComponentes(compData);
    } catch (error) {
      console.error('Error loading stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const reloadStockItems = async () => {
    try { setItems(await getStock()); }
    catch (error) { console.error('Error recargando stock:', error); }
  };

  const clearCompFilters = () => {
    if (compSearchDebounceRef.current) clearTimeout(compSearchDebounceRef.current);
    if (compSearchInputRef.current) compSearchInputRef.current.value = '';
    setCompFilterId('');
    setCompFilterTipo('');
    setCompFilterFecha('');
    setCompFilterProveedor('');
    setComponenteSearch('');
    setCompPage(1);
  };

  const hasCompFilters = compFilterId || compFilterTipo || compFilterFecha || compFilterProveedor || componenteSearch;

  const clearFilters = () => { setSearchTerm(''); setFilterEstado(''); setFilterCategoria(''); };

  const handleCompSort = React.useCallback((key: string) => {
    setCompSort(prev =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  }, []);

  // Filtrado y ordenamiento como useMemo: una sola pasada, sin setState ni doble render
  const filteredItems = useMemo(() => {
    let list = items;
    if (searchTerm.trim()) {
      const words = normalize(searchTerm).split(' ').filter(Boolean);
      list = list.filter(i => {
        const text = [i.nombre, i.categoria, i.proveedor ?? ''].map(normalize).join(' ');
        return words.every(w => text.includes(w));
      });
    }
    if (filterEstado) list = list.filter(i => i.estado === filterEstado);
    if (filterCategoria) list = list.filter(i => i.categoria === filterCategoria);
    return list;
  }, [items, searchTerm, filterEstado, filterCategoria]);

  const filteredComponentes = useMemo(() => {
    let list = componentes;
    if (componenteSearch.trim()) {
      const words = normalize(componenteSearch).split(' ').filter(Boolean);
      list = list.filter(c => {
        const text = [
          c.idManual, c.codigoExcel, c.tipoComponente, c.marca, c.modelo,
          c.numeroSerie, c.ubicacion, c.proveedor, c.responsable,
        ].map(normalize).join(' ');
        return words.every(w => text.includes(w));
      });
    }
    if (compFilterId.trim()) list = list.filter(c =>
      normalize(c.idManual).includes(normalize(compFilterId)) ||
      normalize(c.codigoExcel ?? '').includes(normalize(compFilterId))
    );
    if (compFilterTipo) list = list.filter(c => c.tipoComponente === compFilterTipo);
    if (compFilterFecha) list = list.filter(c => c.fecha === compFilterFecha);
    if (compFilterProveedor) list = list.filter(c => c.proveedor === compFilterProveedor);
    return list;
  }, [componentes, componenteSearch, compFilterId, compFilterTipo, compFilterFecha, compFilterProveedor]);

  const sortedComponentes = useMemo(() => compSort
    ? [...filteredComponentes].sort((a, b) => {
        const valA = String(a[compSort.key as keyof typeof a] ?? '');
        const valB = String(b[compSort.key as keyof typeof b] ?? '');
        const cmp = valA.localeCompare(valB, 'es', { numeric: true });
        return compSort.dir === 'asc' ? cmp : -cmp;
      })
    : filteredComponentes,
  [filteredComponentes, compSort]);

  const COMP_PAGE_SIZE = 30;
  const compTotalPages = Math.ceil(sortedComponentes.length / COMP_PAGE_SIZE);
  const pagedComponentes = useMemo(
    () => sortedComponentes.slice((compPage - 1) * COMP_PAGE_SIZE, compPage * COMP_PAGE_SIZE),
    [sortedComponentes, compPage],
  );

  // Resetear página cuando cambian filtros
  useEffect(() => { setCompPage(1); }, [filteredComponentes]);

  const categorias      = useMemo(() => [...new Set(items.map(i => i.categoria))], [items]);
  const itemsBajos      = useMemo(() => items.filter(i => i.estado === 'bajo' || i.estado === 'critico'), [items]);
  const compTipos       = useMemo(() => [...new Set(componentes.map(c => c.tipoComponente))].sort((a, b) => a.localeCompare(b, 'es')), [componentes]);
  const compProveedores = useMemo(() => [...new Set(componentes.map(c => c.proveedor))].sort((a, b) => a.localeCompare(b, 'es')), [componentes]);
  const compFechas      = useMemo(() => [...new Set(componentes.map(c => c.fecha))].sort().reverse(), [componentes]);

  // Input de búsqueda de componentes no controlado para no re-renderizar en cada tecla
  const compSearchInputRef = useRef<HTMLInputElement>(null);
  const compSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCompSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (compSearchDebounceRef.current) clearTimeout(compSearchDebounceRef.current);
    compSearchDebounceRef.current = setTimeout(() => setComponenteSearch(value), 250);
  };

  // Formato de fecha para componentes
  const formatFecha = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calcula el desglose por modelo para un tipo de componente dado
  const getDetalleModelos = (tipoComponente: string) => {
    const grupos: Record<string, { total: number; activos: number; deposito: number }> = {};
    componentes
      .filter(c => c.tipoComponente === tipoComponente)
      .forEach(c => {
        const key = c.capacidad
          ? `${c.marca} ${c.modelo} ${c.capacidad}`
          : `${c.marca} ${c.modelo}`;
        if (!grupos[key]) grupos[key] = { total: 0, activos: 0, deposito: 0 };
        grupos[key].total++;
        if (c.activoId) grupos[key].activos++;
        else grupos[key].deposito++;
      });
    return Object.entries(grupos)
      .map(([modelo, g]) => ({ modelo, ...g }))
      .sort((a, b) => b.total - a.total);
  };

  // ── Exportar Componentes a PDF ──
  const exportarComponentesPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const cyan: [number, number, number] = [0, 166, 214];
    const cyanDark: [number, number, number] = [0, 100, 130];
    const fechaExport = new Date().toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    // Banda de cabecera
    doc.setFillColor(...cyan);
    doc.rect(0, 0, pageW, 30, 'F');
    doc.setFillColor(...cyanDark);
    doc.rect(0, 26, pageW, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text('GESTEC — Colegio Universitario IES', 14, 12);
    doc.setFontSize(9);
    doc.text('Componentes Registrados — Inventario de Stock', 14, 21);
    doc.text(`Exportado: ${fechaExport}`, pageW - 14, 21, { align: 'right' });
    // Info filtros
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);
    let yInfo = 38;
    const activeFilters = [
      componenteSearch && `Búsqueda: "${componenteSearch}"`,
      compFilterId && `ID: "${compFilterId}"`,
      compFilterTipo && `Componente: "${compFilterTipo}"`,
      compFilterFecha && `Fecha: "${formatFecha(compFilterFecha)}"`,
      compFilterProveedor && `Proveedor: "${compFilterProveedor}"`,
    ].filter(Boolean);
    if (activeFilters.length) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Filtros activos: ${activeFilters.join(' | ')}`, 14, yInfo);
      yInfo += 6;
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Total de registros exportados: ${sortedComponentes.length}`, 14, yInfo);
    yInfo += 8;
    // Tabla
    autoTable(doc, {
      startY: yInfo,
      columns: [
        { header: 'ID',          dataKey: 'idManual'    },
        { header: 'Tipo',        dataKey: 'tipo'        },
        { header: 'Marca',       dataKey: 'marca'       },
        { header: 'Modelo',      dataKey: 'modelo'      },
        { header: 'Capacidad',   dataKey: 'capacidad'   },
        { header: 'N\u00b0 Serie',    dataKey: 'numeroSerie' },
        { header: 'Ubicaci\u00f3n',   dataKey: 'ubicacion'   },
        { header: 'Proveedor',   dataKey: 'proveedor'   },
        { header: 'Fecha',       dataKey: 'fecha'       },
        { header: 'Responsable', dataKey: 'responsable' },
      ],
      body: sortedComponentes.map(c => ({
        idManual:    c.codigoExcel ? `${c.idManual}\n#${c.codigoExcel}` : c.idManual,
        tipo:        c.tipoComponente,
        marca:       c.marca,
        modelo:      c.modelo,
        capacidad:   c.capacidad || '—',
        numeroSerie: c.numeroSerie,
        ubicacion:   c.activoId ? c.ubicacion : 'Dep\u00f3sito IT',
        proveedor:   c.proveedor,
        fecha:       formatFecha(c.fecha),
        responsable: c.responsable,
      })),
      theme: 'grid',
      // Estilos de cabecera: sin wrap forzado, tamaño suficiente
      headStyles: {
        fillColor: cyan,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
        overflow: 'visible',
        minCellHeight: 10,
      },
      bodyStyles: { fontSize: 7, textColor: [40, 40, 40], cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [237, 248, 254] },
      columnStyles: {
        idManual:    { fontStyle: 'bold', textColor: [0, 100, 140] as [number, number, number], cellWidth: 20 },
        tipo:        { cellWidth: 26 },
        marca:       { cellWidth: 22 },
        modelo:      { cellWidth: 28 },
        // ancho aumentado para que "Capacidad" entre en una sola línea
        capacidad:   { cellWidth: 26, halign: 'center' },
        numeroSerie: { cellWidth: 30 },
        ubicacion:   { cellWidth: 32 },
        proveedor:   { cellWidth: 25 },
        fecha:       { cellWidth: 22 },
      },
      didDrawPage: (data: any) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `GESTEC \u2013 Colegio Universitario IES  |  P\u00e1g. ${data.pageNumber} de ${pageCount}`,
          pageW / 2, pageH - 7, { align: 'center' },
        );
      },
    });

    // ── Nombre de archivo con fecha y hora exacta ──
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `stock_componentes_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.pdf`;

    // ── Guardar: preferir "Guardar como" nativo del navegador ──
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
        toast.success(`PDF guardado · ${sortedComponentes.length} componente${filteredComponentes.length !== 1 ? 's' : ''}`);
      } catch (err: any) {
        // El usuario canceló el diálogo → no mostrar error
        if (err?.name !== 'AbortError') {
          // Fallback ante error inesperado
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`PDF exportado · ${sortedComponentes.length} componente${filteredComponentes.length !== 1 ? 's' : ''}`);
        }
      }
    } else {
      // Fallback para navegadores sin File System Access API
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`PDF exportado · ${sortedComponentes.length} componente${filteredComponentes.length !== 1 ? 's' : ''}`);
    }
  };

  // ── Exportar Componentes a Excel ──
  const exportarComponentesExcel = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const rows = sortedComponentes.map(c => ({
      'ID': c.idManual || '',
      'Tipo': c.tipoComponente || '',
      'Marca': c.marca || '',
      'Modelo': c.modelo || '',
      'Capacidad': c.capacidad || '',
      'N° Serie': c.numeroSerie || '',
      'Ubicación': c.activoId ? (c.ubicacion || '') : 'Depósito IT',
      'Proveedor': c.proveedor || '',
      'Fecha': c.fecha ? formatFecha(c.fecha) : '',
      'Responsable': c.responsable || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Componentes');
    XLSX.writeFile(wb, `componentes_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.xlsx`);
    toast.success(`Excel exportado · ${sortedComponentes.length} componente${sortedComponentes.length !== 1 ? 's' : ''}`);
  };

  // ── Columnas grilla Stock (cantidades) ──
  const stockColumns = useMemo(() => [
    {
      key: 'nombre',
      label: 'Nombre',
      render: (value: string) => <span className="font-medium text-gray-900 dark:text-white">{value}</span>,
    },
    { key: 'categoria', label: 'Categoría', className: 'hidden md:table-cell' },
    {
      key: 'cantidad',
      label: 'En Depósito',
      render: (value: number, row: any) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${row.estado === 'critico' ? 'text-red-600 dark:text-red-400' : row.estado === 'bajo' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
              {value}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/ mín. {row.minimo}</span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {row.instalados ?? 0} instalado{(row.instalados ?? 0) !== 1 ? 's' : ''} · {row.totalRegistrados ?? 0} total
          </span>
        </div>
      ),
    },
    { key: 'ubicacion', label: 'Ubicación', className: 'hidden lg:table-cell' },
    {
      key: 'proveedor',
      label: 'Proveedor',
      className: 'hidden xl:table-cell',
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: string) => <StatusBadge status={value} type="stock" />,
    },
    {
      key: 'ultimaActualizacion',
      label: 'Última Act.',
      className: 'hidden lg:table-cell',
      render: (value: string) => new Date(value).toLocaleDateString('es-ES'),
    },
    {
      key: 'id',
      label: 'Detalle',
      render: (_: string, row: any) => (
        <button
          onClick={() => setStockDetalleItem(row)}
          title="Ver detalle por modelo"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#e6f7fc] dark:bg-[#004d63]/30 text-[#007a9e] dark:text-[#00c8f0] hover:bg-[#00a6d6]/20 dark:hover:bg-[#00a6d6]/30 transition-colors"
        >
          <Eye size={13} />
          <span className="hidden sm:inline">Ver detalle</span>
        </button>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  // ── Columnas grilla Componentes ──
  const componenteColumns = useMemo(() => [
    {
      key: 'idManual',
      label: 'ID',
      sortable: true,
      sortDir: compSort?.key === 'idManual' ? compSort.dir : null,
      onHeaderClick: () => handleCompSort('idManual'),
      render: (value: string, row: Componente) => (
        <div>
          <span className="font-mono font-medium text-[#00a6d6] dark:text-[#00c8f0] text-sm">{value}</span>
          {row.codigoExcel && (
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5" title="ID original del Excel">
              #{row.codigoExcel}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'tipoComponente',
      label: 'Componente',
      sortable: true,
      sortDir: compSort?.key === 'tipoComponente' ? compSort.dir : null,
      onHeaderClick: () => handleCompSort('tipoComponente'),
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          {value}
        </span>
      ),
    },
    {
      key: 'marca',
      label: 'Marca / Modelo',
      className: 'hidden sm:table-cell',
      render: (value: string, row: any) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.modelo}</p>
        </div>
      ),
    },
    {
      key: 'capacidad',
      label: 'Capacidad',
      className: 'hidden md:table-cell',
      sortable: true,
      sortDir: compSort?.key === 'capacidad' ? compSort.dir : null,
      onHeaderClick: () => handleCompSort('capacidad'),
      render: (value: string) =>
        value ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#e6f7fc] dark:bg-[#004d63]/30 text-[#007a9e] dark:text-[#00c8f0]">
            {value}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ),
    },
    {
      key: 'numeroSerie',
      label: 'N° Serie',
      className: 'hidden md:table-cell',
      render: (value: string) => (
        <span className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
          {value}
        </span>
      ),
    },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      className: 'hidden lg:table-cell',
      render: (value: string, row: Componente) =>
        row.activoId ? (
          <div className="flex items-center gap-1.5">
            <Monitor size={13} className="text-[#00a6d6] dark:text-[#00c8f0] flex-shrink-0" />
            <span className="text-xs font-medium text-[#007a9e] dark:text-[#00c8f0]">{value}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Warehouse size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Depósito IT</span>
          </div>
        ),
    },
    {
      key: 'proveedor',
      label: 'Proveedor',
      className: 'hidden xl:table-cell',
    },
    {
      key: 'fecha',
      label: 'Fecha',
      className: 'hidden lg:table-cell',
      sortable: true,
      sortDir: compSort?.key === 'fecha' ? compSort.dir : null,
      onHeaderClick: () => handleCompSort('fecha'),
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatFecha(value)}</span>
      ),
    },
    {
      key: 'responsable',
      label: 'Responsable',
      className: 'hidden xl:table-cell',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
      ),
    },
    {
      key: 'id',
      label: 'Acciones',
      render: (_: string, row: Componente) => (
        <div className="flex items-center gap-1">
          {/* Historial clínico */}
          <button
            onClick={() => setComponenteHistorial(row)}
            title="Ver historial clínico"
            className="p-1.5 rounded-lg text-[#00a6d6] hover:bg-[#00a6d6]/10 dark:hover:bg-[#00a6d6]/20 transition-colors"
          >
            <Clock size={15} />
          </button>
          {/* Editar */}
          {hasPermission('stock') && (
            <button
              onClick={() => setComponenteToEdit(row)}
              title="Editar componente"
              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-5 dark:hover:bg-amber-900/20 transition-colors"
            >
              <Pencil size={15} />
            </button>
          )}
          {/* Eliminar */}
          {hasPermission('stock') && (
            <button
              onClick={() => setComponenteToDelete(row)}
              title="Eliminar componente"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ], [compSort, handleCompSort]);

  const handleConfirmDelete = async () => {
    if (!componenteToDelete) return;
    setDeletingId(componenteToDelete.id);
    try {
      await deleteComponente(componenteToDelete.id);
      setComponentes(prev => prev.filter(c => c.id !== componenteToDelete.id));
      toast.success(`Componente "${componenteToDelete.idManual}" eliminado`);
      reloadStockItems();
    } catch {
      toast.error('Error al eliminar el componente');
    } finally {
      setDeletingId(null);
      setComponenteToDelete(null);
    }
  };

  if (authLoading) return <div className="p-6"><LoadingSpinner /></div>;

  if (!hasPermission('stock')) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario de Stock</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {componentes.length} componentes registrados · {filteredItems.length} tipos en control de stock
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nuevo Componente */}
          <button
            onClick={() => navigate('/stock/nuevo')}
            className="flex items-center gap-2 bg-[#00a6d6] text-white px-4 py-2 rounded-lg hover:bg-[#008bb8] transition-colors"
          >
            <Plus size={18} />
            <span>Nuevo Componente</span>
          </button>
          <button
            onClick={() => navigate('/stock/movimientos')}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-white"
          >
            <Package size={18} />
            <span className="hidden sm:inline">Movimientos</span>
          </button>
          {itemsBajos.length > 0 && (
            <button
              onClick={() => setShowAlertasModal(true)}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <TrendingDown size={18} />
              <span className="hidden sm:inline">Alertas ({itemsBajos.length})</span>
              <span className="sm:hidden">{itemsBajos.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tipos de Componente</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{items.length}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{componentes.length} unidades totales</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Stock OK</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{items.filter(i => i.estado === 'ok').length}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Stock Bajo / Crítico</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{items.filter(i => i.estado === 'bajo' || i.estado === 'critico').length}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Instalados en Equipos</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {componentes.filter(c => c.activoId).length}
          </p>
          <p className="text-xs text-purple-400 dark:text-purple-500 mt-0.5">{componentes.filter(c => !c.activoId).length} en depósito</p>
        </div>
      </div>

      {/* ── Sección Componentes ── */}
      {/* Barra de búsqueda separada */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={compSearchInputRef}
              type="text"
              placeholder="Buscar componente por ID, tipo, marca, N° serie, proveedor..."
              defaultValue={componenteSearch}
              onChange={handleCompSearchChange}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400"
            />
            {componenteSearch && (
              <button
                onClick={() => {
                  if (compSearchDebounceRef.current) clearTimeout(compSearchDebounceRef.current);
                  if (compSearchInputRef.current) compSearchInputRef.current.value = '';
                  setComponenteSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowCompFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${showCompFilters || hasCompFilters ? 'bg-[#00a6d6]/10 border-[#00a6d6] text-[#00a6d6] dark:text-[#00c4f0]' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filtros</span>
            {hasCompFilters && <span className="w-2 h-2 bg-[#00a6d6] rounded-full" />}
          </button>
          {(compFilterId || compFilterTipo || compFilterFecha || compFilterProveedor) && (
            <button onClick={clearCompFilters} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" title="Limpiar filtros">
              <X size={16} />
            </button>
          )}
        </div>
        {showCompFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ID</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: RAM-001"
                  value={compFilterId}
                  onChange={e => setCompFilterId(e.target.value)}
                  className="w-full px-3 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                {compFilterId && <button onClick={() => setCompFilterId('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={13} /></button>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Componente</label>
              <SearchableSelect
                options={compTipos}
                value={compFilterTipo}
                onChange={v => setCompFilterTipo(v)}
                placeholder="Todos los tipos..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha</label>
              <SearchableSelect
                options={compFechas.map(f => ({ value: f, label: formatFecha(f) }))}
                value={compFilterFecha}
                onChange={v => setCompFilterFecha(v)}
                placeholder="Todas las fechas..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Proveedor</label>
              <SearchableSelect
                options={compProveedores}
                value={compFilterProveedor}
                onChange={v => setCompFilterProveedor(v)}
                placeholder="Todos los proveedores..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabla de componentes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Cpu size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Componentes Registrados</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{sortedComponentes.length} de {componentes.length} registros</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportarComponentesExcel}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-green-500 text-green-600 dark:text-green-400 dark:border-green-500 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <FileDown size={15} />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
            <button
              onClick={exportarComponentesPDF}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#00a6d6] text-white rounded-lg hover:bg-[#008bb8] transition-colors"
            >
              <FileDown size={15} />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>
          </div>
        </div>

        <Table
          columns={componenteColumns}
          data={pagedComponentes}
          emptyMessage="No hay componentes registrados. Haga clic en 'Nuevo Componente' para agregar uno."
        />
        {/* Paginación componentes */}
        {compTotalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {(compPage - 1) * COMP_PAGE_SIZE + 1}–{Math.min(compPage * COMP_PAGE_SIZE, sortedComponentes.length)} de {sortedComponentes.length} componentes
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompPage(p => p - 1)}
                disabled={compPage === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >‹ Anterior</button>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <span>Pág.</span>
                <input
                  key={compPage}
                  type="number"
                  min={1}
                  max={compTotalPages}
                  defaultValue={compPage}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = parseInt((e.target as HTMLInputElement).value);
                      if (!isNaN(v) && v >= 1 && v <= compTotalPages) setCompPage(v);
                    }
                  }}
                  onBlur={e => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 1 && v <= compTotalPages) setCompPage(v);
                    else e.target.value = String(compPage);
                  }}
                  className="w-12 text-center px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span>de {compTotalPages}</span>
              </div>
              <button
                onClick={() => setCompPage(p => p + 1)}
                disabled={compPage === compTotalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Siguiente ›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Sección Stock de Cantidades ── */}
      {/* Barra de búsqueda separada */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar ítem por nombre, categoría, proveedor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${showFilters || filterEstado || filterCategoria ? 'bg-[#00a6d6]/10 border-[#00a6d6] text-[#00a6d6] dark:text-[#00c4f0]' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filtros</span>
            {(filterEstado || filterCategoria) && <span className="w-2 h-2 bg-[#00a6d6] rounded-full" />}
          </button>
          {(filterEstado || filterCategoria) && (
            <button onClick={clearFilters} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" title="Limpiar filtros">
              <X size={16} />
            </button>
          )}
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Estado</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'ok', label: 'OK' },
                  { value: 'bajo', label: 'Bajo' },
                  { value: 'critico', label: 'Crítico' },
                ]}
                value={filterEstado}
                onChange={setFilterEstado}
                placeholder="Todos"
                noClear
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoría</label>
              <SearchableSelect
                options={categorias}
                value={filterCategoria}
                onChange={setFilterCategoria}
                placeholder="Todas"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabla de stock */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Control de Stock</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{filteredItems.length} ítems</p>
          </div>
        </div>
        <Table columns={stockColumns} data={filteredItems} emptyMessage="No se encontraron ítems en el inventario" />
      </div>

      {/* Modal Alertas */}
      <Modal isOpen={showAlertasModal} onClose={() => setShowAlertasModal(false)} title="Alertas de Stock Bajo" size="lg">
        <div className="space-y-3">
          {itemsBajos.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-2 ${
                item.estado === 'critico'
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                  : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium dark:text-white">{item.nombre}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.categoria}</p>
                </div>
                <StatusBadge status={item.estado} type="stock" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">En depósito:</span>
                  <span className={`ml-2 font-medium ${item.estado === 'critico' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {item.cantidad}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Mínimo requerido:</span>
                  <span className="ml-2 font-medium dark:text-white">{item.minimo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Recomendación:</strong> Contactar a los proveedores para generar órdenes de reposición de los ítems en estado crítico lo antes posible.
          </p>
        </div>
      </Modal>


      {/* Modal Editar Componente */}
      <EditarComponenteModal
        isOpen={!!componenteToEdit}
        componente={componenteToEdit}
        onClose={() => setComponenteToEdit(null)}
        onUpdated={actualizado => {
          setComponentes(prev =>
            prev.map(c => (c.id === actualizado.id ? actualizado : c))
          );
          reloadStockItems();
        }}
      />

      {/* Modal Historial Clínico */}
      <HistorialComponenteModal
        isOpen={!!componenteHistorial}
        componente={componenteHistorial}
        onClose={() => setComponenteHistorial(null)}
      />

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={!!componenteToDelete}
        onClose={() => setComponenteToDelete(null)}
        title="Eliminar componente"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <Trash2 size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                ¿Eliminar <span className="font-mono">{componenteToDelete?.idManual}</span>?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                {componenteToDelete?.tipoComponente} · {componenteToDelete?.marca} {componenteToDelete?.modelo}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Esta acción no se puede deshacer. Se eliminará el componente y todo su historial clínico.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setComponenteToDelete(null)}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deletingId ? (
                <><LoadingSpinner size="sm" /> Eliminando...</>
              ) : (
                <><Trash2 size={14} /> Eliminar</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Detalle por Modelo ── */}
      {stockDetalleItem && (() => {
        const modelos = getDetalleModelos(stockDetalleItem.nombre);
        const totalGeneral = modelos.reduce((s, m) => s + m.total, 0);
        const activosGeneral = modelos.reduce((s, m) => s + m.activos, 0);
        const depositoGeneral = modelos.reduce((s, m) => s + m.deposito, 0);
        return (
          <Modal
            isOpen={!!stockDetalleItem}
            onClose={() => setStockDetalleItem(null)}
            title={`Detalle por modelo — ${stockDetalleItem.nombre}`}
            size="lg"
          >
            {/* Resumen general */}
            <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-[#e6f7fc] dark:bg-[#004d63]/30 border border-[#00a6d6]/20">
              <BarChart3 size={18} className="text-[#00a6d6] flex-shrink-0" />
              <div className="flex-1 flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold text-gray-900 dark:text-white">{totalGeneral}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">unidades totales</span>
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold text-[#007a9e] dark:text-[#00c8f0]">{activosGeneral}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">en activos</span>
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">{depositoGeneral}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">en depósito</span>
                </span>
              </div>
              <StatusBadge status={stockDetalleItem.estado} type="stock" />
            </div>

            {/* Filas por modelo */}
            <div className="space-y-3">
              {modelos.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  No hay componentes registrados para este tipo.
                </p>
              ) : modelos.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 overflow-hidden"
                >
                  {/* Cabecera del modelo */}
                  <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Cpu size={14} className="text-purple-500 dark:text-purple-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.modelo}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {m.total} ud.
                    </span>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700">
                    {/* Total */}
                    <div className="px-4 py-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{m.total}</p>
                    </div>
                    {/* En activos */}
                    <div className="px-4 py-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                        <Monitor size={11} className="text-[#00a6d6]" /> En activos
                      </p>
                      <p className="text-xl font-bold text-[#007a9e] dark:text-[#00c8f0]">{m.activos}</p>
                    </div>
                    {/* En depósito */}
                    <div className="px-4 py-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                        <Warehouse size={11} className="text-purple-500" /> Depósito
                      </p>
                      <p className={`text-xl font-bold ${m.deposito === 0 ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
                        {m.deposito}
                      </p>
                    </div>
                  </div>

                  {/* Barra de distribución */}
                  {m.total > 0 && (
                    <div className="px-4 pb-3">
                      <div className="flex rounded-full overflow-hidden h-1.5">
                        <div
                          className="bg-[#00a6d6] transition-all"
                          style={{ width: `${(m.activos / m.total) * 100}%` }}
                        />
                        <div
                          className="bg-purple-400 dark:bg-purple-500 transition-all"
                          style={{ width: `${(m.deposito / m.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-[#00a6d6] inline-block" />
                          En uso {m.total > 0 ? Math.round((m.activos / m.total) * 100) : 0}%
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500 inline-block" />
                          Depósito {m.total > 0 ? Math.round((m.deposito / m.total) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setStockDetalleItem(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}