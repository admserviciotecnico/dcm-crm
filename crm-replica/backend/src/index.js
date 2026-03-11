import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import clientsRoutes from './routes/clients.js';
import equipmentsRoutes from './routes/equipments.js';
import ordersRouter from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import { sanitizeBody } from './middleware/sanitize.js';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: env.corsOrigin } });

io.on('connection', (socket) => {
  socket.emit('connected', { ok: true, ts: Date.now() });
});

app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(sanitizeBody);
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/equipments', equipmentsRoutes);
app.use('/api/orders', ordersRouter(io));
app.use('/api/dashboard', dashboardRoutes);

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`CRM API running on :${env.port}`);
});
