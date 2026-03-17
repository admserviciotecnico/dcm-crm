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

export const orderCreateSchema = z.object({
  client_id: z.string().min(1),
  estado: z.enum(['presupuesto_generado','oc_recibida','facturado','pago_recibido','documentacion_enviada','documentacion_aprobada','service_programado','en_ejecucion','completado','cancelado']).default('presupuesto_generado'),
  prioridad: z.enum(['baja', 'media', 'alta']).default('media'),
  fecha_programada: z.coerce.date().optional(),
  direccion_service: z.string().optional(),
  contacto_planta: z.string().optional(),
  telefono_contacto_planta: z.string().optional(),
  observaciones: z.string().optional(),
  observaciones_cierre: z.string().optional(),
  is_active: z.boolean().optional(),
  technicians: z.array(z.string()).optional().default([])
}).strict();

export const orderPatchSchema = z.object({
  estado: z.enum(['presupuesto_generado','oc_recibida','facturado','pago_recibido','documentacion_enviada','documentacion_aprobada','service_programado','en_ejecucion','completado','cancelado']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta']).optional(),
  fecha_programada: z.coerce.date().optional(),
  direccion_service: z.string().optional(),
  contacto_planta: z.string().optional(),
  telefono_contacto_planta: z.string().optional(),
  observaciones: z.string().optional(),
  observaciones_cierre: z.string().optional(),
  is_active: z.boolean().optional(),
  comentario: z.string().optional()
}).strict();

export const techniciansUpdateSchema = z.object({
  technicians: z.array(z.string()).default([])
}).strict();

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
