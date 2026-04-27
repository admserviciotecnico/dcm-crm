# Auditoría operativa DCM CRM (DCM Solution SA)

Fecha: 2026-04-10
Alcance: evaluación funcional-operativa del flujo técnico/postventa (admin, técnico, cliente).

## Resumen
- El sistema cubre parcialmente la operación de órdenes de servicio.
- El flujo operativo base (crear → asignar → ejecutar → cerrar) existe, pero faltan piezas clave para sostener todo el ciclo postventa empresarial.
- Riesgos principales: ausencia de módulo de reclamos/tickets, garantías no modeladas, mantenimiento preventivo no estructurado y KPIs con métricas no confiables.

## Riesgos críticos detectados
1. No hay entidad/proceso explícito de ticket/reclamo.
2. No hay gestión de garantía (aceptación/rechazo, cobertura, causal).
3. Preventivo no está modelado como plan recurrente.
4. KPI de cumplimiento SLA devuelve 100 fijo.

## Nota
Documento de diagnóstico para priorizar hardening funcional antes de escalar uso productivo.
