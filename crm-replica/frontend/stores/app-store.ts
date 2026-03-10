import { create } from 'zustand';

export type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string };
export type NotificationItem = { id: string; title: string; message: string; createdAt: string; read: boolean };

type State = {
  loadingCount: number;
  toasts: Toast[];
  notifications: NotificationItem[];
  startLoading: () => void;
  stopLoading: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  pushNotification: (payload: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationsRead: () => void;
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
          message: payload.message,
          createdAt: new Date().toISOString(),
          read: false
        },
        ...s.notifications
      ].slice(0, 20)
    })),
  markNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
}));
