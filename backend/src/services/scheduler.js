/**
 * Scheduler — Multi-tier cron-based data refresh and alert system.
 * Uses node-cron for scheduling periodic tasks.
 */

import cron from 'node-cron';
import { detectForPoint } from './detector.js';
import { fetchCurrentWeather } from './openweather.js';
import { pushAlert } from '../routes/alerts.js';

// Track last update times for staleness watchdog
const lastUpdateTimes = new Map();

/**
 * Parse monitored cities from env.
 * @returns {Array<{name: string, lat: number, lng: number}>}
 */
function getMonitoredCities() {
  try {
    return JSON.parse(process.env.MONITORED_CITIES || '[]');
  } catch {
    return [
      { name: 'Delhi', lat: 28.6, lng: 77.2 },
      { name: 'Tokyo', lat: 35.7, lng: 139.7 },
      { name: 'Phoenix', lat: 33.4, lng: -112.1 },
      { name: 'Cairo', lat: 30.0, lng: 31.2 },
      { name: 'São Paulo', lat: -23.5, lng: -46.6 },
      { name: 'London', lat: 51.5, lng: -0.1 },
      { name: 'Sydney', lat: -33.9, lng: 151.2 },
      { name: 'Nairobi', lat: -1.3, lng: 36.8 },
    ];
  }
}

/**
 * High-frequency task: Check monitored cities for anomalies.
 * Runs every 10 minutes.
 */
async function highFrequencyCheck(io) {
  const cities = getMonitoredCities();
  const variables = ['T2M', 'PRECTOTCORR', 'WS2M'];

  console.log(`[SCHEDULER] High-frequency check: ${cities.length} cities × ${variables.length} variables`);

  for (const city of cities) {
    for (const variable of variables) {
      try {
        const result = await detectForPoint(city.lat, city.lng, variable);

        if (result.isAnomaly) {
          const alert = {
            lat: city.lat,
            lng: city.lng,
            city: city.name,
            variable,
            zScore: result.zScore,
            currentValue: result.currentValue,
            severity: result.severity,
            color: result.color,
            label: result.label,
            baseline: result.baseline,
            description: `${result.severity} anomaly detected in ${city.name}: ${variable} = ${result.currentValue} (Z = ${result.zScore})`,
          };

          // Push to alert log
          pushAlert(alert);

          // Emit via Socket.IO
          io.to('alerts').emit('alert', alert);
          io.emit('alert', alert); // Also emit to all connected clients

          console.log(`[ALERT] ${alert.description}`);
        }

        lastUpdateTimes.set(`${city.name}_${variable}`, Date.now());
      } catch (err) {
        console.warn(`[SCHEDULER] Failed to check ${city.name}/${variable}: ${err.message}`);
      }
    }
  }

  lastUpdateTimes.set('high_freq', Date.now());
}

/**
 * Medium-frequency task: Refresh weather data for all monitored cities.
 * Runs every 6 hours.
 */
async function mediumFrequencyRefresh() {
  const cities = getMonitoredCities();
  console.log(`[SCHEDULER] Medium-frequency refresh: ${cities.length} cities`);

  for (const city of cities) {
    try {
      await fetchCurrentWeather(city.lat, city.lng);
    } catch (err) {
      console.warn(`[SCHEDULER] Failed to refresh weather for ${city.name}: ${err.message}`);
    }
  }

  lastUpdateTimes.set('medium_freq', Date.now());
}

/**
 * Staleness watchdog: Check if data sources are up to date.
 * Runs every 10 minutes.
 */
function stalenessWatchdog() {
  const maxStaleMinutes = 30;
  const now = Date.now();

  for (const [key, lastUpdate] of lastUpdateTimes) {
    const staleMinutes = (now - lastUpdate) / (1000 * 60);
    if (staleMinutes > maxStaleMinutes) {
      console.warn(`[WATCHDOG] Data source "${key}" is stale (${staleMinutes.toFixed(0)} minutes since last update)`);
    }
  }
}

/**
 * Initialize all scheduled tasks.
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
export function initScheduler(io) {
  const cronHighFreq = process.env.CRON_HIGH_FREQ || '*/10 * * * *';
  const cronMediumFreq = process.env.CRON_MEDIUM_FREQ || '0 */6 * * *';

  // High-frequency: every 10 minutes
  cron.schedule(cronHighFreq, () => {
    highFrequencyCheck(io).catch((err) => {
      console.error(`[SCHEDULER] High-frequency check failed: ${err.message}`);
    });
  });

  // Medium-frequency: every 6 hours
  cron.schedule(cronMediumFreq, () => {
    mediumFrequencyRefresh().catch((err) => {
      console.error(`[SCHEDULER] Medium-frequency refresh failed: ${err.message}`);
    });
  });

  // Staleness watchdog: every 10 minutes
  cron.schedule('*/10 * * * *', stalenessWatchdog);

  console.log('[SCHEDULER] Cron jobs initialized:');
  console.log(`  High-frequency (anomaly check): ${cronHighFreq}`);
  console.log(`  Medium-frequency (data refresh): ${cronMediumFreq}`);
  console.log(`  Staleness watchdog: */10 * * * *`);

  // Run initial check after 5 seconds (let server fully start)
  setTimeout(() => {
    console.log('[SCHEDULER] Running initial anomaly check...');
    highFrequencyCheck(io).catch((err) => {
      console.error(`[SCHEDULER] Initial check failed: ${err.message}`);
    });
  }, 5000);
}
