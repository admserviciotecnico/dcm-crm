import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DocumentCategory } from '@/modules/documents/types';

export function FileUploader({ onAdd }: { onAdd: (name: string, category: DocumentCategory) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('other');

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del archivo" />
      <Select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
        <option value="contract">Contrato</option>
        <option value="report">Reporte</option>
        <option value="photo">Foto</option>
        <option value="other">Otro</option>
      </Select>
      <Button onClick={() => { if (!name.trim()) return; onAdd(name.trim(), category); setName(''); }}>Agregar</Button>
    </div>
  );
}
