import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, Search, Filter } from 'lucide-react';
import { getTickets } from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';

type QuickFilter = 'activos' | 'todos' | 'nuevo' | 'en_progreso' | 'resuelto';

export default function Tickets() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Quick filter driven by the stat cards
  const initialEstado = searchParams.get('estado');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(
    initialEstado === 'resuelto' ? 'resuelto'
    : initialEstado === 'nuevo' ? 'nuevo'
    : initialEstado === 'en_progreso' ? 'en_progreso'
    : 'activos'
  );

  const isOperations = hasPermission('tickets_gestion');

  useEffect(() => { loadTickets(); }, []);

  useEffect(() => { applyFilters(); }, [tickets, searchTerm, quickFilter, filterPrioridad]);

  const loadTickets = async () => {
    try {
      const data = await getTickets();
      // Sort by fecha descending (most recent first)
      const sorted = [...data].sort(
        (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      );
      setTickets(sorted);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    // Quick filter
    if (quickFilter === 'activos') {
      filtered = filtered.filter(t => t.estado !== 'resuelto');
    } else if (quickFilter !== 'todos') {
      filtered = filtered.filter(t => t.estado === quickFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.creador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.activo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPrioridad) {
      filtered = filtered.filter(t => t.prioridad === filterPrioridad);
    }

    setFilteredTickets(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterPrioridad('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const quickStats: { label: string; filter: QuickFilter; color: string; activeColor: string }[] = [
    {
      label: 'Todos',
      filter: 'todos',
      color: 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      activeColor: 'ring-2 ring-gray-400 dark:ring-gray-500',
    },
    {
      label: 'Nuevos',
      filter: 'nuevo',
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      activeColor: 'ring-2 ring-blue-500',
    },
    {
      label: 'En Progreso',
      filter: 'en_progreso',
      color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      activeColor: 'ring-2 ring-yellow-500',
    },
    {
      label: 'Resueltos',
      filter: 'resuelto',
      color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      activeColor: 'ring-2 ring-green-500',
    },
  ];

  const columns = isOperations ? [
    {
      key: 'nro',
      label: '#',
      render: (value: number) => <span className="font-mono text-xs font-semibold text-gray-600 dark:text-gray-400">{value}</span>,
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (value: string) => <span className="font-medium text-gray-900 dark:text-white line-clamp-2">{value}</span>,
    },
    {
      key: 'creador',
      label: 'Reportado por',
      className: 'hidden md:table-cell',
    },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      className: 'hidden lg:table-cell',
      render: (value: string) => <span className="text-sm">{value}</span>,
    },
    {
      key: 'prioridad',
      label: 'Prioridad',
      render: (value: string) => <StatusBadge status={value} type="prioridad" />,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: string) => <StatusBadge status={value} type="ticket" />,
    },
    {
      key: 'asignado',
      label: 'Asignado',
      className: 'hidden xl:table-cell',
      render: (value: string) => value || <span className="text-gray-400">Sin asignar</span>,
    },
    {
      key: 'fechaCreacion',
      label: 'Fecha',
      className: 'hidden lg:table-cell',
      render: (value: string) => formatDate(value),
    },
  ] : [
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (value: string) => <span className="font-medium text-gray-900 dark:text-white">{value}</span>,
    },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      className: 'hidden md:table-cell',
    },
    {
      key: 'prioridad',
      label: 'Prioridad',
      render: (value: string) => <StatusBadge status={value} type="prioridad" />,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: string) => <StatusBadge status={value} type="ticket" />,
    },
    {
      key: 'fechaCreacion',
      label: 'Fecha',
      className: 'hidden sm:table-cell',
      render: (value: string) => formatDate(value),
    },
  ];

  const emptyMessages: Record<QuickFilter, string> = {
    activos: 'No hay tickets activos',
    todos: 'No se encontraron tickets',
    nuevo: 'No hay tickets nuevos',
    en_progreso: 'No hay tickets en progreso',
    resuelto: 'No hay tickets resueltos',
  };

  if (loading) {
    return <div className="p-6"><LoadingSpinner /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isOperations ? 'Tickets de Soporte' : 'Mis Reportes'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets/nuevo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          <span>Nuevo Ticket</span>
        </button>
      </div>

      {/* Quick Stats for Operations */}
      {isOperations && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickStats.map(stat => {
            const count =
              stat.filter === 'todos'    ? tickets.length
              : stat.filter === 'activos' ? tickets.filter(t => t.estado !== 'resuelto').length
              : tickets.filter(t => t.estado === stat.filter).length;
            const isActive = quickFilter === stat.filter;
            return (
              <button
                key={stat.filter}
                onClick={() => setQuickFilter(isActive ? 'activos' : stat.filter)}
                className={`p-4 rounded-xl border-2 text-center transition-all hover:shadow-md ${stat.color} ${isActive ? stat.activeColor : ''}`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm mt-1">{stat.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white"
          >
            <Filter size={20} />
            <span>Filtros</span>
            {filterPrioridad && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'Todas' },
                  { value: 'baja', label: 'Baja' },
                  { value: 'media', label: 'Media' },
                  { value: 'alta', label: 'Alta' },
                  { value: 'urgente', label: 'Urgente' },
                ]}
                value={filterPrioridad}
                onChange={setFilterPrioridad}
                placeholder="Todas"
                noClear
              />
            </div>

            {filterPrioridad && (
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resueltos banner */}
      {quickFilter === 'resuelto' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
          <span className="font-medium">Vista: Tickets Resueltos</span>
          <span className="text-green-500 dark:text-green-600">·</span>
          <span>Podés reabrir un ticket abriéndolo y cambiando su estado a En Progreso.</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table
          columns={columns}
          data={filteredTickets}
          onRowClick={(row) => navigate(`/tickets/${row.id}`)}
          emptyMessage={emptyMessages[quickFilter]}
        />
      </div>
    </div>
  );
}
