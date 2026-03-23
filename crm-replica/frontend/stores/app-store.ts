import { create } from 'zustand';
import { NotificationItem } from '@/types/domain';

export type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string };

type State = {
  loadingCount: number;
  toasts: Toast[];
  notifications: NotificationItem[];
  startLoading: () => void;
  stopLoading: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  pushNotification: (payload: { title: string; message: string }) => void;
  setNotifications: (items: NotificationItem[]) => void;
  markNotificationsRead: (ids?: string[]) => void;
};

export const appStore = create<State>((set) => ({
  loadingCount: 0,
  toasts: [],
  notifications: [],
  startLoading: () => set((s) => ({ loadingCount: s.loadingCount + 1 })),
  stopLoading: () => set((s) => ({ loadingCount: Math.max(0, s.loadingCount - 1) })),
  pushToast: (toast) =>
    set((s) => ({ toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  pushNotification: (payload) =>
    set((s) => ({
      notifications: [
        {
          id: crypto.randomUUID(),
          title: payload.title,
          description: payload.message,
          created_at: new Date().toISOString(),
          read: false,
          service_order_id: null
        },
        ...s.notifications
      ].slice(0, 20)
    })),
  setNotifications: (items) => set({ notifications: items }),
  markNotificationsRead: (ids) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n))
    }))
}));
