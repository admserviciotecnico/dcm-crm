import { OrderStatus } from '@/types/domain';

export const ORDER_STATUS_COLUMNS: OrderStatus[] = [
  'presupuesto_generado',
  'oc_recibida',
  'service_programado',
  'en_ejecucion',
  'completado'
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
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

export const ORDER_STATUS_WORKFLOW: Record<OrderStatus, OrderStatus[]> = {
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
