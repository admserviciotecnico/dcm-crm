export type Role = 'admin' | 'tecnico';
export type Priority = 'baja' | 'media' | 'alta';
export type BuiltInOrderStatus =
  | 'presupuesto_generado'
  | 'oc_recibida'
  | 'facturado'
  | 'pago_recibido'
  | 'documentacion_enviada'
  | 'documentacion_aprobada'
  | 'service_programado'
  | 'en_ejecucion'
  | 'completado'
  | 'cancelado';

export type OrderStatus = BuiltInOrderStatus | (string & {});

export type SlaStatus = 'ok' | 'warning' | 'critical' | 'breached' | 'met';

export interface UserMetrics {
  assigned_orders: number;
  active_orders: number;
  completed_orders: number;
  overdue_orders: number;
  last_assignment_at?: string | null;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  phone?: string;
  active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  last_activity_at?: string | null;
  metrics?: UserMetrics;
}

export interface Client {
  id: string;
  nombre_empresa: string;
  direccion?: string;
  email: string;
  telefono?: string;
  persona_contacto?: string;
  observaciones?: string;
  fecha_vencimiento_documentacion?: string;
  deleted_at?: string | null;
  delayed?: boolean;
}

export interface ClientHealth {
  total_orders: number;
  completed_on_time: number;
  completed_late: number;
  avg_resolution_hours: number | null;
  last_interaction_at?: string | null;
  on_time_rate?: number | null;
  documentation_status: 'vigente' | 'proxima_a_vencer' | 'vencida' | 'sin_fecha';
  materials_summary: {
    total_items: number;
    estimated_cost: number;
  };
}

export type EquipmentStatus = 'operativo' | 'mantenimiento' | 'fuera_servicio' | 'en_revision';

export interface Equipment {
  id: string;
  client_id: string;
  tipo_equipo: string;
  modelo?: string;
  numero_serie: string;
  ubicacion_planta?: string;
  fecha_instalacion?: string;
  estado_actual: EquipmentStatus | string;
  observaciones?: string;
  created_at?: string;
  deleted_at?: string | null;
  delayed?: boolean;
}

export interface OrderMaterial {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
  created_at?: string;
  updated_at?: string;
}


export interface OrderLocationEvent {
  id: string;
  order_id: string;
  user_id: string;
  event_type: 'arrival' | 'departure' | string;
  latitude: number;
  longitude: number;
  created_at: string;
  user?: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'role'>;
}

export interface OrderChecklist {
  trabajo_realizado?: boolean;
  area_limpia?: boolean;
  equipo_probado?: boolean;
  documentacion_entregada?: boolean;
}

