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

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  phone?: string;
  active?: boolean;
}

export interface Client {
  id: string;
  nombre_empresa: string;
  email: string;
  telefono?: string;
  persona_contacto?: string;
  fecha_vencimiento_documentacion?: string;
  deleted_at?: string | null;
  delayed?: boolean;
}

export interface Equipment {
  id: string;
  client_id: string;
  tipo_equipo: string;
  modelo?: string;
  numero_serie: string;
  estado_actual: string;
  deleted_at?: string | null;
  delayed?: boolean;
}

export interface ServiceOrder {
  id: string;
  client_id: string;
  estado: OrderStatus;
  prioridad: Priority;
  prioridad_peso: number;
  fecha_programada?: string;
  direccion_service?: string;
  contacto_planta?: string;
  telefono_contacto_planta?: string;
  observaciones?: string;
  observaciones_cierre?: string;
  deleted_at?: string | null;
  delayed?: boolean;
  client?: Client;
  technicians?: { technician_id: string }[];
}

export interface OrderHistory {
  id: string;
  campo_modificado?: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  comentario?: string;
  created_at: string;
  usuario?: { email: string };
}
