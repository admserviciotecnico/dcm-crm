import { BuiltInOrderStatus } from '@/types/domain';

export const ORDER_STATUS_COLUMNS: BuiltInOrderStatus[] = [
  'presupuesto_generado',
  'oc_recibida',
  'service_programado',
  'en_ejecucion',
  'completado'
];

export const ORDER_STATUS_LABEL: Record<BuiltInOrderStatus, string> = {
  presupuesto_generado: 'Presupuesto generado',
  oc_recibida: 'OC recibida',
  facturado: 'Facturado',
  pago_recibido: 'Pago recibido',
  documentacion_enviada: 'Documentación enviada',
  documentacion_aprobada: 'Documentación aprobada',
  service_programado: 'Service programado',
  en_ejecucion: 'En ejecución',
  completado: 'Completado',
  cancelado: 'Cancelado'
};

export const ORDER_STATUS_WORKFLOW: Record<BuiltInOrderStatus, BuiltInOrderStatus[]> = {
  presupuesto_generado: ['oc_recibida', 'cancelado'],
  oc_recibida: ['facturado', 'cancelado'],
  facturado: ['pago_recibido', 'cancelado'],
  pago_recibido: ['documentacion_enviada'],
  documentacion_enviada: ['documentacion_aprobada'],
  documentacion_aprobada: ['service_programado'],
  service_programado: ['en_ejecucion', 'cancelado'],
  en_ejecucion: ['completado'],
  completado: [],
  cancelado: []
};

export const ORDER_STATUS_DEFAULT_COLOR: Record<BuiltInOrderStatus, string> = {
  presupuesto_generado: '#64748b',
  oc_recibida: '#0ea5e9',
  facturado: '#2563eb',
  pago_recibido: '#06b6d4',
  documentacion_enviada: '#8b5cf6',
  documentacion_aprobada: '#7c3aed',
  service_programado: '#f59e0b',
  en_ejecucion: '#f97316',
  completado: '#10b981',
  cancelado: '#ef4444'
};
