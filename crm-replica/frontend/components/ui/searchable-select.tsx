'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

type Option = { value: string; label: string };

type SearchableSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
};

export function SearchableSelect({ options, value, onChange, placeholder = 'Buscar...', emptyMessage = 'Sin resultados' }: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery(selected?.label ?? '');
    }
  }, [open, selected?.label]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <Input
        value={open ? query : (selected?.label ?? '')}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery(selected?.label ?? '');
        }}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
        }}
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-2 py-1 text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`block w-full rounded-[6px] px-2 py-1 text-left text-sm hover:bg-[var(--bg-surface-hover)] ${option.value === value ? 'bg-[var(--bg-surface-hover)]' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setQuery(option.label);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