export interface ServiceOrder {
  id: string;
  client_id: string;
  ticket_id?: string | null;
  estado: OrderStatus;
  prioridad: Priority;
  prioridad_peso: number;
  created_at?: string;
  updated_at?: string;
  fecha_programada?: string;
  direccion_service?: string;
  contacto_planta?: string;
  telefono_contacto_planta?: string;
  observaciones?: string;
  observaciones_cierre?: string;
  tiempo_trabajado_horas?: number | null;
  firma_cliente?: string | null;
  foto_trabajo_url?: string | null;
  checklist_cierre?: OrderChecklist | null;
  deleted_at?: string | null;
  delayed?: boolean;
  sla_deadline?: string | null;
  sla_status?: SlaStatus;
  client?: Client;
  materials?: OrderMaterial[];
  location_events?: OrderLocationEvent[];
  invoice_draft?: InvoiceDraft | null;
  ticket?: Pick<Ticket, 'id'> | null;
  technicians?: { technician_id: string; technician?: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'> }[];
}

export type TicketChannel = 'phone' | 'email' | 'web' | 'whatsapp';
export type TicketPriority = Priority;
export type TicketStatus = 'new' | 'triage' | 'in_diagnosis' | 'resolved_remote' | 'escalated' | 'resolved' | 'closed';

export interface TicketEvent {
  id: string;
  ticket_id: string;
  type: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  client_id: string;
  equipment_id?: string | null;
  serial_number?: string | null;
  channel: TicketChannel | string;
  issue_description: string;
  priority: TicketPriority | string;
  category?: string | null;
  status: TicketStatus | string;
  diagnosis?: string | null;
  diagnosis_result?: string | null;
  requires_intervention?: boolean;
  reported_by_name?: string | null;
  reported_by_contact?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<Client, 'id' | 'nombre_empresa'>;
  events?: TicketEvent[];
  service_orders?: Array<Pick<ServiceOrder, 'id'>>;
}

export interface OrderStatusConfig {
  id: string;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderHistory {
  id: string;
  campo_modificado?: string;
  valor_anterior?: string | null;
  valor_nuevo?: string | null;
  comentario?: string | null;
  created_at: string;
  actor_name?: string;
  actor_role?: Role | null;
  summary?: string;
  usuario?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface DashboardKpis {
  total_orders: number;
  open_orders: number;
  in_progress: number;
  completed_this_month: number;
  completed_last_week?: number;
  completed_prev_week?: number;
  delayed: number;
  high_priority: number;
  documentation_expired: number;
  sla_breached?: number;
  sla_critical?: number;
  sla_at_risk: number;
  avg_resolution_hours: number | null;
  avg_resolution_days: number | null;
  sla_compliance_rate: number;
  orders_by_status?: Partial<Record<OrderStatus, number>>;
}

export interface SearchResultGroup {
  orders: ServiceOrder[];
  clients: Client[];
  equipments: Equipment[];
  users: User[];
}

export type EventEntityType = 'order' | 'client' | 'equipment' | 'document' | 'system';
export type EventType = 'created' | 'updated' | 'deleted' | 'status_changed' | 'document_added' | 'document_removed';

export interface EventLog {
  id: string;
  entity_type: EventEntityType;
  entity_id?: string | null;
  event_type: EventType;
  message: string;
  actor_user_id?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  service_order_id?: string | null;
}

export interface AutomationRule {
  id: string;
  name: string;
  active: boolean;
  trigger_type: 'delayed_in_status';
  target_status: BuiltInOrderStatus;
  threshold_hours: number;
  action_type: 'set_priority_alta_notify_admin';
  action_payload?: { priority?: 'alta' } | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRunResult {
  ruleId: string;
  matched: number;
  updated: number;
}

export interface InvoiceDraftMaterial {
  name: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface InvoiceDraft {
  id: string;
  order_id: string;
  client_id: string;
  status: string;
  labor_hours: number;
  labor_rate: number;
  labor_amount: number;
  materials_amount: number;
  total_amount: number;
  currency: string;
  payload?: {
    materials?: InvoiceDraftMaterial[];
    generated_from_status?: BuiltInOrderStatus;
    generated_by_user_id?: string;
  } | null;
  created_at: string;
  updated_at: string;
  order?: Pick<ServiceOrder, 'id' | 'estado' | 'created_at' | 'updated_at'>;
  client?: Pick<Client, 'id' | 'nombre_empresa' | 'email'>;
}

export interface PortalUser {
  id: string;
  email: string;
  client_id: string;
  client_name?: string | null;
  last_login_at?: string | null;
  active?: boolean;
}

export interface ExternalCalendarConnection {
  id: string;
  provider: 'google' | 'outlook';
  expires_at?: string | null;
  external_calendar_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalCalendarEventStatus {
  id: string;
  order_id: string;
  user_id: string;
  provider: 'google' | 'outlook';
  external_event_id: string;
  sync_status: 'synced' | 'pending' | 'error';
  last_error?: string | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MapOrderMarker {
  id: string;
  client_id: string;
  client_name?: string | null;
  estado: OrderStatus;
  prioridad: Priority;
  delayed: boolean;
  direccion_service?: string | null;
  lat: number;
  lng: number;
  latest_location_at: string;
  technicians: Array<{ id: string; first_name: string; last_name: string; email: string }>;
}

export interface TechnicianMapLocation {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  captured_at: string;
}

export interface PortalDocument {
  id: string;
  entity_type: 'order' | 'client' | 'equipment';
  entity_id: string;
  file_name: string;
  file_category: 'contract' | 'report' | 'photo' | 'other';
  file_path?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PortalTicketSummary {
  id: string;
  serial_number?: string | null;
  issue_description: string;
  status: TicketStatus | string;
  priority: TicketPriority | string;
  created_at: string;
}

export interface PortalTicketDetail extends PortalTicketSummary {
  diagnosis_result?: string | null;
  requires_intervention?: boolean;
  timeline: TicketEvent[];
}
