import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DocumentCategory } from '@/modules/documents/types';

export function FileUploader({
  onAdd,
  onAddFile,
  allowCapture = false,
  defaultCategory = 'other'
}: {
  onAdd: (name: string, category: DocumentCategory) => void | Promise<void>;
  onAddFile?: (file: File, category: DocumentCategory) => void | Promise<void>;
  allowCapture?: boolean;
  defaultCategory?: DocumentCategory;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del archivo" />
      <Select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
        <option value="contract">Contrato</option>
        <option value="report">Reporte</option>
        <option value="photo">Foto</option>
        <option value="other">Otro</option>
      </Select>
      <Button onClick={() => { if (!name.trim()) return; void Promise.resolve(onAdd(name.trim(), category)).finally(() => setName('')); }}>Agregar</Button>
      {allowCapture && onAddFile ? (
        <label className="inline-flex cursor-pointer items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] md:col-span-3">
          Adjuntar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void Promise.resolve(onAddFile(file, category)).catch(() => undefined);
              event.currentTarget.value = '';
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
