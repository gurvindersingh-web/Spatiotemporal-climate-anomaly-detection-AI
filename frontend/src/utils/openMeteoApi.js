/**
 * Open-Meteo API utilities for global anomaly detection.
 *
 * Uses:
 *   - Geocoding API for city search
 *   - Forecast API for current weather
 *   - Archive API for historical normals (same period across past 5 years)
 *
 * Z-score anomaly detection: z = (current - μ) / σ
 */

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

/** Climate variables we track. */
export const CLIMATE_VARIABLES = [
  { key: 'temperature_2m_max', label: 'Max Temperature', unit: '°C', icon: '🌡️', color: '#EF4444' },
  { key: 'temperature_2m_min', label: 'Min Temperature', unit: '°C', icon: '❄️', color: '#3B82F6' },
  { key: 'precipitation_sum', label: 'Precipitation', unit: 'mm', icon: '🌧️', color: '#06B6D4' },
  { key: 'windspeed_10m_max', label: 'Max Wind Speed', unit: 'km/h', icon: '💨', color: '#8B5CF6' },
];

// ─── Geocoding ──────────────────────────────────────────────

/**
 * Search for cities globally via Open-Meteo Geocoding API.
 * @param {string} query — city/place name
 * @param {number} count — max results
 * @returns {Promise<Array>} array of location results
 */
export async function searchCities(query, count = 8) {
  if (!query || query.trim().length < 2) return [];
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query.trim())}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

// ─── Current Weather ────────────────────────────────────────

/**
 * Fetch current/recent weather for a location.
 * @returns daily data for the past 7 days + today
 */
