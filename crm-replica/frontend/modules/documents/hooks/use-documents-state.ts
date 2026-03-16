'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DocumentsApi } from '@/lib/api/endpoints';
import { DocumentCategory, DocumentEntityType, DocumentEvent, DocumentItem } from '@/modules/documents/types';

const DOCS_KEY = 'dcm-documents-v1';
const EVENTS_KEY = 'dcm-document-events-v1';

type MutationResult = { ok: true; item?: DocumentItem } | { ok: false; reason: 'invalid' | 'duplicate' | 'missing' };

type BackendDocument = {
  id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  file_name: string;
  file_category: DocumentCategory;
  file_path?: string | null;
  created_at: string;
};

function fromBackend(doc: BackendDocument): DocumentItem {
  return {
    id: doc.id,
    name: doc.file_name,
    entityType: doc.entity_type,
    entityId: doc.entity_id,
    category: doc.file_category,
    filePath: doc.file_path ?? undefined,
    createdAt: doc.created_at
  };
}

function readDocs(): DocumentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    return raw ? (JSON.parse(raw) as DocumentItem[]) : [];
  } catch {
    return [];
  }
}

export function readDocumentEvents(): DocumentEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as DocumentEvent[]) : [];
  } catch {
    return [];
  }
}

function writeDocumentEvents(events: DocumentEvent[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

function pushEvent(event: Omit<DocumentEvent, 'id' | 'createdAt'>) {
  const nextEvents = [{
    id: crypto.randomUUID(),
    ...event,
    createdAt: new Date().toISOString()
  }, ...readDocumentEvents()].slice(0, 300);
  writeDocumentEvents(nextEvents);
}

export function useDocumentsState(entityType: DocumentEntityType, entityId: string) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);

  const load = useCallback(async () => {
    if (!entityId) {
      setDocs([]);
      return;
    }

    const legacy = readDocs()
      .filter((d) => d.entityType === entityType && d.entityId === entityId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    try {
      const remote = await DocumentsApi.list(entityType, entityId);
      setDocs(remote.map(fromBackend));
    } catch {
      setDocs(legacy);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(async (name: string, category: DocumentCategory): Promise<MutationResult> => {
    const clean = name.trim();
    if (!clean || clean.length > 120) return { ok: false, reason: 'invalid' };

    const duplicate = docs.some((d) => d.category === category && d.name.toLowerCase() === clean.toLowerCase());
    if (duplicate) return { ok: false, reason: 'duplicate' };

    try {
      const created = await DocumentsApi.create({
        entity_type: entityType,
        entity_id: entityId,
        file_name: clean,
        file_category: category
      });
      const mapped = fromBackend(created as BackendDocument);
      setDocs((prev) => [mapped, ...prev]);
      pushEvent({ entityType, entityId, action: 'added', documentName: clean });
      return { ok: true, item: mapped };
    } catch {
      return { ok: false, reason: 'missing' };
    }
  }, [docs, entityId, entityType]);

  const remove = useCallback(async (id: string): Promise<MutationResult> => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return { ok: false, reason: 'missing' };

    try {
      await DocumentsApi.remove(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      pushEvent({ entityType, entityId, action: 'removed', documentName: doc.name });
      return { ok: true };
    } catch {
      return { ok: false, reason: 'missing' };
    }
  }, [docs, entityId, entityType]);

  const groupedByCategory = useMemo(() => docs.reduce<Record<DocumentCategory, DocumentItem[]>>((acc, doc) => {
    acc[doc.category] = [...(acc[doc.category] ?? []), doc];
    return acc;
  }, { contract: [], report: [], photo: [], other: [] }), [docs]);

  return { docs, add, remove, groupedByCategory, reload: load };
}
