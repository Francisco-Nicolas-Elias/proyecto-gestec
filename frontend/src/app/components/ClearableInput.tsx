import { X } from 'lucide-react';
import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Clases extra para el div envolvente (útil para flex-1, w-full, etc.) */
  wrapperClassName?: string;
}

export default function ClearableInput({
  wrapperClassName = '',
  className = '',
  onChange,
  name,
  value,
  ...props
}: Props) {
  const hasValue = !!value;

  const handleClear = () => {
    onChange?.({
      target: { value: '', name: name ?? '' },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...props}
        name={name}
        value={value}
        onChange={onChange}
        className={`${className} ${hasValue ? 'pr-8' : ''}`}
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
