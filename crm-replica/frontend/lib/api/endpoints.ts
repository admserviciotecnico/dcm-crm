import { api } from './client';
import { portalApi } from './portal-client';
import { AutomationRule, AutomationRunResult, Client, ClientHealth, DashboardKpis, Equipment, EventEntityType, EventLog, ExternalCalendarConnection, ExternalCalendarEventStatus, InvoiceDraft, MaintenancePlan, MapOrderMarker, NotificationItem, OrderHistory, OrderLocationEvent, OrderMaterial, OrderStatusConfig, PortalDocument, PortalTicketDetail, PortalTicketSummary, PortalUser, SearchResultGroup, ServiceOrder, TechnicianMapLocation, Ticket, User } from '@/types/domain';
import { DocumentCategory, DocumentEntityType } from '@/modules/documents/types';

type PaginatedResponse<T> = {
  items: T[];
  page: {
    limit: number;
    offset: number | null;
    hasMore: boolean;
    nextCursor?: string | null;
  };
};

type ApiDocument = {
  id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  file_name: string;
  file_category: DocumentCategory;
  file_path?: string | null;
  created_at: string;
};

export type TableListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
};

export type TableListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const AuthApi = {
  login: (payload: { email: string; password: string }) => api.post('/api/auth/login', payload).then((r) => r.data),
  register: (payload: { first_name: string; last_name: string; email: string; password: string; role: 'admin' | 'tecnico' }) => api.post('/api/auth/register', payload).then((r) => r.data),
  forgotPassword: (payload: { email: string }) => api.post('/api/auth/forgot-password', payload).then((r) => r.data),
  resetPassword: (payload: { token: string; password: string }) => api.post('/api/auth/reset-password', payload).then((r) => r.data),
  me: () => api.get<User>('/api/auth/me').then((r) => r.data)
};

export const DashboardApi = {
  kpis: () => api.get<DashboardKpis>('/api/dashboard/kpis').then((r) => r.data)
};

export const OrdersApi = {
  list: (params: TableListParams) => api.get<TableListResponse<ServiceOrder>>('/api/orders', { params }).then((r) => r.data),
  get: (id: string) => api.get<ServiceOrder>(`/api/orders/${id}`).then((r) => r.data),
  patch: (id: string, payload: Record<string, unknown>) => api.patch(`/api/orders/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/orders/${id}`).then((r) => r.data),
  history: (id: string) => api.get<OrderHistory[]>(`/api/orders/${id}/history`).then((r) => r.data),
  create: (payload: Record<string, unknown>) => api.post('/api/orders', payload).then((r) => r.data),
  assignTechnicians: (id: string, technicianIds: string[]) => api.put(`/api/orders/${id}/technicians`, { technicians: technicianIds }).then((r) => r.data),
  materials: (id: string) => api.get<OrderMaterial[]>(`/api/orders/${id}/materials`).then((r) => r.data),
  addMaterial: (id: string, payload: { name: string; quantity: number; unit_cost: number }) => api.post<OrderMaterial>(`/api/orders/${id}/materials`, payload).then((r) => r.data),
  updateMaterial: (id: string, materialId: string, payload: Partial<{ name: string; quantity: number; unit_cost: number }>) => api.patch<OrderMaterial>(`/api/orders/${id}/materials/${materialId}`, payload).then((r) => r.data),
  removeMaterial: (id: string, materialId: string) => api.delete(`/api/orders/${id}/materials/${materialId}`).then((r) => r.data),
  locationEvents: (id: string) => api.get<OrderLocationEvent[]>(`/api/orders/${id}/location-events`).then((r) => r.data),
  recordLocationEvent: (id: string, payload: { event_type: 'arrival' | 'departure'; latitude: number; longitude: number }) => api.post<OrderLocationEvent>(`/api/orders/${id}/location-events`, payload).then((r) => r.data),
  exportPdf: (id: string) => api.get<Blob>(`/api/orders/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
  createInvoiceDraft: (id: string, payload?: { labor_rate?: number }) => api.post<InvoiceDraft>(`/api/orders/${id}/invoice-draft`, payload ?? {}).then((r) => r.data)
};

export const OrderStatusesApi = {
  list: () => api.get<OrderStatusConfig[]>('/api/order-statuses').then((r) => r.data),
  create: (payload: { key: string; label: string; color: string; sort_order?: number; is_active?: boolean }) => api.post<OrderStatusConfig>('/api/order-statuses', payload).then((r) => r.data),
  update: (id: string, payload: Partial<{ key: string; label: string; color: string; sort_order: number; is_active: boolean }>) => api.patch<OrderStatusConfig>(`/api/order-statuses/${id}`, payload).then((r) => r.data)
};

export const ClientsApi = {
  list: () => api.get<Client[]>('/api/clients').then((r) => r.data),
  listPage: (params: TableListParams) => api.get<TableListResponse<Client>>('/api/clients', { params }).then((r) => r.data),
  create: (payload: Partial<Client>) => api.post('/api/clients', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Client>) => api.patch(`/api/clients/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/clients/${id}`).then((r) => r.data),
  health: (id: string) => api.get<ClientHealth>(`/api/clients/${id}/health`).then((r) => r.data)
};

export const EquipmentsApi = {
  list: () => api.get<Equipment[]>('/api/equipments').then((r) => r.data),
  listPage: (params: TableListParams) => api.get<TableListResponse<Equipment>>('/api/equipments', { params }).then((r) => r.data),
  create: (payload: Partial<Equipment>) => api.post('/api/equipments', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Equipment>) => api.patch(`/api/equipments/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/equipments/${id}`).then((r) => r.data)
};

export const UsersApi = {
  list: () => api.get<User[]>('/api/users').then((r) => r.data),
  create: (payload: { first_name: string; last_name: string; email: string; password: string; role: 'admin' | 'tecnico' }) => api.post('/api/users', payload).then((r) => r.data),
  setActive: (id: string, active: boolean) => api.patch(`/api/users/${id}`, { active }).then((r) => r.data),
  setRole: (id: string, role: 'admin' | 'tecnico') => api.patch(`/api/users/${id}`, { role }).then((r) => r.data),
  me: () => api.get<User>('/api/users/me').then((r) => r.data),
  updateMe: (payload: { first_name: string; last_name: string; phone?: string }) => api.patch('/api/users/me', payload).then((r) => r.data)
};

export const SearchApi = {
  global: (q: string, limit = 10) => api.get<SearchResultGroup>('/api/search', { params: { q, limit } }).then((r) => r.data)
};

export const NotificationsApi = {
  list: (params?: { page?: number; pageSize?: number }) => api.get<{ items: NotificationItem[]; total: number; unread: number; page: number; pageSize: number }>('/api/notifications', { params }).then((r) => r.data),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/api/notifications/read-all').then((r) => r.data)
};

export const DocumentsApi = {
  list: (entityType: DocumentEntityType, entityId: string, params?: { limit?: number; offset?: number }) => api.get<PaginatedResponse<ApiDocument>>('/api/documents', { params: { entityType, entityId, ...params } }).then((r) => r.data.items),
  create: (payload: { entity_type: DocumentEntityType; entity_id: string; file_name: string; file_category: DocumentCategory; file_path?: string }) => api.post<ApiDocument>('/api/documents', payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/documents/${id}`).then((r) => r.data)
};

