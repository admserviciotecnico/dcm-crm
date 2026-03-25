# DCM CRM Frontend (Next.js 14)

## Stack
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Zustand
- Axios con interceptor global
- React Hook Form + Zod
- Socket.IO client (singleton)

## Seguridad y acceso
- JWT persistido como `auth_token` (solo token): `localStorage` con "Mantener sesión iniciada" y `sessionStorage` en sesión estándar.
- Rutas privadas protegidas vía layout guard (`app/(private)/layout.tsx` + `Protected`).
- Manejo global 401/403: logout automático + redirección a login.
- Renderizado de acciones críticas con control por rol (botones de transición/admin).

## UX
- Sistema global de toasts.
- Loader global de operaciones críticas.
- Empty states profesionales en tablas/vistas sin datos.
- Confirmaciones modales para:
  - completar orden
  - soft delete de órdenes/clientes/equipos
- Indicador visual para órdenes soft-deleted en panel detalle.

## Realtime
Suscripción a:
- `orders:changed`
- `orders:status_changed`
- `dashboard:refresh`

## Setup
```bash
cd crm-replica/frontend
cp .env.example .env.local
npm install
npm run dev
```

## Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_MAPBOX_TOKEN=
```
