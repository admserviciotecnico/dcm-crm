'use client';

import { useMemo, useState } from 'react';
import { DocumentItem } from '@/modules/documents/types';

export function useDocumentsState(initial: DocumentItem[] = []) {
  const [docs, setDocs] = useState<DocumentItem[]>(initial);
  const add = (name: string, entityType: DocumentItem['entityType'], entityId: string) => {
    setDocs((prev) => [{ id: crypto.randomUUID(), name, entityType, entityId, createdAt: new Date().toISOString() }, ...prev]);
  };
  const remove = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));
  const grouped = useMemo(() => docs.reduce<Record<string, DocumentItem[]>>((acc, d) => {
    const key = `${d.entityType}:${d.entityId}`;
    acc[key] = [...(acc[key] ?? []), d];
    return acc;
  }, {}), [docs]);
  return { docs, add, remove, grouped };
}
