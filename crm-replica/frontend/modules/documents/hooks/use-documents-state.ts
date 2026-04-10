'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DocumentsApi } from '@/lib/api/endpoints';
import { DocumentCategory, DocumentEntityType, DocumentItem } from '@/modules/documents/types';

type MutationResult = { ok: true; item?: DocumentItem } | { ok: false; reason: 'invalid' | 'duplicate' | 'missing' | 'request_failed' };
type DocumentsStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'forbidden' | 'error';

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

export function useDocumentsState(entityType: DocumentEntityType, entityId: string) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState<DocumentsStatus>('idle');

  const load = useCallback(async (cancelledRef?: { current: boolean }) => {
    if (!entityId) {
      if (!cancelledRef?.current) {
        setDocs([]);
        setStatus('empty');
      }
      return;
    }

    if (!cancelledRef?.current) setStatus('loading');
    try {
      const remote = await DocumentsApi.list(entityType, entityId);
      if (!cancelledRef?.current) {
        const mapped = remote.map(fromBackend);
        setDocs(mapped);
        setStatus(mapped.length > 0 ? 'ready' : 'empty');
      }
    } catch (error: unknown) {
      if (!cancelledRef?.current) {
        setDocs([]);
        const code = (error as { response?: { status?: number } })?.response?.status;
        setStatus(code === 403 ? 'forbidden' : 'error');
      }
    }
  }, [entityId, entityType]);

  useEffect(() => {
    const cancelledRef = { current: false };
    void load(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  const add = useCallback(async (name: string, category: DocumentCategory, options?: { filePath?: string }): Promise<MutationResult> => {
    const clean = name.trim();
    if (!clean || clean.length > 120) return { ok: false, reason: 'invalid' };

    const duplicate = docs.some((d) => d.category === category && d.name.toLowerCase() === clean.toLowerCase());
    if (duplicate) return { ok: false, reason: 'duplicate' };

    try {
      const created = await DocumentsApi.create({
        entity_type: entityType,
        entity_id: entityId,
        file_name: clean,
        file_category: category,
        file_path: options?.filePath
      });
      const mapped = fromBackend(created as BackendDocument);
      setDocs((prev) => [mapped, ...prev]);
      return { ok: true, item: mapped };
    } catch {
      return { ok: false, reason: 'request_failed' };
    }
  }, [docs, entityId, entityType]);

  const remove = useCallback(async (id: string): Promise<MutationResult> => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return { ok: false, reason: 'missing' };

    try {
      await DocumentsApi.remove(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      return { ok: true };
    } catch {
      return { ok: false, reason: 'request_failed' };
    }
  }, [docs]);

  const groupedByCategory = useMemo(() => docs.reduce<Record<DocumentCategory, DocumentItem[]>>((acc, doc) => {
    acc[doc.category] = [...(acc[doc.category] ?? []), doc];
    return acc;
  }, { contract: [], report: [], photo: [], other: [] }), [docs]);

  return { docs, status, add, remove, groupedByCategory, reload: load };
}
