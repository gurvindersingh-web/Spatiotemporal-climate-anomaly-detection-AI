/**
 * NOAA CDO API client.
 * Fetches station data and 30-year climate normals.
 * Docs: https://www.ncdc.noaa.gov/cdo-web/webservices/v2
 *
 * Note: NOAA CDO is primarily US stations.
 * For global coverage, NASA POWER is the primary source.
 * NOAA is used as a cross-validation / supplementary source.
 */

import axios from 'axios';
import { baselineCache } from './cache.js';

const BASE_URL = process.env.NOAA_CDO_BASE_URL || 'https://www.ncdc.noaa.gov/cdo-web/api/v2';
const TOKEN = process.env.NOAA_CDO_TOKEN || '';

// Simple rate limiter: max 5 requests per second
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 200; // 5 req/sec

async function rateLimitedRequest(url, params) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  return axios.get(url, {
    params,
    headers: { token: TOKEN },
    timeout: 15000,
  });
}

/**
 * Find the nearest NOAA station to a given lat/lng.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @returns {Promise<object|null>}
 */
export async function findNearestStation(lat, lng, radiusKm = 100) {
  if (!TOKEN) return null;

  const cacheKey = `noaa_station_${lat.toFixed(1)}_${lng.toFixed(1)}`;
  const cached = baselineCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Build extent (rough approximation: 1° ≈ 111km)
    const delta = radiusKm / 111;
    const extent = `${(lat - delta).toFixed(4)},${(lng - delta).toFixed(4)},${(lat + delta).toFixed(4)},${(lng + delta).toFixed(4)}`;

    const response = await rateLimitedRequest(`${BASE_URL}/stations`, {
      extent,
      datasetid: 'GHCND',
      limit: 5,
      sortfield: 'name',
    });

    const stations = response.data?.results;
    if (!stations || stations.length === 0) return null;

    // Find the closest station by simple Euclidean distance
    let closest = null;
    let minDist = Infinity;

    for (const station of stations) {
      const dist = Math.sqrt(
        (station.latitude - lat) ** 2 + (station.longitude - lng) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        closest = station;
      }
    }

    const result = {
      id: closest.id,
      name: closest.name,
      lat: closest.latitude,
      lng: closest.longitude,
      elevation: closest.elevation,
      distanceKm: parseFloat((minDist * 111).toFixed(1)),
      mindate: closest.mindate,
      maxdate: closest.maxdate,
    };

    baselineCache.set(cacheKey, result, 24 * 60 * 60 * 1000);
    return result;
  } catch (err) {
    console.warn(`NOAA station lookup failed: ${err.message}`);
    return null;
  }
}

/**
 * Fetch 30-year normals from NOAA CDO for a station.
 * Dataset: NORMAL_DLY (1981-2010 normals)
 * @param {string} stationId
 * @param {string} datatypeId - e.g. 'DLY-TAVG-NORMAL'
 * @returns {Promise<object|null>}
 */
export async function fetchNormals(stationId, datatypeId = 'DLY-TAVG-NORMAL') {
  if (!TOKEN) return null;

  const cacheKey = `noaa_normals_${stationId}_${datatypeId}`;
  const cached = baselineCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await rateLimitedRequest(`${BASE_URL}/data`, {
      datasetid: 'NORMAL_DLY',
      stationid: stationId,
      datatypeid: datatypeId,
      startdate: '2010-01-01',
      enddate: '2010-12-31',
      limit: 366,
      units: 'metric',
    });

    const results = response.data?.results;
    if (!results || results.length === 0) return null;

    // Extract values (NOAA normal values are in tenths of degree)
    const values = results.map((r) => ({
      date: r.date,
      value: r.value / 10,  // Convert from tenths
    }));

    const allVals = values.map((v) => v.value);
    const mean = allVals.reduce((s, v) => s + v, 0) / allVals.length;
    const stdDev = Math.sqrt(
      allVals.reduce((s, v) => s + (v - mean) ** 2, 0) / allVals.length
    );

    const result = {
      stationId,
      datatypeId,
      mean: parseFloat(mean.toFixed(4)),
      stdDev: parseFloat(Math.max(stdDev, 0.001).toFixed(4)),
      count: values.length,
      values,
    };

    baselineCache.set(cacheKey, result, 24 * 60 * 60 * 1000);
    return result;
  } catch (err) {
    console.warn(`NOAA normals fetch failed: ${err.message}`);
    return null;
  }
}
