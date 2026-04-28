/**
 * NASA POWER API client.
 * Fetches global meteorological data on a 0.5° grid from 1981 to near-real-time.
 * Docs: https://power.larc.nasa.gov/docs/services/api/
 */

import axios from 'axios';
import { baselineCache, timeseriesCache } from './cache.js';

const BASE_URL = process.env.NASA_POWER_BASE_URL
  || 'https://power.larc.nasa.gov/api/temporal/daily/point';

// NASA POWER parameter mapping
const VARIABLE_MAP = {
  'T2M':       'T2M',          // Temperature at 2m (°C)
  'T2M_MAX':   'T2M_MAX',      // Max daily temp
  'T2M_MIN':   'T2M_MIN',      // Min daily temp
  'PRECTOTCORR': 'PRECTOTCORR', // Precipitation (mm/day)
  'WS2M':      'WS2M',         // Wind speed at 2m (m/s)
  'RH2M':      'RH2M',         // Relative humidity at 2m (%)
  'PS':        'PS',           // Surface pressure (kPa)
  'ALLSKY_SFC_SW_DWN': 'ALLSKY_SFC_SW_DWN', // Solar radiation
};

/**
 * Fetch 30-year baseline data from NASA POWER and compute mean/stdDev.
 * @param {number} lat
 * @param {number} lng
 * @param {string} variable - e.g. 'T2M', 'PRECTOTCORR'
 * @param {number} startYear - default 1991
 * @param {number} endYear - default 2020
 * @returns {Promise<{mean: number, stdDev: number, count: number, monthlyMeans: object}>}
 */
export async function fetchBaseline(lat, lng, variable = 'T2M', startYear = 1991, endYear = 2020) {
  const cacheKey = `baseline_${lat}_${lng}_${variable}_${startYear}_${endYear}`;
  const cached = baselineCache.get(cacheKey);
  if (cached) return cached;

  const param = VARIABLE_MAP[variable] || variable;

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        parameters: param,
        community: 'RE',
        longitude: lng,
        latitude: lat,
        start: `${startYear}0101`,
        end: `${endYear}1231`,
        format: 'JSON',
      },
      timeout: 30000,
    });

    const data = response.data;
    const paramData = data.properties?.parameter?.[param];

    if (!paramData) {
      throw new Error(`No data returned for ${param} at (${lat}, ${lng})`);
    }

    // Extract daily values, filter out fill values (-999)
    const dailyValues = Object.values(paramData).filter(v => v !== -999 && v !== -99 && !isNaN(v));

    if (dailyValues.length === 0) {
      throw new Error(`All fill values for ${param} at (${lat}, ${lng})`);
    }

    // Compute statistics
    const mean = dailyValues.reduce((sum, v) => sum + v, 0) / dailyValues.length;
    const variance = dailyValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / dailyValues.length;
    const stdDev = Math.sqrt(variance);

    // Compute monthly means for seasonal context
    const monthlyBuckets = {};
    Object.entries(paramData).forEach(([dateStr, value]) => {
      if (value === -999 || value === -99 || isNaN(value)) return;
      const month = parseInt(dateStr.substring(4, 6), 10);
      if (!monthlyBuckets[month]) monthlyBuckets[month] = [];
      monthlyBuckets[month].push(value);
    });

    const monthlyMeans = {};
    const monthlyStdDevs = {};
    for (const [month, values] of Object.entries(monthlyBuckets)) {
      const m = values.reduce((s, v) => s + v, 0) / values.length;
      monthlyMeans[month] = parseFloat(m.toFixed(4));
      const v = values.reduce((s, val) => s + (val - m) ** 2, 0) / values.length;
      monthlyStdDevs[month] = parseFloat(Math.sqrt(v).toFixed(4));
    }

    const result = {
      mean: parseFloat(mean.toFixed(4)),
      stdDev: parseFloat(Math.max(stdDev, 0.001).toFixed(4)),  // Prevent division by zero
      count: dailyValues.length,
      min: parseFloat(Math.min(...dailyValues).toFixed(4)),
      max: parseFloat(Math.max(...dailyValues).toFixed(4)),
      monthlyMeans,
      monthlyStdDevs,
      variable: param,
      lat,
      lng,
      period: `${startYear}-${endYear}`,
    };

    // Cache for 24 hours (baselines don't change often)
    baselineCache.set(cacheKey, result, 24 * 60 * 60 * 1000);

    return result;
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error('NASA POWER rate limit exceeded. Please try again later.');
    }
    throw new Error(`NASA POWER API error: ${err.message}`);
  }
}

