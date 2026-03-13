import { EmptyState } from '@/components/common/empty-state';
import { DocumentItem } from '@/modules/documents/types';
import { DocumentCard } from '@/modules/documents/components/document-card';

export function FileList({ docs, onRemove, title, hideWhenEmpty = false }: { docs: DocumentItem[]; onRemove: (id: string) => void; title?: string; hideWhenEmpty?: boolean }) {
  if (docs.length === 0) {
    if (hideWhenEmpty) return null;
    return <EmptyState variant="default" title="Sin documentos" subtitle="Agregá archivos para centralizar la información." />;
  }

  return (
    <div className="space-y-2">
      {title ? <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{title}</p> : null}
      {docs.map((doc) => <DocumentCard key={doc.id} doc={doc} onRemove={onRemove} />)}
    </div>
  );
}
