/**
 * /api/anomalies routes
 * Computes Z-score anomalies for given coordinates and variable.
 */

import { Router } from 'express';
import { detectForPoint, detectForGrid } from '../services/detector.js';

const router = Router();

/**
 * GET /api/anomalies?lat=&lng=&var=
 * Returns anomaly data for a single point.
 */
router.get('/', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const variable = req.query.var || 'T2M';

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required query parameters: lat, lng',
      });
    }

    const result = await detectForPoint(
      parseFloat(lat),
      parseFloat(lng),
      variable
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/anomalies/grid?latMin=&latMax=&lngMin=&lngMax=&var=&step=
 * Returns a grid of anomaly Z-scores for a bounding box.
 */
router.get('/grid', async (req, res, next) => {
  try {
    const {
      latMin = '5', latMax = '40',
      lngMin = '60', lngMax = '100',
      step = '5',
    } = req.query;
    const variable = req.query.var || 'T2M';

    const result = await detectForGrid(
      parseFloat(latMin), parseFloat(latMax),
      parseFloat(lngMin), parseFloat(lngMax),
      parseFloat(step),
      variable
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