/**
 * Fetch recent data from NASA POWER (last 7 days).
 * Used as a fallback current value source.
 * @param {number} lat
 * @param {number} lng
 * @param {string} variable
 * @returns {Promise<{value: number, date: string}>}
 */
export async function fetchRecent(lat, lng, variable = 'T2M') {
  const param = VARIABLE_MAP[variable] || variable;

  // NASA POWER data has ~2-3 day lag, so fetch last 10 days
  const endDate = new Date();
  const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        parameters: param,
        community: 'RE',
        longitude: lng,
        latitude: lat,
        start: fmt(startDate),
        end: fmt(endDate),
        format: 'JSON',
      },
      timeout: 15000,
    });

    const paramData = response.data.properties?.parameter?.[param];
    if (!paramData) return null;

    // Get the most recent valid value
    const entries = Object.entries(paramData)
      .filter(([, v]) => v !== -999 && v !== -99 && !isNaN(v))
      .sort(([a], [b]) => b.localeCompare(a));  // Most recent first

    if (entries.length === 0) return null;

    return {
      value: entries[0][1],
      date: entries[0][0],
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a historical timeseries from NASA POWER.
 * Returns annual or monthly aggregated values.
 * @param {number} lat
 * @param {number} lng
 * @param {string} variable
 * @param {number} years - Number of years to fetch
 * @returns {Promise<object>}
 */
export async function fetchTimeseries(lat, lng, variable = 'T2M', years = 30) {
  const cacheKey = `ts_${lat}_${lng}_${variable}_${years}`;
  const cached = timeseriesCache.get(cacheKey);
  if (cached) return cached;

  const param = VARIABLE_MAP[variable] || variable;
  const endYear = new Date().getFullYear() - 1; // Last complete year
  const startYear = endYear - years + 1;

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        parameters: param,
        community: 'RE',
        longitude: lng,
        latitude: lat,
        start: `${startYear}0101`,
        end: `${endYear}1231`,
        format: 'JSON',
      },
      timeout: 60000,
    });

    const paramData = response.data.properties?.parameter?.[param];
    if (!paramData) {
      throw new Error(`No timeseries data for ${param} at (${lat}, ${lng})`);
    }

    // Aggregate by year
    const yearlyBuckets = {};
    Object.entries(paramData).forEach(([dateStr, value]) => {
      if (value === -999 || value === -99 || isNaN(value)) return;
      const year = dateStr.substring(0, 4);
      if (!yearlyBuckets[year]) yearlyBuckets[year] = [];
      yearlyBuckets[year].push(value);
    });

    const annualData = Object.entries(yearlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, values]) => ({
        year: parseInt(year, 10),
        mean: parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(4)),
        min: parseFloat(Math.min(...values).toFixed(4)),
        max: parseFloat(Math.max(...values).toFixed(4)),
        count: values.length,
      }));

    // Also build monthly data for the most recent 5 years
    const recentStart = endYear - 4;
    const monthlyBuckets = {};
    Object.entries(paramData).forEach(([dateStr, value]) => {
      if (value === -999 || value === -99 || isNaN(value)) return;
      const yr = parseInt(dateStr.substring(0, 4), 10);
      if (yr < recentStart) return;
      const key = dateStr.substring(0, 6); // YYYYMM
      if (!monthlyBuckets[key]) monthlyBuckets[key] = [];
      monthlyBuckets[key].push(value);
    });

    const monthlyData = Object.entries(monthlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => ({
        date: `${key.substring(0, 4)}-${key.substring(4, 6)}`,
        mean: parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(4)),
        min: parseFloat(Math.min(...values).toFixed(4)),
        max: parseFloat(Math.max(...values).toFixed(4)),
      }));

    const result = {
      variable: param,
      lat,
      lng,
      period: `${startYear}-${endYear}`,
      annualData,
      monthlyData,
      totalYears: annualData.length,
    };

    // Cache for 6 hours
    timeseriesCache.set(cacheKey, result, 6 * 60 * 60 * 1000);

    return result;
  } catch (err) {
    throw new Error(`NASA POWER timeseries error: ${err.message}`);
  }
}

export const VARIABLES = Object.keys(VARIABLE_MAP);
