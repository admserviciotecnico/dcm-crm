import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentItem } from '@/modules/documents/types';

export function DocumentCard({ doc, onRemove }: { doc: DocumentItem; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] p-3 text-sm">
      <p className="flex items-center gap-2"><FileText size={16} /> {doc.name}</p>
      <div className="flex gap-2">
        <Button variant="secondary">Descargar</Button>
        <Button variant="danger" onClick={() => onRemove(doc.id)}>Eliminar</Button>
      </div>
    </div>
  );
}
