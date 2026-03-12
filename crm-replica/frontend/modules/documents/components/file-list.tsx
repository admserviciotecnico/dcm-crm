import { DocumentItem } from '@/modules/documents/types';
import { DocumentCard } from '@/modules/documents/components/document-card';

export function FileList({ docs, onRemove }: { docs: DocumentItem[]; onRemove: (id: string) => void }) {
  return <div className="space-y-2">{docs.map((doc) => <DocumentCard key={doc.id} doc={doc} onRemove={onRemove} />)}</div>;
}
