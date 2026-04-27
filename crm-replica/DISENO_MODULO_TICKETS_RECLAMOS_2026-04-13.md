# Diseño módulo Tickets / Claims Intake (DCM CRM)

Fecha: 2026-04-13  
Estado: Diseño funcional (sin implementación)

## Objetivo
Agregar una capa de intake previa a órdenes de servicio para capturar reclamos, hacer triage y diagnóstico remoto, y recién escalar a intervención técnica cuando corresponda.

---

## 1) DATA MODEL

### Entidad principal: `ticket`
Campos propuestos (MVP + escalable):

- `id` (uuid)
- `client_id` (uuid, obligatorio)
- `equipment_id` (uuid, opcional)
- `serial_number` (string, opcional, obligatorio si no hay equipment_id)
- `channel` (enum: `phone | email | web | whatsapp`)
- `issue_description` (text, obligatorio)
- `attachments_count` (int, derivado) + relación a documentos existentes
- `priority` (enum: `baja | media | alta`)
- `category` (string/enum de tipo de falla)
- `status` (enum: `new | triage | in_diagnosis | escalated | resolved | closed`)
- `created_at`
- `updated_at`
- `reported_by_name` (string, opcional)
- `reported_by_contact` (string, opcional)
- `sla_response_deadline` (datetime, opcional)
- `first_response_at` (datetime, opcional)
- `closed_at` (datetime, opcional)

### Entidades de soporte

1. `ticket_event` (timeline/auditoría)
   - `id`, `ticket_id`, `actor_user_id`, `event_type`, `message`, `payload_json`, `created_at`

2. `ticket_diagnosis_note`
   - `id`, `ticket_id`, `author_user_id`, `note`, `outcome` (`pending|needs_visit|resolved_remotely|waiting_client`), `created_at`

3. `ticket_order_link`
   - `id`, `ticket_id`, `order_id`, `relation_type` (`initial_escalation|followup`), `created_at`

> Nota: para minimizar cambios, puede iniciarse con `ticket_id` nullable en `service_order` y ampliar a tabla puente en fase 2.

---

## 2) WORKFLOW (lifecycle)

Estado propuesto y transiciones válidas:

1. `new`
   - Ticket ingresado desde cualquier canal.
   - Transiciones: `triage`, `closed` (si inválido/spam).

2. `triage`
   - Clasificación inicial (categoría, prioridad, equipo/serie, criticidad).
   - Transiciones: `in_diagnosis`, `escalated`, `closed`.

3. `in_diagnosis`
   - Diagnóstico remoto por técnico/soporte.
   - Transiciones: `resolved` (sin visita), `escalated`, `triage` (si faltan datos).

4. `resolved`
   - Resuelto sin intervención en campo.
   - Transiciones: `closed`, `in_diagnosis` (si reaparece).

5. `escalated`
   - Requiere intervención física / orden.
   - Transiciones: `closed` (cuando la orden asociada finaliza y validación cliente), `in_diagnosis` (si se retracta escalación).

6. `closed`
   - Estado final.
   - Transiciones: `triage` (solo vía “reopen” con motivo obligatorio y audit trail).

Reglas clave:
- `closed` y `resolved` requieren motivo de cierre.
- `escalated` requiere vínculo explícito con al menos una orden.
- Toda transición genera `ticket_event`.

---

## 3) RELACIÓN CON ÓRDENES

### Cuándo un ticket se convierte en orden
- Cuando en `triage` o `in_diagnosis` se determina que no alcanza el soporte remoto o se requiere visita.

### Modelo de vínculo
- MVP: `service_order.ticket_id` nullable.
- Evolución: tabla `ticket_order_link` para soportar múltiples órdenes por ticket.

### Datos que fluyen Ticket → Order
- `client_id`
- `equipment_id` (si existe)
- `serial_number` (si no hay equipment_id)
- `issue_description` → `observaciones` iniciales de la orden
- `priority`
- `category` (como etiqueta/campo de clasificación en orden)
- adjuntos referenciados

