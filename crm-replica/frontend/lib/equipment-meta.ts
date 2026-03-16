export type EquipmentMeta = {
  location?: string;
  installedAt?: string;
  notes?: string;
};

const KEY = 'dcm-equipment-meta-v1';

function readAll(): Record<string, EquipmentMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, EquipmentMeta>) : {};
  } catch {
    return {};
  }
}

export function getEquipmentMeta(id: string): EquipmentMeta {
  return readAll()[id] ?? {};
}

export function getEquipmentMetaMap(): Record<string, EquipmentMeta> {
  return readAll();
}