export const EventsApi = {
  list: (params?: { entityType?: EventEntityType; entityId?: string; limit?: number; offset?: number; cursor?: string }) => api.get<PaginatedResponse<EventLog>>('/api/events', { params }).then((r) => r.data.items)
};

export const AutomationRulesApi = {
  list: () => api.get<AutomationRule[]>('/api/automation-rules').then((r) => r.data),
  create: (payload: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>) => api.post<AutomationRule>('/api/automation-rules', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>>) => api.patch<AutomationRule>(`/api/automation-rules/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/automation-rules/${id}`).then((r) => r.data),
  run: () => api.post<{ rules: AutomationRunResult[]; totalUpdated: number }>('/api/automation-rules/run').then((r) => r.data)
};

export const InvoiceDraftsApi = {
  get: (id: string) => api.get<InvoiceDraft>(`/api/invoice-drafts/${id}`).then((r) => r.data)
};

export const TicketsApi = {
  list: (params?: TableListParams) => api.get<{ items: Ticket[]; total: number }>('/api/tickets', { params }).then((r) => r.data),
  get: (id: string) => api.get<Ticket>(`/api/tickets/${id}`).then((r) => r.data),
  create: (payload: {
    client_id: string;
    equipment_id?: string;
    serial_number?: string;
    channel: 'phone' | 'email' | 'web' | 'whatsapp';
    issue_description: string;
    priority?: 'baja' | 'media' | 'alta';
    category?: string;
    status?: 'new' | 'triage' | 'in_diagnosis' | 'escalated' | 'resolved' | 'closed';
    warranty_status?: 'unknown' | 'pending_review' | 'approved' | 'rejected';
    coverage?: 'full' | 'partial' | 'none';
    warranty_reason?: string;
    warranty_notes?: string;
    reported_by_name?: string;
    reported_by_contact?: string;
  }) => api.post<Ticket>('/api/tickets', payload).then((r) => r.data),
  patch: (id: string, payload: Partial<{
    issue_description: string;
    priority: 'baja' | 'media' | 'alta';
    category: string;
    status: 'new' | 'triage' | 'in_diagnosis' | 'resolved_remote' | 'escalated' | 'resolved' | 'closed';
    diagnosis: string;
    diagnosis_result: string;
    requires_intervention: boolean;
    warranty_status: 'unknown' | 'pending_review' | 'approved' | 'rejected';
    coverage: 'full' | 'partial' | 'none';
    warranty_reason: string;
    warranty_notes: string;
  }>) => api.patch<Ticket>(`/api/tickets/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete<{ ok: true }>(`/api/tickets/${id}`).then((r) => r.data),
  escalate: (id: string) => api.post<ServiceOrder>(`/api/tickets/${id}/escalate`).then((r) => r.data)
};

export const PortalAuthApi = {
  login: (payload: { email: string; password: string }) => portalApi.post<{ access_token: string; token_type: 'bearer'; user: PortalUser }>('/api/portal/auth/login', payload).then((r) => r.data),
  me: () => portalApi.get<PortalUser>('/api/portal/me').then((r) => r.data)
};

export const PortalApi = {
  listOrders: () => portalApi.get<ServiceOrder[]>('/api/portal/orders').then((r) => r.data),
  getOrder: (id: string) => portalApi.get<ServiceOrder>(`/api/portal/orders/${id}`).then((r) => r.data),
  getOrderHistory: (id: string) => portalApi.get<OrderHistory[]>(`/api/portal/orders/${id}/history`).then((r) => r.data),
  getOrderDocuments: (id: string) => portalApi.get<PortalDocument[]>(`/api/portal/orders/${id}/documents`).then((r) => r.data),
  listTickets: () => portalApi.get<PortalTicketSummary[]>('/api/portal/tickets').then((r) => r.data),
  getTicket: (id: string) => portalApi.get<PortalTicketDetail>(`/api/portal/tickets/${id}`).then((r) => r.data),
  createTicket: (payload: { serial_number: string; issue_description: string; attachments?: Array<{ file_name: string; file_path?: string; file_category?: 'contract' | 'report' | 'photo' | 'other' }> }) => portalApi.post<{ ticket: PortalTicketSummary; warning?: string | null }>('/api/portal/tickets', payload).then((r) => r.data),
  listDocuments: () => portalApi.get<{ client: PortalDocument[]; orders: PortalDocument[] }>('/api/portal/documents').then((r) => r.data),
  exportPdf: (id: string) => portalApi.get<Blob>(`/api/portal/orders/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data)
};

