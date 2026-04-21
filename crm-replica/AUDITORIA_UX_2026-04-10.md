# Auditoría UX profunda (DCM CRM)

Fecha: 2026-04-10
Enfoque: flujos reales de usuario (admin, técnico, cliente), fallas que rompen uso normal o degradan experiencia.

## Hallazgos clave

1. **Logout forzado en cualquier 403** (admin/tecnico/portal).
2. **Errores silenciosos en Planner y Portal** que vacían pantallas sin feedback.
3. **Drawer de orden traga errores** y muestra datos vacíos como si fueran reales.
4. **Pérdida de cambios no guardados** al cerrar la orden (no detecta cambios en cierre técnico/materiales).
5. **Inconsistencias de permisos/estado** entre UI y backend en acciones operativas.

## Evidencia técnica principal

- Interceptores front que cierran sesión en 401 y 403.
- Páginas con `catch` silencioso y/o sin estados de error.
- Formulario de cierre editable aun en modo no editable.
- Confirmación de cierre que solo vigila comentarios/reasignación.

## Notas

Documento de soporte para priorización de bugs UX antes de producción.
