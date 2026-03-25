# DCM CRM Replica (Backend + Frontend)

## Levantar entorno local (paso a paso)

### 1) Backend
```bash
cd crm-replica/backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm test
npm run dev
```
Backend: `http://localhost:4000`

### 2) Frontend
En otra terminal:
```bash
cd crm-replica/frontend
cp .env.example .env.local
npm install
npm run dev
```
Frontend: `http://localhost:3000`

## Script rápido (si usas dos terminales)
Terminal A:
```bash
cd crm-replica/backend && npm run dev
```
Terminal B:
```bash
cd crm-replica/frontend && npm run dev
```

## Docker Compose (opcional, desarrollo)
```bash
docker compose -f crm-replica/docker-compose.dev.yml up --build
```

Servicios:
- Postgres: `localhost:5432`
- Backend: `localhost:4000`
- Frontend: `localhost:3000`

## Seguridad frontend
- JWT en memoria (no localStorage).
- Guard de rutas privadas en App Router layout.
- Interceptor global para 401/403 con logout automático.
- Validación de formularios con RHF + Zod.

## Realtime
- Eventos suscritos: `orders:changed`, `orders:status_changed`, `dashboard:refresh`.
- Socket singleton para evitar conexiones duplicadas.

## Variables de entorno nuevas/relevantes (M18 + M20)

### Backend (`crm-replica/backend/.env`)
```env
# M20 - mapa real (fallback operativo si falta)
MAPBOX_TOKEN=

# M18 - OAuth Google Calendar (si falta, no se puede conectar proveedor)
CALENDAR_GOOGLE_CLIENT_ID=
CALENDAR_GOOGLE_CLIENT_SECRET=
CALENDAR_GOOGLE_REDIRECT_URI=http://localhost:4000/api/calendar-integrations/callback
```

### Frontend (`crm-replica/frontend/.env.local`)
```env
NEXT_PUBLIC_MAPBOX_TOKEN=
```

Notas:
- Si `NEXT_PUBLIC_MAPBOX_TOKEN` no está definido, la UI usa el mapa fallback existente sin romper operaciones.
- Si no hay conexión de calendario OAuth, las órdenes siguen funcionando sin sincronización externa.
