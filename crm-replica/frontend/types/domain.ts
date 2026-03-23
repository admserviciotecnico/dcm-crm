export type Role = 'admin' | 'tecnico';
export type Priority = 'baja' | 'media' | 'alta';
export type OrderStatus =
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

export type EquipmentStatus = 'operativo' | 'mantenimiento' | 'fuera_servicio' | 'en_revision' | 'revision';

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

export interface OrderChecklist {
  trabajo_realizado?: boolean;
  area_limpia?: boolean;
  equipo_probado?: boolean;
  documentacion_entregada?: boolean;
}

export interface ServiceOrder {
  id: string;
  client_id: string;
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
  technicians?: { technician_id: string; technician?: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'> }[];
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
