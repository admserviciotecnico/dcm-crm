import { FileText } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/common/relative-time';
import { Badge } from '@/components/ui/badge';
import { DocumentItem } from '@/modules/documents/types';
import { ConfirmModal } from '@/components/common/confirm-modal';

const labels: Record<DocumentItem['category'], string> = {
  contract: 'Contrato',
  report: 'Reporte',
  photo: 'Foto',
  other: 'Otro'
};

export function DocumentCard({ doc, onRemove }: { doc: DocumentItem; onRemove: (id: string) => Promise<unknown> | void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm shadow-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]">
        <div>
          <p className="flex items-center gap-2 font-medium"><FileText size={16} /> {doc.name}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Badge>{labels[doc.category]}</Badge><RelativeTime value={doc.createdAt} /></p>
        </div>
        <div className="flex gap-2">
          {doc.filePath ? (
            <a href={doc.filePath} target="_blank" rel="noreferrer">
              <Button variant="secondary">Descargar</Button>
            </a>
          ) : (
            <Button variant="secondary" disabled title="El documento no tiene archivo asociado">
              Sin archivo
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={removeLoading}>Eliminar</Button>
        </div>
      </div>
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar documento"
        message={`Se eliminará "${doc.name}" de forma permanente.`}
        onCancel={() => { if (!removeLoading) setConfirmOpen(false); }}
        onConfirm={async () => {
          setRemoveLoading(true);
          try {
            await onRemove(doc.id);
            setConfirmOpen(false);
          } finally {
            setRemoveLoading(false);
          }
        }}
        confirmDisabled={removeLoading}
        cancelDisabled={removeLoading}
      />
    </>
  );
}
