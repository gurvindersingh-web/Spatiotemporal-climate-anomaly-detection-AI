/**
 * OpenWeatherMap API client.
 * Fetches current weather conditions for any lat/lng.
 * Docs: https://openweathermap.org/current
 */

import axios from 'axios';
import { currentCache } from './cache.js';

const BASE_URL = process.env.OWM_BASE_URL || 'https://api.openweathermap.org/data/2.5';
const API_KEY = process.env.OWM_API_KEY || '';

// Map our variable names to OWM response fields
const OWM_FIELD_MAP = {
  'T2M':          (d) => d.main?.temp,
  'T2M_MAX':      (d) => d.main?.temp_max,
  'T2M_MIN':      (d) => d.main?.temp_min,
  'PRECTOTCORR':  (d) => (d.rain?.['1h'] || d.rain?.['3h'] || 0),
  'WS2M':         (d) => d.wind?.speed,
  'RH2M':         (d) => d.main?.humidity,
  'PS':           (d) => d.main?.pressure ? d.main.pressure / 10 : null, // hPa → kPa
};

/**
 * Fetch current weather from OpenWeatherMap.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<object>} Normalized weather data
 */
export async function fetchCurrentWeather(lat, lng) {
  const cacheKey = `owm_${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const cached = currentCache.get(cacheKey);
  if (cached) return cached;

  if (!API_KEY) {
    // Return null if no API key — will fall back to NASA POWER
    return null;
  }

  try {
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        lat,
        lon: lng,
        appid: API_KEY,
        units: 'metric', // Celsius
      },
      timeout: 10000,
    });

    const d = response.data;

    const result = {
      source: 'openweathermap',
      lat,
      lng,
      timestamp: new Date(d.dt * 1000).toISOString(),
      location: d.name || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      values: {
        T2M: d.main?.temp,
        T2M_MAX: d.main?.temp_max,
        T2M_MIN: d.main?.temp_min,
        PRECTOTCORR: d.rain?.['1h'] || d.rain?.['3h'] || 0,
        WS2M: d.wind?.speed,
        RH2M: d.main?.humidity,
        PS: d.main?.pressure ? parseFloat((d.main.pressure / 10).toFixed(2)) : null,
      },
      description: d.weather?.[0]?.description || '',
      icon: d.weather?.[0]?.icon || '',
      clouds: d.clouds?.all,
      visibility: d.visibility,
    };

    // Cache for 10 minutes (OWM recommends max 1 call per 10 min per location)
    currentCache.set(cacheKey, result, 10 * 60 * 1000);

    return result;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn('OpenWeatherMap: Invalid API key');
    }
    return null;
  }
}

/**
 * Get the current value of a specific variable from OWM.
 * @param {number} lat
 * @param {number} lng
 * @param {string} variable
 * @returns {Promise<number|null>}
 */
export async function getCurrentValue(lat, lng, variable = 'T2M') {
  const weather = await fetchCurrentWeather(lat, lng);
  if (!weather) return null;

  return weather.values[variable] ?? null;
}
