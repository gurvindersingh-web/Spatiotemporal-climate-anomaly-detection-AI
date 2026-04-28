/**
 * /api/alerts routes
 * Serves alert history and manages Socket.IO alert subscriptions.
 */

import { Router } from 'express';

const router = Router();

// In-memory alert log (most recent first)
const alertLog = [];
const MAX_ALERTS = 500;

/**
 * Add an alert to the log (called internally by scheduler).
 */
export function pushAlert(alert) {
  alertLog.unshift({
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: alert.timestamp || new Date().toISOString(),
  });

  // Trim to max size
  if (alertLog.length > MAX_ALERTS) {
    alertLog.length = MAX_ALERTS;
  }
}

/**
 * GET /api/alerts?severity=&limit=&since=
 * Returns recent alerts, optionally filtered.
 */
router.get('/', (req, res) => {
  const { severity, limit = '50', since } = req.query;
  let filtered = [...alertLog];

  if (severity) {
    filtered = filtered.filter((a) => a.severity === severity);
  }

  if (since) {
    const sinceDate = new Date(since);
    filtered = filtered.filter((a) => new Date(a.timestamp) >= sinceDate);
  }

  const limitNum = Math.min(parseInt(limit, 10), MAX_ALERTS);

  res.json({
    alerts: filtered.slice(0, limitNum),
    total: filtered.length,
    showing: Math.min(limitNum, filtered.length),
  });
});

/**
 * GET /api/alerts/stats
 * Returns alert summary statistics.
 */
router.get('/stats', (req, res) => {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = alertLog.filter((a) => new Date(a.timestamp) >= last24h);

  res.json({
    total_24h: recent.length,
    extreme: recent.filter((a) => a.severity === 'Extreme').length,
    warning: recent.filter((a) => a.severity === 'Warning').length,
    watch: recent.filter((a) => a.severity === 'Watch').length,
    latest: alertLog[0] || null,
  });
});

export default router;
