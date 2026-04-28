/**
 * /api/timeseries routes
 * Returns historical climate timeseries from NASA POWER.
 */

import { Router } from 'express';
import { fetchTimeseries } from '../services/nasa.js';

const router = Router();

/**
 * GET /api/timeseries?lat=&lng=&var=&years=30
 * Returns historical timeseries data for a point.
 */
router.get('/', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const variable = req.query.var || 'T2M';
    const years = parseInt(req.query.years || '30', 10);

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required query parameters: lat, lng',
      });
    }

    const result = await fetchTimeseries(
      parseFloat(lat),
      parseFloat(lng),
      variable,
      years
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
