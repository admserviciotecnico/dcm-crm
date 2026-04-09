import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import clientsRoutes from './routes/clients.js';
import equipmentsRoutes from './routes/equipments.js';
import ordersRouter from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import documentsRoutes from './routes/documents.js';
import eventsRoutes from './routes/events.js';
import notificationsRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import portalRoutes from './routes/portal.js';
import automationRulesRoutes from './routes/automation-rules.js';
import invoiceDraftRoutes from './routes/invoice-drafts.js';
import calendarIntegrationsRoutes from './routes/calendar-integrations.js';
import mapRoutes from './routes/map.js';
import techniciansRoutes from './routes/technicians.js';
import orderStatusesRoutes from './routes/order-statuses.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { rateLimit } from './middleware/rate-limit.js';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: env.corsOrigin } });

io.use((socket, next) => {
  const authToken = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : null;
  const headerAuth = typeof socket.handshake.headers.authorization === 'string' ? socket.handshake.headers.authorization : null;
  const headerToken = headerAuth?.startsWith('Bearer ') ? headerAuth.slice(7) : null;
  const token = authToken || headerToken;

  if (!token) {
    next(new Error('Unauthorized'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.kind !== 'user') {
      next(new Error('Unauthorized'));
      return;
    }
    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.emit('connected', { ok: true, ts: Date.now() });
});

app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(sanitizeBody);
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 30 }), authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/equipments', equipmentsRoutes);
app.use('/api/orders', ordersRouter(io));
app.use('/api/documents', documentsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/automation-rules', automationRulesRoutes);
app.use('/api/invoice-drafts', invoiceDraftRoutes);
app.use('/api/calendar-integrations', calendarIntegrationsRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/technicians', techniciansRoutes);
app.use('/api/order-statuses', orderStatusesRoutes());
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`CRM API running on :${env.port}`);
});
