export type EquipmentMeta = {
  location?: string;
  installedAt?: string;
  notes?: string;
};

const KEY = 'dcm-equipment-meta-v1';
export const EQUIPMENT_META_UPDATED_EVENT = 'dcm-equipment-meta-updated';

function readAll(): Record<string, EquipmentMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, EquipmentMeta>) : {};
  } catch {
    return {};
  }
}

function writeAll(value: Record<string, EquipmentMeta>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(EQUIPMENT_META_UPDATED_EVENT));
}

export function getEquipmentMeta(id: string): EquipmentMeta {
  return readAll()[id] ?? {};
}

export function getEquipmentMetaMap(): Record<string, EquipmentMeta> {
  return readAll();
}

export function setEquipmentMeta(id: string, meta: EquipmentMeta) {
  const current = readAll();
  current[id] = meta;
  writeAll(current);
}
