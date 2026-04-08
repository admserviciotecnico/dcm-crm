import { create } from 'zustand';
import { isWorkflowEnabledStatus, ORDER_STATUS_COLUMNS, ORDER_STATUS_DEFAULT_COLOR, ORDER_STATUS_LABEL, WORKFLOW_ENABLED_ORDER_STATUSES } from '@/constants/orderStatus';
import { OrderStatusesApi } from '@/lib/api/endpoints';
import { BuiltInOrderStatus, OrderStatusConfig } from '@/types/domain';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

function isHexColor(value: string | null | undefined) {
  return !!value && HEX_COLOR.test(value);
}

function fallbackStatusList(): OrderStatusConfig[] {
  return WORKFLOW_ENABLED_ORDER_STATUSES.map((key, index) => ({
    id: key,
    key,
    label: ORDER_STATUS_LABEL[key],
    color: ORDER_STATUS_DEFAULT_COLOR[key],
    sort_order: (index + 1) * 10,
    is_active: true,
    is_system: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  }));
}

type State = {
  items: OrderStatusConfig[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  setItems: (items: OrderStatusConfig[]) => void;
  labelFor: (key: string) => string;
  colorFor: (key: string) => string;
  activeOptions: () => OrderStatusConfig[];
  workflowOptions: () => OrderStatusConfig[];
  isWorkflowStatus: (key: string) => boolean;
  kanbanColumns: () => BuiltInOrderStatus[];
};

export const orderStatusStore = create<State>((set, get) => ({
  items: fallbackStatusList(),
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const remote = await OrderStatusesApi.list();
      if (remote.length > 0) {
        set({ items: remote, loaded: true, loading: false });
        return;
      }
      set({ loaded: true, loading: false });
    } catch {
      set({ loaded: true, loading: false });
    }
  },
  setItems: (items) => set({ items }),
  labelFor: (key) => {
    const found = get().items.find((item) => item.key === key);
    if (found?.label) return found.label;
    return key?.replace(/_/g, ' ') || '-';
  },
  colorFor: (key) => {
    const found = get().items.find((item) => item.key === key);
    if (found && isHexColor(found.color)) return found.color;
    const defaultColor = ORDER_STATUS_DEFAULT_COLOR[key as BuiltInOrderStatus];
    return defaultColor ?? '#64748b';
  },
  activeOptions: () => get().items.filter((item) => item.is_active).sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
  workflowOptions: () => get().items.filter((item) => item.is_active && isWorkflowEnabledStatus(item.key)).sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
  isWorkflowStatus: (key) => isWorkflowEnabledStatus(key),
  kanbanColumns: () => ORDER_STATUS_COLUMNS
}));
