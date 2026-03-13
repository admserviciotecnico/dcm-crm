import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/common/relative-time';
import { Badge } from '@/components/ui/badge';
import { DocumentItem } from '@/modules/documents/types';

const labels: Record<DocumentItem['category'], string> = {
  contract: 'Contrato',
  report: 'Reporte',
  photo: 'Foto',
  other: 'Otro'
};

export function DocumentCard({ doc, onRemove }: { doc: DocumentItem; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm shadow-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]">
      <div>
        <p className="flex items-center gap-2 font-medium"><FileText size={16} /> {doc.name}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Badge>{labels[doc.category]}</Badge><RelativeTime value={doc.createdAt} /></p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary">Descargar</Button>
        <Button variant="danger" onClick={() => onRemove(doc.id)}>Eliminar</Button>
      </div>
    </div>
  );
}
