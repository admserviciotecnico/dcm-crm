'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DocumentCategory, DocumentEntityType, DocumentEvent, DocumentItem } from '@/modules/documents/types';

const DOCS_KEY = 'dcm-documents-v1';
const EVENTS_KEY = 'dcm-document-events-v1';
const DOCS_UPDATED_EVENT = 'dcm-documents-updated';

type MutationResult = { ok: true; item?: DocumentItem } | { ok: false; reason: 'invalid' | 'duplicate' | 'missing' };

function readDocs(): DocumentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    return raw ? (JSON.parse(raw) as DocumentItem[]) : [];
  } catch {
    return [];
  }
}

function writeDocs(docs: DocumentItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  window.dispatchEvent(new Event(DOCS_UPDATED_EVENT));
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
  const [allDocs, setAllDocs] = useState<DocumentItem[]>([]);

  useEffect(() => {
    setAllDocs(readDocs());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => setAllDocs(readDocs());
    const onStorage = (event: StorageEvent) => {
      if (event.key === DOCS_KEY) sync();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(DOCS_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(DOCS_UPDATED_EVENT, sync);
    };
  }, []);

  const docs = useMemo(
    () => allDocs
      .filter((d) => d.entityType === entityType && d.entityId === entityId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allDocs, entityId, entityType]
  );

  const add = useCallback((name: string, category: DocumentCategory): MutationResult => {
    const clean = name.trim();
    if (!clean || clean.length > 120) return { ok: false, reason: 'invalid' };

    const duplicate = allDocs.some((d) => d.entityType === entityType && d.entityId === entityId && d.category === category && d.name.toLowerCase() === clean.toLowerCase());
    if (duplicate) return { ok: false, reason: 'duplicate' };

    const doc: DocumentItem = {
      id: crypto.randomUUID(),
      name: clean,
      category,
      entityType,
      entityId,
      createdAt: new Date().toISOString()
    };

    setAllDocs((prev) => {
      const next = [doc, ...prev];
      writeDocs(next);
      return next;
    });
    pushEvent({ entityType, entityId, action: 'added', documentName: clean });

    return { ok: true, item: doc };
  }, [allDocs, entityId, entityType]);

  const remove = useCallback((id: string): MutationResult => {
    const doc = allDocs.find((d) => d.id === id);
    if (!doc) return { ok: false, reason: 'missing' };

    setAllDocs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      writeDocs(next);
      return next;
    });
    pushEvent({ entityType, entityId, action: 'removed', documentName: doc.name });

    return { ok: true };
  }, [allDocs, entityId, entityType]);

  const groupedByCategory = useMemo(() => docs.reduce<Record<DocumentCategory, DocumentItem[]>>((acc, doc) => {
    acc[doc.category] = [...(acc[doc.category] ?? []), doc];
    return acc;
  }, { contract: [], report: [], photo: [], other: [] }), [docs]);

  return { docs, add, remove, groupedByCategory };
}