### Reglas de consistencia
- Crear orden desde ticket debe registrar evento en ambos lados.
- Cierre de orden no cierra ticket automáticamente sin validación de resultado (`resolved` vs `followup`).

---

## 4) UX FLOW POR ROL

### Admin / Coordinación
1. Recibe ticket en bandeja unificada.
2. Completa triage (categoría, prioridad, equipo, severidad).
3. Decide:
   - resolver administrativamente,
   - enviar a diagnóstico remoto,
   - escalar a orden.
4. Monitorea SLA de respuesta y backlog.

### Técnico
1. Toma tickets `in_diagnosis`.
2. Registra acciones remotas (llamada, prueba, instrucción, resultado).
3. Marca:
   - `resolved` (sin visita), o
   - `escalated` (requiere campo).

### Cliente (portal)
1. Crea ticket (canal web) o visualiza ticket cargado por operador.
2. Ve estado y últimos eventos legibles.
3. Si se escala, ve vínculo a orden de servicio.

Mensajes UX críticos:
- Diferenciar “ticket recibido” vs “orden creada”.
- Mostrar ETA/respuesta esperada en intake.

---

## 5) EDGE CASES

1. **Tickets duplicados**
   - Detección por: cliente + equipo/serie + ventana temporal + similitud descripción.
   - Acción: sugerir merge/manual link, no bloquear ciegamente.

2. **Tickets no resueltos**
   - Aging y alertas por SLA de primera respuesta y tiempo en estado.

3. **Múltiples órdenes por ticket**
   - Permitido para casos complejos/reincidentes (tabla puente o historial de links).

4. **Ticket reabierto**
   - Reapertura solo con motivo; incrementa contador `reopen_count`; vuelve a `triage`.

5. **Escalación errónea**
   - Permitir volver de `escalated` a `in_diagnosis` con evento auditado.

---

## 6) ESTRATEGIA DE MIGRACIÓN (sin romper sistema actual)

### Principios
- Compatibilidad hacia atrás total.
- Órdenes existentes siguen válidas sin `ticket_id`.
- Feature flag para habilitación gradual del intake.

### Plan incremental

**Fase A (DB compatible)**
- Crear tablas `ticket`, `ticket_event`, `ticket_diagnosis_note`.
- Agregar `ticket_id` nullable en `service_order` (sin cambiar flujos existentes).

**Fase B (API no disruptiva)**
- Nuevos endpoints `/tickets`.
- Endpoint “escalar a orden” que reutiliza lógica de creación actual.

**Fase C (UX gradual)**
- Admin: nueva bandeja de tickets.
- Técnico: cola de diagnóstico remoto.
- Portal: vista de tickets básica.

**Fase D (adopción)**
- Medir % órdenes creadas desde ticket.
- Cuando >80%, promover intake como camino por defecto.

---

## 7) MVP (mínima versión de valor)

### Alcance MVP recomendado (4 semanas)

1. Entidad `ticket` + `ticket_event`.
2. Estados mínimos:
   - `new`, `triage`, `in_diagnosis`, `escalated`, `resolved`, `closed`.
3. Admin UI de bandeja + detalle de ticket.
4. Acción “Escalar a orden” reutilizando `OrdersApi.create`.
5. `service_order.ticket_id` nullable + enlace visual ticket ↔ orden.
6. Portal cliente: lectura de estado del ticket (sin autoservicio avanzado).

### Fuera de MVP (fase 2)
- Deduplicación semántica avanzada.
- Múltiples órdenes por ticket con analítica de reincidencia.
- Catálogo avanzado de categorías/causa raíz.
- Automatizaciones SLA complejas multicanal.

---

## Criterios de éxito operativos
- 100% de nuevos reclamos ingresan como ticket.
- Triage en < X horas (SLA).
- Trazabilidad completa ticket → diagnóstico → orden (si aplica) → cierre.
- Reducción de órdenes “mal creadas” o sin contexto.

