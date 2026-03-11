import { api } from './client';
import { Client, Equipment, OrderHistory, ServiceOrder, User } from '@/types/domain';

export const AuthApi = {
  login: (payload: { email: string; password: string }) => api.post('/api/auth/login', payload).then((r) => r.data),
  me: () => api.get<User>('/api/auth/me').then((r) => r.data)
};

export const DashboardApi = {
  kpis: () => api.get('/api/dashboard/kpis').then((r) => r.data)
};

export const OrdersApi = {
  list: (params: Record<string, string | number>) => api.get<{ items: ServiceOrder[]; total: number; page: number; pageSize: number }>('/api/orders', { params }).then((r) => r.data),
  patch: (id: string, payload: Record<string, unknown>) => api.patch(`/api/orders/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/orders/${id}`).then((r) => r.data),
  history: (id: string) => api.get<OrderHistory[]>(`/api/orders/${id}/history`).then((r) => r.data),
  create: (payload: Record<string, unknown>) => api.post('/api/orders', payload).then((r) => r.data),
  assignTechnicians: (id: string, technicianIds: string[]) => api.put(`/api/orders/${id}/technicians`, { technician_ids: technicianIds }).then((r) => r.data)
};

export const ClientsApi = {
  list: () => api.get<Client[]>('/api/clients').then((r) => r.data),
  create: (payload: Partial<Client>) => api.post('/api/clients', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Client>) => api.patch(`/api/clients/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/clients/${id}`).then((r) => r.data)
};

export const EquipmentsApi = {
  list: () => api.get<Equipment[]>('/api/equipments').then((r) => r.data),
  create: (payload: Partial<Equipment>) => api.post('/api/equipments', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Equipment>) => api.patch(`/api/equipments/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/equipments/${id}`).then((r) => r.data)
};

export const UsersApi = {
  list: () => api.get<User[]>('/api/users').then((r) => r.data),
  me: () => api.get<User>('/api/users/me').then((r) => r.data),
  updateMe: (payload: { first_name: string; last_name: string; phone?: string }) => api.patch('/api/users/me', payload).then((r) => r.data)
};