export async function fetchCurrentWeather(lat, lon) {
  const dailyVars = CLIMATE_VARIABLES.map((v) => v.key).join(',');
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&daily=${dailyVars}&timezone=auto&past_days=7&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast API failed: ${res.status}`);
  return res.json();
}

// ─── Historical Normals ─────────────────────────────────────

/**
 * Fetch the same 2-week window across the past N years from the archive API
 * to compute historical mean and standard deviation.
 */
export async function fetchHistoricalNormals(lat, lon, yearsBack = 5) {
  const now = new Date();
  const dayOfYear = getDayOfYear(now);

  // Build a 14-day window centered on today's day-of-year
  const windowStart = dayOfYear - 7;
  const windowEnd = dayOfYear + 7;

  const currentYear = now.getFullYear();
  const dailyVars = CLIMATE_VARIABLES.map((v) => v.key).join(',');

  // Fetch archive data for each past year
  const yearPromises = [];
  for (let y = currentYear - yearsBack; y < currentYear; y++) {
    const startDate = dayOfYearToDate(y, Math.max(1, windowStart));
    const endDate = dayOfYearToDate(y, Math.min(365, windowEnd));
    const url = `${ARCHIVE_URL}?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=${dailyVars}&timezone=auto`;
    yearPromises.push(
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );
  }

  const results = await Promise.all(yearPromises);
  return results.filter(Boolean);
}

// ─── Z-Score Computation ────────────────────────────────────

/**
 * Compute z-scores for each climate variable by comparing current values
 * against historical normals.
 *
 * @param {Object} currentData — result from fetchCurrentWeather
 * @param {Array}  historicalData — array of results from fetchHistoricalNormals
 * @returns {Array<Object>} — per-variable analysis results
 */
export function computeZScores(currentData, historicalData) {
  const daily = currentData.daily;
  if (!daily) return [];

  return CLIMATE_VARIABLES.map((variable) => {
    const currentValues = daily[variable.key];
    // Use the most recent day's value (last in the array)
    const currentValue = currentValues ? currentValues[currentValues.length - 1] : null;

    // Collect all historical values for this variable across all years
    const historicalValues = [];
    for (const yearData of historicalData) {
      if (yearData?.daily?.[variable.key]) {
        historicalValues.push(...yearData.daily[variable.key].filter((v) => v !== null));
      }
    }

    if (currentValue === null || historicalValues.length < 3) {
      return {
        ...variable,
        currentValue: currentValue ?? 'N/A',
        historicalMean: null,
        historicalStd: null,
        zScore: null,
        severity: 'unknown',
        deviation: null,
      };
    }

    const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const variance =
      historicalValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / historicalValues.length;
    const std = Math.sqrt(variance);

    const zScore = std > 0.01 ? (currentValue - mean) / std : 0;

    return {
      ...variable,
      currentValue: roundTo(currentValue, 1),
      historicalMean: roundTo(mean, 1),
      historicalStd: roundTo(std, 2),
      zScore: roundTo(zScore, 2),
      severity: classifySeverity(Math.abs(zScore)),
      deviation: roundTo(currentValue - mean, 1),
      recentTrend: currentValues
        ? currentValues.slice(-7).map((v) => (v !== null ? roundTo(v, 1) : null))
        : [],
    };
  });
}

// ─── Severity Classification ────────────────────────────────

/**
 * Classify anomaly severity based on absolute z-score.
 */
export function classifySeverity(absZ) {
  if (absZ >= 3.0) return 'extreme';
  if (absZ >= 2.0) return 'severe';
  if (absZ >= 1.5) return 'moderate';
  if (absZ >= 1.0) return 'mild';
  return 'normal';
}

export function getSeverityConfig(severity) {
  const configs = {
    extreme: {
      label: 'EXTREME',
      color: '#DC2626',
      bgColor: 'rgba(220, 38, 38, 0.12)',
      borderColor: 'rgba(220, 38, 38, 0.35)',
      gradient: 'linear-gradient(135deg, #DC2626, #EF4444)',
      emoji: '🔴',
      tw: 'text-red-500',
      twBg: 'bg-red-500/10',
      twBorder: 'border-red-500/30',
    },
    severe: {
      label: 'SEVERE',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
      emoji: '🟠',
      tw: 'text-amber-500',
      twBg: 'bg-amber-500/10',
      twBorder: 'border-amber-500/30',
    },
    moderate: {
      label: 'MODERATE',
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.12)',
      borderColor: 'rgba(139, 92, 246, 0.35)',
      gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
      emoji: '🟡',
      tw: 'text-violet-400',
      twBg: 'bg-violet-500/10',
      twBorder: 'border-violet-500/30',
    },
    mild: {
      label: 'MILD',
      color: '#06B6D4',
      bgColor: 'rgba(6, 182, 212, 0.12)',
      borderColor: 'rgba(6, 182, 212, 0.35)',
      gradient: 'linear-gradient(135deg, #06B6D4, #22D3EE)',
      emoji: '🔵',
      tw: 'text-cyan-400',
      twBg: 'bg-cyan-500/10',
      twBorder: 'border-cyan-500/30',
    },
    normal: {
      label: 'NORMAL',
      color: '#22C55E',
      bgColor: 'rgba(34, 197, 94, 0.12)',
      borderColor: 'rgba(34, 197, 94, 0.35)',
      gradient: 'linear-gradient(135deg, #22C55E, #4ADE80)',
      emoji: '🟢',
      tw: 'text-emerald-400',
      twBg: 'bg-emerald-500/10',
      twBorder: 'border-emerald-500/30',
    },
    unknown: {
      label: 'N/A',
      color: '#6B7280',
      bgColor: 'rgba(107, 114, 128, 0.12)',
      borderColor: 'rgba(107, 114, 128, 0.35)',
      gradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)',
      emoji: '⚪',
      tw: 'text-gray-400',
      twBg: 'bg-gray-500/10',
      twBorder: 'border-gray-500/30',
    },
  };
  return configs[severity] || configs.unknown;
}

/**
 * Determine overall anomaly status for a location.
 */
export function getOverallStatus(analyses) {
  if (!analyses || analyses.length === 0) return 'unknown';
  const validAnalyses = analyses.filter((a) => a.zScore !== null);
  if (validAnalyses.length === 0) return 'unknown';
  const maxAbsZ = Math.max(...validAnalyses.map((a) => Math.abs(a.zScore)));
  return classifySeverity(maxAbsZ);
}

// ─── Helpers ────────────────────────────────────────────────

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function dayOfYearToDate(year, dayOfYear) {
  const d = new Date(year, 0);
  d.setDate(dayOfYear);
  return d.toISOString().split('T')[0];
}

function roundTo(val, decimals) {
  if (val === null || val === undefined) return null;
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}
