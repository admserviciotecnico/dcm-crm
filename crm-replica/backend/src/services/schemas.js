import { z } from 'zod';

export const registerSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'tecnico']).default('tecnico')
}).strict();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
}).strict();


export const forgotPasswordSchema = z.object({
  email: z.string().email()
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
}).strict();

export const portalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
}).strict();

export const portalUserCreateSchema = z.object({
  client_id: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  active: z.boolean().optional()
}).strict();

export const clientCreateSchema = z.object({
  nombre_empresa: z.string().min(1),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email(),
  persona_contacto: z.string().optional(),
  fecha_vencimiento_documentacion: z.coerce.date().optional(),
  observaciones: z.string().optional(),
  is_active: z.boolean().optional()
}).strict();

export const clientUpdateSchema = clientCreateSchema.partial().strict();

export const equipmentCreateSchema = z.object({
  client_id: z.string().min(1),
  tipo_equipo: z.string().min(1),
  modelo: z.string().optional(),
  numero_serie: z.string().min(1),
  ubicacion_planta: z.string().optional(),
  observaciones: z.string().optional(),
  fecha_instalacion: z.coerce.date().optional(),
  estado_actual: z.enum(['operativo', 'mantenimiento', 'fuera_servicio', 'en_revision']).optional(),
  is_active: z.boolean().optional()
}).strict();

export const equipmentUpdateSchema = equipmentCreateSchema.partial().strict();

export const userProfileUpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional()
}).strict();

export const userAdminUpdateSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(['admin', 'tecnico']).optional()
}).strict();

export const automationRuleSchema = z.object({
  name: z.string().min(1),
  active: z.boolean().optional(),
  trigger_type: z.literal('delayed_in_status').default('delayed_in_status'),
  target_status: z.enum(['presupuesto_generado','oc_recibida','facturado','pago_recibido','documentacion_enviada','documentacion_aprobada','service_programado','en_ejecucion','completado','cancelado']),
  threshold_hours: z.coerce.number().int().positive(),
  action_type: z.literal('set_priority_alta_notify_admin').default('set_priority_alta_notify_admin'),
  action_payload: z.object({ priority: z.literal('alta').default('alta') }).optional()
}).strict();

export const automationRuleUpdateSchema = automationRuleSchema.partial().strict();

export const calendarConnectSchema = z.object({
  provider: z.literal('google')
}).strict();

export const calendarCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1)
}).strict();

export const technicianLocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().positive().optional()
}).strict();

export const technicianLocationSharingSchema = z.object({
  enabled: z.boolean()
}).strict();

const closureChecklistSchema = z.object({
  trabajo_realizado: z.boolean().optional(),
  area_limpia: z.boolean().optional(),
  equipo_probado: z.boolean().optional(),
  documentacion_entregada: z.boolean().optional()
}).strict();

export const materialSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit_cost: z.coerce.number().min(0)
}).strict();

const orderStatusKeySchema = z.string().regex(/^[a-z0-9_]+$/, 'Estado inválido').min(1);

export const orderStatusCreateSchema = z.object({
  key: orderStatusKeySchema,
  label: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(20),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional()
}).strict();

export const orderStatusPatchSchema = z.object({
  key: orderStatusKeySchema.optional(),
  label: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().min(1).max(20).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
  is_system: z.never().optional()
}).strict();

export const orderCreateSchema = z.object({
  client_id: z.string().min(1),
  estado: orderStatusKeySchema.default('presupuesto_generado'),
  prioridad: z.enum(['baja', 'media', 'alta']).default('media'),
  fecha_programada: z.coerce.date().optional(),
  direccion_service: z.string().optional(),
  contacto_planta: z.string().optional(),
  telefono_contacto_planta: z.string().optional(),
  observaciones: z.string().optional(),
  observaciones_cierre: z.string().optional(),
  tiempo_trabajado_horas: z.coerce.number().min(0).optional(),
  firma_cliente: z.string().optional(),
  foto_trabajo_url: z.string().optional(),
  checklist_cierre: closureChecklistSchema.optional(),
  is_active: z.boolean().optional(),
  technicians: z.array(z.string()).optional().default([])
}).strict();

export const orderPatchSchema = z.object({
  estado: orderStatusKeySchema.optional(),
  prioridad: z.enum(['baja', 'media', 'alta']).optional(),
  fecha_programada: z.coerce.date().transform((d) => d.toISOString()).optional(),
  direccion_service: z.string().optional(),
  contacto_planta: z.string().optional(),
  telefono_contacto_planta: z.string().optional(),
  observaciones: z.string().optional(),
  observaciones_cierre: z.string().optional(),
  tiempo_trabajado_horas: z.coerce.number().min(0).optional(),
  firma_cliente: z.string().optional(),
  foto_trabajo_url: z.string().optional(),
  checklist_cierre: closureChecklistSchema.optional(),
  is_active: z.boolean().optional(),
  comentario: z.string().optional()
}).strict();

export const techniciansUpdateSchema = z.object({
  technicians: z.array(z.string()).default([])
}).strict();

export const invoiceDraftCreateSchema = z.object({
  labor_rate: z.coerce.number().finite().min(0).default(0)
}).strict();

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2),
  limit: z.coerce.number().int().min(1).max(20).default(10)
}).strict();


export const locationEventCreateSchema = z.object({
  event_type: z.enum(['arrival', 'departure']),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
}).strict();

export const materialCreateSchema = materialSchema;
export const materialUpdateSchema = materialSchema.partial().strict();

const documentEntityTypeSchema = z.enum(['order', 'client', 'equipment']);
const documentCategorySchema = z.enum(['contract', 'report', 'photo', 'other']);

export const documentListSchema = z.object({
  entityType: documentEntityTypeSchema,
  entityId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).optional()
}).strict();

export const documentCreateSchema = z.object({
  entity_type: documentEntityTypeSchema,
  entity_id: z.string().min(1),
  file_name: z.string().min(1).max(120),
  file_category: documentCategorySchema.default('other'),
  file_path: z.string().max(500).optional()
}).strict();

export const eventsListSchema = z.object({
  entityType: z.enum(['order', 'client', 'equipment', 'document', 'system']).optional(),
  entityId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).optional(),
  cursor: z.string().min(1).optional()
}).strict();
