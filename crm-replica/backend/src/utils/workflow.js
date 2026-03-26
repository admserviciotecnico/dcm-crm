export const STATUS_WORKFLOW = {
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

export const PRIORITY_WEIGHT = { baja: 1, media: 2, alta: 3 };
