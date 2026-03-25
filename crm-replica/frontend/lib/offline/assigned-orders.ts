import { ServiceOrder } from '@/types/domain';

const DB_NAME = 'dcm-crm-offline';
const DB_VERSION = 1;
const SNAPSHOT_STORE = 'assigned-order-snapshots';
const DETAIL_STORE = 'assigned-order-details';

type SnapshotRecord = {
  key: string;
  items: ServiceOrder[];
  total: number;
  savedAt: string;
};

type DetailRecord = {
  id: string;
  order: ServiceOrder;
  savedAt: string;
};

function canUseIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => resolve(null);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(DETAIL_STORE)) db.createObjectStore(DETAIL_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => void): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    callback(store);
    tx.oncomplete = () => resolve(null);
    tx.onerror = () => resolve(null);
  });
}

export async function saveAssignedOrdersSnapshot(key: string, items: ServiceOrder[], total: number) {
  await withStore<void>(SNAPSHOT_STORE, 'readwrite', (store) => {
    store.put({ key, items, total, savedAt: new Date().toISOString() } satisfies SnapshotRecord);
  });
}

export async function loadAssignedOrdersSnapshot(key: string): Promise<SnapshotRecord | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
    const request = tx.objectStore(SNAPSHOT_STORE).get(key);
    request.onsuccess = () => resolve((request.result as SnapshotRecord | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
}

export async function saveAssignedOrderDetail(order: ServiceOrder) {
  await withStore<void>(DETAIL_STORE, 'readwrite', (store) => {
    store.put({ id: order.id, order, savedAt: new Date().toISOString() } satisfies DetailRecord);
  });
}

export async function loadAssignedOrderDetail(id: string): Promise<DetailRecord | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(DETAIL_STORE, 'readonly');
    const request = tx.objectStore(DETAIL_STORE).get(id);
    request.onsuccess = () => resolve((request.result as DetailRecord | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
}
