import { memo, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
  className?: string;
  sortable?: boolean;
  sortDir?: 'asc' | 'desc' | null;
  onHeaderClick?: () => void;
  /** Fija la columna al borde derecho al hacer scroll horizontal (p. ej. los botones de acciones) */
  stickyRight?: boolean;
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  /** Menos padding en pantallas chicas, para que entren más columnas sin scroll horizontal */
  compact?: boolean;
}

const Table = memo(function Table({ columns, data, onRowClick, emptyMessage = 'No hay datos para mostrar', compact = false }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                onClick={column.sortable ? column.onHeaderClick : undefined}
                className={`${compact ? 'px-2 py-2 md:px-4 md:py-3' : 'px-4 py-3'} text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${column.stickyRight ? 'sticky right-0 bg-gray-50 dark:bg-gray-700' : ''} ${column.className || ''} ${column.sortable ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors' : ''}`}
              >
                {column.sortable ? (
                  <span className="inline-flex items-center gap-1">
                    {column.label}
                    {column.sortDir === 'asc' ? (
                      <ChevronUp size={13} className="text-[#00a6d6]" />
                    ) : column.sortDir === 'desc' ? (
                      <ChevronDown size={13} className="text-[#00a6d6]" />
                    ) : (
                      <ChevronsUpDown size={13} className="opacity-40" />
                    )}
                  </span>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors' : ''}
              >
                {columns.map(column => (
                  <td key={column.key} className={`${compact ? 'px-2 py-2 md:px-4 md:py-3 whitespace-nowrap' : 'px-4 py-3'} text-sm dark:text-gray-300 ${column.stickyRight ? 'sticky right-0 bg-white dark:bg-gray-800' : ''} ${column.className || ''}`}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

export default Table;