import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Search } from 'lucide-react';

export type SelectOption = string | { value: string; label: string };

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Si es true, no muestra el botón X para limpiar */
  noClear?: boolean;
  /** Si es true, no ordena las opciones automáticamente (orden manual) */
  noSort?: boolean;
}

function normalize(opt: SelectOption): { value: string; label: string } {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
  noClear = false,
  noSort = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropPos, setDropPos] = useState<DropdownPos>({ top: 0, left: 0, width: 0, openUpward: false });
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const safeOptions = Array.isArray(options) ? options : [];
  const normalized = safeOptions.map(normalize);
  // Ordenar alfabéticamente por label (a menos que noSort=true)
  const sorted = noSort
    ? normalized
    : [...normalized].sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));

  const filtered = query.trim()
    ? sorted.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : sorted;

  const selectedLabel = normalized.find(o => o.value === value)?.label ?? '';

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropH = Math.min(filtered.length * 36 + 60, 260);
    const openUpward = spaceBelow < dropH && spaceAbove > spaceBelow;
    setDropPos({
      top: openUpward ? rect.top - dropH - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUpward,
    });
  }, [filtered.length]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Recalcular posición al hacer scroll/resize
  useEffect(() => {
    if (!open) return;
    const onScroll = () => calcPosition();
    const onResize = () => calcPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, calcPosition]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const handleToggle = () => {
    if (disabled) return;
    if (open) {
      setOpen(false);
      setQuery('');
    } else {
      calcPosition();
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropPos.top,
        left: dropPos.left,
        width: dropPos.width,
        zIndex: 99999,
      }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Search input */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); calcPosition(); }}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            }}
            placeholder="Buscar..."
            className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#00a6d6]"
          />
        </div>
      </div>

      {/* Options list */}
      <ul role="listbox" className="max-h-52 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            Sin resultados
          </li>
        ) : (
          filtered.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onMouseDown={e => { e.preventDefault(); handleSelect(opt.value); }}
              className={`
                px-3 py-2 text-sm cursor-pointer transition-colors
                ${opt.value === value
                  ? 'bg-[#e6f7fc] dark:bg-[#00a6d6]/20 text-[#00a6d6] dark:text-[#00c8f0] font-medium'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              {opt.label}
            </li>
          ))
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors select-none
          ${disabled
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-[#00a6d6] dark:hover:border-[#00a6d6]'
          }
          ${open ? 'border-[#00a6d6] ring-2 ring-[#00a6d6]/20' : ''}
        `}
      >
        <span className={`flex-1 text-sm truncate ${value && selectedLabel ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
          {selectedLabel || placeholder}
        </span>
        {value && !disabled && !noClear && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown
          size={16}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown montado en el body via portal */}
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}