/**
 * Anomaly Detection Engine — Z-score based.
 * Computes Z-scores against 30-year baselines and classifies anomalies.
 */

import { fetchBaseline, fetchRecent } from './nasa.js';
import { getCurrentValue, fetchCurrentWeather } from './openweather.js';

const THRESHOLDS = {
  watch:   parseFloat(process.env.ANOMALY_WATCH   || '1.5'),
  warning: parseFloat(process.env.ANOMALY_WARNING || '2.0'),
  extreme: parseFloat(process.env.ANOMALY_EXTREME || '3.0'),
};

/**
 * Compute mean and standard deviation from an array of numbers.
 * @param {number[]} values
 * @returns {{ mean: number, stdDev: number, count: number }}
 */
export function computeBaseline(values) {
  const filtered = values.filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length === 0) return { mean: 0, stdDev: 1, count: 0 };

  const mean = filtered.reduce((s, v) => s + v, 0) / filtered.length;
  const variance = filtered.reduce((s, v) => s + (v - mean) ** 2, 0) / filtered.length;
  const stdDev = Math.max(Math.sqrt(variance), 0.001); // Prevent div by zero

  return {
    mean: parseFloat(mean.toFixed(4)),
    stdDev: parseFloat(stdDev.toFixed(4)),
    count: filtered.length,
  };
}

/**
 * Compute Z-score: (X - μ) / σ
 * @param {number} currentValue
 * @param {number} mean
 * @param {number} stdDev
 * @returns {number}
 */
export function computeZScore(currentValue, mean, stdDev) {
  if (stdDev === 0 || isNaN(stdDev)) return 0;
  return parseFloat(((currentValue - mean) / stdDev).toFixed(4));
}

/**
 * Classify anomaly based on absolute Z-score.
 * @param {number} zScore
 * @returns {{ isAnomaly: boolean, severity: string, label: string, color: string }}
 */
export function classifyAnomaly(zScore) {
  const absZ = Math.abs(zScore);

  if (absZ >= THRESHOLDS.extreme) {
    return { isAnomaly: true, severity: 'Extreme', label: '🔴 Extreme', color: '#ff4757' };
  }
  if (absZ >= THRESHOLDS.warning) {
    return { isAnomaly: true, severity: 'Warning', label: '🟠 Warning', color: '#ffa502' };
  }
  if (absZ >= THRESHOLDS.watch) {
    return { isAnomaly: true, severity: 'Watch', label: '🟡 Watch', color: '#ffdd57' };
  }
  return { isAnomaly: false, severity: 'Normal', label: '🟢 Normal', color: '#2ed573' };
}

/**
 * Get the current month number (1-12).
 */
function currentMonth() {
  return new Date().getMonth() + 1;
}

/**
 * Full anomaly detection for a single point.
 * Orchestrates: fetch baseline → fetch current → compute Z → classify.
 * @param {number} lat
 * @param {number} lng
 * @param {string} variable
 * @returns {Promise<object>}
 */
export async function detectForPoint(lat, lng, variable = 'T2M') {
  // 1. Fetch 30-year baseline from NASA POWER
  const baseline = await fetchBaseline(lat, lng, variable);

  // 2. Get current value — try OWM first, fall back to NASA recent
  let currentValue = await getCurrentValue(lat, lng, variable);
  let currentSource = 'openweathermap';

  if (currentValue === null || currentValue === undefined) {
    const nasaRecent = await fetchRecent(lat, lng, variable);
    if (nasaRecent) {
      currentValue = nasaRecent.value;
      currentSource = 'nasa_power';
    }
  }

  if (currentValue === null || currentValue === undefined) {
    return {
      lat, lng, variable,
      error: 'Unable to fetch current value from any source',
      baseline: { mean: baseline.mean, stdDev: baseline.stdDev },
    };
  }

  // 3. Use seasonal (monthly) baseline if available for better accuracy
  const month = currentMonth();
  const seasonalMean = baseline.monthlyMeans?.[month] ?? baseline.mean;
  const seasonalStdDev = baseline.monthlyStdDevs?.[month] ?? baseline.stdDev;

  // 4. Compute Z-score
  const zScore = computeZScore(currentValue, seasonalMean, seasonalStdDev);

  // 5. Classify
  const classification = classifyAnomaly(zScore);

  // 6. Also compute against overall baseline (for reference)
  const overallZScore = computeZScore(currentValue, baseline.mean, baseline.stdDev);

  return {
    lat,
    lng,
    variable,
    currentValue: parseFloat(currentValue.toFixed(4)),
    currentSource,
    baseline: {
      mean: baseline.mean,
      stdDev: baseline.stdDev,
      period: baseline.period,
      count: baseline.count,
    },
    seasonal: {
      month,
      mean: parseFloat(seasonalMean.toFixed(4)),
      stdDev: parseFloat(seasonalStdDev.toFixed(4)),
    },
    zScore,
    overallZScore,
    ...classification,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Detect anomalies for a grid of points (bounding box).
 * @param {number} latMin
 * @param {number} latMax
 * @param {number} lngMin
 * @param {number} lngMax
 * @param {number} step - Grid step in degrees
 * @param {string} variable
 * @returns {Promise<object>}
 */
export async function detectForGrid(latMin, latMax, lngMin, lngMax, step = 5, variable = 'T2M') {
  const points = [];

  for (let lat = latMin; lat <= latMax; lat += step) {
    for (let lng = lngMin; lng <= lngMax; lng += step) {
      points.push({ lat: parseFloat(lat.toFixed(2)), lng: parseFloat(lng.toFixed(2)) });
    }
  }

  // Fetch all points in parallel (with concurrency limit)
  const concurrencyLimit = 5;
  const results = [];

  for (let i = 0; i < points.length; i += concurrencyLimit) {
    const batch = points.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.allSettled(
      batch.map((p) => detectForPoint(p.lat, p.lng, variable))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  // Convert to heatmap data format
  const heatmapData = results
    .filter((r) => !r.error)
    .map((r) => ({
      lat: r.lat,
      lng: r.lng,
      intensity: Math.abs(r.zScore),
      zScore: r.zScore,
      currentValue: r.currentValue,
      severity: r.severity,
      color: r.color,
    }));

  const anomalies = results.filter((r) => r.isAnomaly);

  return {
    variable,
    bounds: { latMin, latMax, lngMin, lngMax },
    step,
    totalPoints: results.length,
    anomalyCount: anomalies.length,
    heatmapData,
    anomalies,
    timestamp: new Date().toISOString(),
  };
}
