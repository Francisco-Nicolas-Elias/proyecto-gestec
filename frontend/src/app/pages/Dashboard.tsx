import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Monitor, AlertCircle, CheckCircle, Package, Clock,
  ArrowRight, Activity, FileText, Settings, Shield,
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import {
  getActivos, getTickets, getTareas, getStock,
  onActivosChange, offActivosChange,
} from '../services/apiClient';
import { getLogs } from '../services/logsService';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Pure helpers (module-level, never recreated) ───────────────────────────────

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
};

const stockEstadoStyle = (estado: string) => {
  if (estado === 'critico') return { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', bar: 'bg-red-500' };
  if (estado === 'bajo')    return { badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', bar: 'bg-yellow-400' };
  return { badge: 'bg-green-100 text-green-700', bar: 'bg-green-500' };
};

const MODULO_ICON: Record<string, any> = {
  Equipos: Monitor, Tickets: FileText, Stock: Package,
  Tareas: CheckCircle, Administración: Settings, Sistema: Shield,
};
const MODULO_COLOR: Record<string, string> = {
  Equipos: 'bg-[#00a6d6]/10 text-[#00a6d6]',
  Tickets: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  Stock: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Tareas: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  Administración: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  Sistema: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const TICKET_COLORS = { nuevo: '#3b82f6', en_progreso: '#f59e0b', resuelto: '#10b981' };
const ACTIVO_COLORS  = { activa: '#10b981', inactiva: '#ef4444' };

// ── Stable sub-components (module-level) ──────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4">
      <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-xs text-[#00a6d6] hover:text-[#008bb8] font-medium transition-colors flex items-center gap-1"
        >
          {action} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, onClick }: {
  icon: any; label: string; value: number; color: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
          <Icon className="text-white" size={20} />
        </div>
        <ArrowRight className="text-gray-300 dark:text-gray-600 group-hover:text-[#00a6d6] transition-colors" size={16} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

interface BarDatum { mes: string; total: number; }

function SvgBarChart({ data, isDark }: { data: BarDatum[]; isDark: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; idx: number } | null>(null);

  const W = 640; const H = 210;
  const padL = 28; const padR = 12; const padT = 8; const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const barW = Math.min(36, (chartW / data.length) * 0.6);
  const gridLines = Array.from(new Set([0, Math.round(maxVal * 0.5), maxVal]));
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  const xOf = (i: number) => padL + (i + 0.5) * (chartW / data.length);
  const yOf = (v: number) => padT + chartH - (v / maxVal) * chartH;

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>, idx: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, idx });
    setHoveredIdx(idx);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
        {gridLines.map((v, gi) => (
          <g key={`grid-${gi}`}>
            <line x1={padL} y1={yOf(v)} x2={W - padR} y2={yOf(v)} stroke={gridColor} strokeDasharray="4 3" strokeWidth={1} />
            {v > 0 && <text x={padL - 4} y={yOf(v) + 4} textAnchor="end" fontSize={10} fill={textColor}>{v}</text>}
          </g>
        ))}
        {data.map((d, i) => {
          const x = xOf(i);
          const barH = Math.max((d.total / maxVal) * chartH, d.total > 0 ? 4 : 0);
          const y = yOf(d.total);
          const isHov = hoveredIdx === i;
          return (
            <g key={`bar-${i}`}>
              <rect
                x={x - barW / 2} y={y} width={barW} height={barH}
                rx={4} ry={4}
                fill={isHov ? '#008bb8' : '#00a6d6'}
                style={{ transition: 'fill 0.1s' }}
                onMouseMove={e => handleMouseMove(e, i)}
                onMouseLeave={() => { setHoveredIdx(null); setTooltip(null); }}
              />
              <text x={x} y={H - padB + 16} textAnchor="middle" fontSize={9} fill={textColor}>{d.mes}</text>
            </g>
          );
        })}
      </svg>
      {tooltip !== null && (() => {
        const d = data[tooltip.idx];
        return (
          <div
            style={{ position: 'absolute', left: tooltip.x + 10, top: tooltip.y - 40, pointerEvents: 'none', zIndex: 50 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm shadow-lg whitespace-nowrap"
          >
            <span className="text-gray-600 dark:text-gray-400 mr-1">{d.mes}:</span>
            <span className="font-semibold text-[#00a6d6]">{d.total} ticket{d.total !== 1 ? 's' : ''}</span>
          </div>
        );
      })()}
    </div>
  );
}

interface DonutSlice { name: string; value: number; color: string; }

function DonutChart({ data, size = 160 }: { data: DonutSlice[]; size?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; idx: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.44;
  const r = size * 0.28;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) return null;

  const slices: { d: string; color: string; idx: number }[] = [];
  let startAngle = -Math.PI / 2;

  data.forEach((slice, idx) => {
    const angle = (slice.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const gap = data.length > 1 ? 0.03 : 0;
    const sa = startAngle + gap;
    const ea = endAngle - gap;

    const x1 = cx + R * Math.cos(sa);
    const y1 = cy + R * Math.sin(sa);
    const x2 = cx + R * Math.cos(ea);
    const y2 = cy + R * Math.sin(ea);
    const x3 = cx + r * Math.cos(ea);
    const y3 = cy + r * Math.sin(ea);
    const x4 = cx + r * Math.cos(sa);
    const y4 = cy + r * Math.sin(sa);
    const large = angle > Math.PI ? 1 : 0;

    slices.push({
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`,
      color: slice.color,
      idx,
    });
    startAngle = endAngle;
  });

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, idx: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, idx });
    setHovered(idx);
  };

  const handleMouseLeave = () => {
    setHovered(null);
    setTooltip(null);
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg ref={svgRef} width={size} height={size}>
        {slices.map(s => (
          <path
            key={s.idx}
            d={s.d}
            fill={s.color}
            opacity={hovered === null || hovered === s.idx ? 1 : 0.6}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseMove={e => handleMouseMove(e, s.idx)}
            onMouseLeave={handleMouseLeave}
            transform={hovered === s.idx ? `translate(${Math.cos(0) * 2},${Math.sin(0) * 2})` : undefined}
          />
        ))}
      </svg>
      {tooltip !== null && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            pointerEvents: 'none',
            zIndex: 50,
          }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm shadow-lg whitespace-nowrap"
        >
          <span style={{ color: data[tooltip.idx].color }} className="font-semibold">
            {data[tooltip.idx].name}: {data[tooltip.idx].value}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { usuario, hasPermission } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [loading, setLoading]       = useState(true);
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [allActivos, setAllActivos] = useState<any[]>([]);
  const [allTareas, setAllTareas]   = useState<any[]>([]);
  const [allStock, setAllStock]     = useState<any[]>([]);
  const [logs, setLogs]             = useState<any[]>([]);


  const loadDashboardData = async () => {
    try {
      const [activos, tickets, tareas, stock] = await Promise.all([
        hasPermission('activos') ? getActivos() : Promise.resolve([]),
        getTickets(),
        hasPermission('tareas') ? getTareas() : Promise.resolve([]),
        hasPermission('stock')  ? getStock()  : Promise.resolve([]),
      ]);
      setAllActivos(activos);
      setAllTickets(tickets);
      setAllTareas(tareas);
      setAllStock(stock);
      setLogs((await getLogs()).slice(0, 10));
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    onActivosChange(loadDashboardData);
    return () => offActivosChange(loadDashboardData);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    activosInactivos:  allActivos.filter(a => a.estado === 'inactiva').length,
    ticketsNuevos:     allTickets.filter(t => t.estado === 'nuevo').length,
    ticketsEnProgreso: allTickets.filter(t => t.estado === 'en_progreso').length,
    tareasPendientes:  allTareas.filter(t => t.estado === 'pendiente').length,
    stockBajo:         allStock.filter(s => s.estado === 'bajo' || s.estado === 'critico').length,
  }), [allActivos, allTickets, allTareas, allStock]);

  const ticketsPorMes = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const label = new Date(year, i, 1).toLocaleDateString('es-ES', { month: 'short' });
      return {
        mes: label.charAt(0).toUpperCase() + label.slice(1).replace('.', ''),
        total: allTickets.filter(t => (t.fechaCreacion || '').startsWith(key)).length,
      };
    });
  }, [allTickets]);

  const ticketPieData = useMemo(() => [
    { name: 'Nuevo',       value: allTickets.filter(t => t.estado === 'nuevo').length,       color: TICKET_COLORS.nuevo },
    { name: 'En Progreso', value: allTickets.filter(t => t.estado === 'en_progreso').length, color: TICKET_COLORS.en_progreso },
    { name: 'Resuelto',    value: allTickets.filter(t => t.estado === 'resuelto').length,    color: TICKET_COLORS.resuelto },
  ].filter(d => d.value > 0), [allTickets]);

  const activoPieData = useMemo(() => [
    { name: 'Activo',   value: allActivos.filter(a => a.estado === 'activa').length,   color: ACTIVO_COLORS.activa },
    { name: 'Inactivo', value: allActivos.filter(a => a.estado === 'inactiva').length, color: ACTIVO_COLORS.inactiva },
  ].filter(d => d.value > 0), [allActivos]);

  const stockCritico = useMemo(() =>
    allStock
      .filter(s => s.estado === 'critico' || s.estado === 'bajo')
      .sort((a, b) => a.cantidad - b.cantidad)
      .slice(0, 6),
    [allStock]);

  const recentTickets = useMemo(() => allTickets.slice(0, 5), [allTickets]);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Bienvenido, <span className="font-medium text-gray-700 dark:text-gray-300">{usuario?.nombre}</span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {hasPermission('activos') && (
          <KpiCard icon={Monitor}      label="Equipos Inactivos"    value={stats.activosInactivos}  color="bg-red-500"    onClick={() => navigate('/activos?estado=inactiva')} />
        )}
        <KpiCard   icon={AlertCircle}  label="Tickets Nuevos"       value={stats.ticketsNuevos}     color="bg-blue-500"   onClick={() => navigate('/tickets?estado=nuevo')} />
        <KpiCard   icon={Clock}        label="Tickets en Progreso"  value={stats.ticketsEnProgreso} color="bg-amber-500"  onClick={() => navigate('/tickets?estado=en_progreso')} />
        {hasPermission('tareas') && (
          <KpiCard icon={CheckCircle}  label="Tareas Pendientes"    value={stats.tareasPendientes}  color="bg-purple-500" onClick={() => navigate('/tareas')} />
        )}
        {hasPermission('stock') && (
          <KpiCard icon={Package}      label="Stock Bajo/Crítico"   value={stats.stockBajo}         color="bg-orange-500" onClick={() => navigate('/stock')} />
        )}
      </div>

      {/* Charts Row 1: Tickets por Mes + Estado Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <SectionCard className="lg:col-span-2">
          <SectionHeader title="Tickets por mes" action="Ver todos" onAction={() => navigate('/tickets')} />
          <div className="px-4 pb-5">
            <SvgBarChart data={ticketsPorMes} isDark={isDark} />
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Estado de tickets" />
          {ticketPieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin tickets</div>
          ) : (
            <div className="pb-4">
              <div className="py-2">
                <DonutChart data={ticketPieData} size={160} />
              </div>
              <div className="px-5 space-y-1.5">
                {ticketPieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Charts Row 2: Estado Activos + Stock Crítico */}
      {(hasPermission('activos') || hasPermission('stock')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {hasPermission('activos') && (
            <SectionCard>
              <SectionHeader title="Estado de equipos" action="Ver equipos" onAction={() => navigate('/activos')} />
              {activoPieData.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin activos</div>
              ) : (
                <div className="pb-4">
                  <div className="py-2">
                    <DonutChart data={activoPieData} size={160} />
                  </div>
                  <div className="px-5 space-y-1.5">
                    {activoPieData.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {hasPermission('stock') && (
            <SectionCard className="lg:col-span-2">
              <SectionHeader title="Stock crítico / bajo" action="Ver stock" onAction={() => navigate('/stock')} />
              <div className="px-5 pb-5">
                {stockCritico.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 py-4">
                    <CheckCircle size={16} /> Todo el stock está en niveles correctos
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stockCritico.map(item => {
                      const s = stockEstadoStyle(item.estado);
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">{item.nombre}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${s.badge}`}>
                                {item.estado === 'critico' ? 'Crítico' : 'Bajo'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${s.bar}`}
                                  style={{ width: `${Math.min((item.cantidad / 10) * 100, 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-16 text-right">
                                {item.cantidad} / {item.minimo} mín
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* Row 3: Actividad Reciente + Tickets Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <SectionCard>
          <SectionHeader title="Actividad reciente" action="Ver logs" onAction={() => navigate('/admin?tab=logs')} />
          <div className="px-5 pb-5 space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin actividad registrada</p>
            ) : logs.map(log => {
              const Icon     = MODULO_ICON[log.modulo]  || Activity;
              const colorCls = MODULO_COLOR[log.modulo] || MODULO_COLOR.Sistema;
              return (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorCls}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">{log.accion}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{log.usuario}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{fmtRelative(log.fechaHora)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Tickets recientes" action="Ver todos" onAction={() => navigate('/tickets')} />
          <div className="px-5 pb-5 space-y-2">
            {recentTickets.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay tickets recientes</p>
            ) : recentTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-[#00a6d6]/40 hover:bg-[#00a6d6]/5 dark:hover:bg-[#00a6d6]/10 cursor-pointer transition-all duration-150 group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#00a6d6] transition-colors">
                    {ticket.titulo || ticket.descripcion}
                  </p>
                  <StatusBadge status={ticket.estado} type="ticket" />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{ticket.creador}</span>
                  <span>·</span>
                  <span className="truncate">{ticket.ubicacion}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