export const CalendarIntegrationsApi = {
  list: () => api.get<ExternalCalendarConnection[]>('/api/calendar-integrations').then((r) => r.data),
  connect: (payload: { provider: 'google' | 'outlook' }) => api.post<{ state: string; authorization_url: string }>('/api/calendar-integrations/connect', payload).then((r) => r.data),
  disconnect: (id: string) => api.delete(`/api/calendar-integrations/${id}`).then((r) => r.data),
  orderStatus: (orderId: string) => api.get<ExternalCalendarEventStatus[]>(`/api/calendar-integrations/orders/${orderId}/status`).then((r) => r.data),
  syncOrderNow: (orderId: string) => api.post<{ processed: number; synced: number; errors: number }>(`/api/calendar-integrations/orders/${orderId}/sync`).then((r) => r.data)
};

export const MaintenanceApi = {
  listPlans: () => api.get<MaintenancePlan[]>('/api/maintenance-plans').then((r) => r.data),
  createPlan: (payload: Partial<MaintenancePlan>) => api.post<MaintenancePlan>('/api/maintenance-plans', payload).then((r) => r.data),
  updatePlan: (id: string, payload: Partial<MaintenancePlan>) => api.patch<MaintenancePlan>(`/api/maintenance-plans/${id}`, payload).then((r) => r.data),
  disablePlan: (id: string) => api.delete(`/api/maintenance-plans/${id}`).then((r) => r.data),
  runNow: () => api.post<{ scanned: number; generated: number; skipped: number; failed: number; errors: Array<{ plan_id: string; message: string }> }>('/api/maintenance/run').then((r) => r.data)
};

export const MapApi = {
  orders: () => api.get<MapOrderMarker[]>('/api/map/orders').then((r) => r.data),
  technicians: () => api.get<TechnicianMapLocation[]>('/api/map/technicians').then((r) => r.data)
};

export const TechnicianLocationApi = {
  getSharing: () => api.get<{ enabled: boolean; updated_at: string | null }>('/api/technicians/location-sharing').then((r) => r.data),
  setSharing: (enabled: boolean) => api.post<{ enabled: boolean; updated_at: string | null }>('/api/technicians/location-sharing', { enabled }).then((r) => r.data),
  updateLocation: (payload: { lat: number; lng: number; accuracy?: number }) => api.post('/api/technicians/location', payload).then((r) => r.data)
};
