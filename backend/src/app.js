/**
 * SCAD Backend — Express + Socket.IO Server
 * Spatiotemporal Climate Anomaly Detector
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import { createLogger, format, transports } from 'winston';

import anomaliesRouter from './routes/anomalies.js';
import timeseriesRouter from './routes/timeseries.js';
import alertsRouter from './routes/alerts.js';
import { initScheduler } from './services/scheduler.js';

// ─── Winston Logger ───────────────────────────────────────────────
export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) =>
      `${timestamp} [${level.toUpperCase()}] ${stack || message}`
    )
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

// ─── Express App ──────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to routes
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SCAD Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/anomalies', anomaliesRouter);
app.use('/api/timeseries', timeseriesRouter);
app.use('/api/alerts', alertsRouter);

// ─── Socket.IO Connection Handler ────────────────────────────────
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe', (data) => {
    logger.debug(`Client ${socket.id} subscribed to alerts`, data);
    socket.join('alerts');
  });

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id} (${reason})`);
  });
});

// ─── Error Handler ───────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ─── Start Server ────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);

httpServer.listen(PORT, () => {
  logger.info(`═══════════════════════════════════════════════════`);
  logger.info(`  SCAD Backend running on http://localhost:${PORT}`);
  logger.info(`  Socket.IO ready for connections`);
  logger.info(`═══════════════════════════════════════════════════`);

  // Initialize cron scheduler
  initScheduler(io);
});

export { app, io };
