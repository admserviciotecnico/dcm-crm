import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function FileUploader({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del archivo" className="max-w-sm" />
      <Button onClick={() => { if (!name.trim()) return; onAdd(name.trim()); setName(''); }}>Subir archivo</Button>
    </div>
  );
}
