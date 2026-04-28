/**
 * Synthetic demo data that mirrors the FastAPI backend responses.
 * Used for standalone frontend preview when backend is not running.
 */

// Seed-based pseudo-random for deterministic output
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateDemoGeoJSON() {
  const rng = seededRandom(42);
  const features = [];

  // South Asia grid (~5-40°N, 60-100°E)
  const anomalyZones = [
    // Northwest India heatwave cluster
    { latRange: [25, 32], lonRange: [68, 78], intensity: [0.75, 0.98], count: 35 },
    // Bangladesh coastal
    { latRange: [20, 24], lonRange: [88, 92], intensity: [0.7, 0.92], count: 18 },
    // Central India
    { latRange: [18, 23], lonRange: [76, 82], intensity: [0.65, 0.85], count: 12 },
    // Arabian Sea SST
    { latRange: [10, 18], lonRange: [62, 72], intensity: [0.7, 0.88], count: 10 },
    // Bay of Bengal
    { latRange: [12, 18], lonRange: [82, 90], intensity: [0.68, 0.82], count: 8 },
  ];

  let idx = 0;
  anomalyZones.forEach(zone => {
    for (let n = 0; n < zone.count; n++) {
      const lat = zone.latRange[0] + rng() * (zone.latRange[1] - zone.latRange[0]);
      const lon = zone.lonRange[0] + rng() * (zone.lonRange[1] - zone.lonRange[0]);
      const score = zone.intensity[0] + rng() * (zone.intensity[1] - zone.intensity[0]);
      const res = 0.25;

      let classification = 'watch';
      if (score >= 0.9) classification = 'extreme';
      else if (score >= 0.8) classification = 'warning';

      const i = Math.floor((40 - lat) / res);
      const j = Math.floor((lon - 60) / res);

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lon - res / 2, lat - res / 2],
            [lon + res / 2, lat - res / 2],
            [lon + res / 2, lat + res / 2],
            [lon - res / 2, lat + res / 2],
            [lon - res / 2, lat - res / 2],
          ]],
        },
        properties: {
          region_id: `grid_${i}_${j}`,
          anomaly_score: parseFloat(score.toFixed(4)),
          zscore: parseFloat((score * 5).toFixed(2)),
          classification,
          lat: parseFloat(lat.toFixed(4)),
          lon: parseFloat(lon.toFixed(4)),
          grid_i: i,
          grid_j: j,
        },
      });
      idx++;
    }
  });

  const extreme = features.filter(f => f.properties.classification === 'extreme').length;
  const warning = features.filter(f => f.properties.classification === 'warning').length;
  const watch = features.filter(f => f.properties.classification === 'watch').length;

  return {
    type: 'FeatureCollection',
    meta: {
      total_anomalies: features.length,
      extreme,
      warning,
      watch,
      threshold: 0.7,
      grid_resolution: 0.25,
      timestep_index: 363,
      cached: false,
      response_time_ms: 142.3,
    },
    features,
  };
}

function generateDemoExplanation(regionId) {
  const rng = seededRandom(regionId.split('').reduce((a, c) => a + c.charCodeAt(0), 0));

  const temp = 0.15 + rng() * 0.55;
  const precip = 0.05 + rng() * 0.3;
  const wind = 0.05 + rng() * 0.2;
  const sst = 1 - temp - precip - wind;
  const total = temp + precip + wind + Math.max(0, sst);

  const importances = {
    temperature_anomaly: parseFloat((temp / total).toFixed(4)),
    precipitation_anomaly: parseFloat((precip / total).toFixed(4)),
    wind_anomaly: parseFloat((wind / total).toFixed(4)),
    sst_departure: parseFloat((Math.max(0, sst) / total).toFixed(4)),
  };

  const dominant = Object.entries(importances).sort((a, b) => b[1] - a[1])[0];

  return {
    region_id: regionId,
    lat: 28.5 + rng() * 3,
    lon: 72.0 + rng() * 5,
    anomaly_score: 0.75 + rng() * 0.2,
    explanation: {
      feature_importances: importances,
      raw_feature_values: {
        temperature_anomaly: parseFloat((2.5 + rng() * 4).toFixed(4)),
        precipitation_anomaly: parseFloat((1.0 + rng() * 3).toFixed(4)),
        wind_anomaly: parseFloat((0.5 + rng() * 2).toFixed(4)),
        sst_departure: parseFloat((0.2 + rng() * 1.5).toFixed(4)),
      },
      dominant_driver: dominant[0],
      dominant_contribution: dominant[1],
    },
    narrative: `Anomaly in ${regionId} driven primarily by a ${(2.5 + rng() * 3).toFixed(1)}-sigma temperature departure, consistent with a blocking high-pressure system. Secondary contribution from precipitation anomaly (${(precip / total * 100).toFixed(0)}%).`,
  };
}

function generateDemoForecast(regionId, horizon = 24) {
  const rng = seededRandom(regionId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + 100);
  const baseScore = 0.65 + rng() * 0.25;
  const trend = rng() > 0.5 ? 0.003 : -0.002;
  const predictions = [];
  const now = new Date();

  for (let i = 0; i < horizon; i++) {
    const t = new Date(now.getTime() + (i + 1) * 6 * 3600000);
    const noise = (rng() - 0.5) * 0.04;
    const predicted = Math.max(0, Math.min(1, baseScore + trend * i + noise));
    const std = 0.06 + rng() * 0.04;

    predictions.push({
      timestamp: t.toISOString(),
      predicted_score: parseFloat(predicted.toFixed(4)),
      ci_lower: parseFloat(Math.max(0, predicted - 1.645 * std).toFixed(4)),
      ci_upper: parseFloat(Math.min(1, predicted + 1.645 * std).toFixed(4)),
    });
  }

  const trendLabel = predictions[predictions.length - 1].predicted_score > predictions[0].predicted_score + 0.05
    ? 'increasing' : predictions[predictions.length - 1].predicted_score < predictions[0].predicted_score - 0.05
      ? 'decreasing' : 'stable';

  return {
    region_id: regionId,
    horizon,
    method: 'conformal_prediction',
    confidence_level: 0.9,
    predictions,
    trend: trendLabel,
  };
}

function generateDemoAlerts() {
  const geojson = generateDemoGeoJSON();
  const alerts = geojson.features
    .filter(f => f.properties.anomaly_score >= 0.7)
    .map(f => ({
      region_id: f.properties.region_id,
      classification: f.properties.classification,
      anomaly_score: f.properties.anomaly_score,
      lat: f.properties.lat,
      lon: f.properties.lon,
      message: `[${f.properties.classification.toUpperCase()}] Anomaly at (${f.properties.lat.toFixed(2)}°N, ${f.properties.lon.toFixed(2)}°E) — score: ${f.properties.anomaly_score.toFixed(3)}`,
    }))
    .sort((a, b) => b.anomaly_score - a.anomaly_score);

  return {
    total: alerts.length,
    showing: Math.min(50, alerts.length),
    min_level: 'watch',
    alerts: alerts.slice(0, 50),
  };
}

function generateDemoGridData(variable = 'T2M') {
  const geojson = generateDemoGeoJSON();

  const severityMap = {
    watch: 'Watch',
    warning: 'Warning',
    extreme: 'Extreme',
  };

  const colorMap = {
    Watch: '#ffdd57',
    Warning: '#ffa502',
    Extreme: '#ff4757',
    Normal: '#2ed573',
  };

  const heatmapData = geojson.features.map((feature) => {
    const classification = severityMap[feature.properties.classification] || 'Normal';
    return {
      lat: feature.properties.lat,
      lng: feature.properties.lon,
      zScore: feature.properties.zscore,
      currentValue: parseFloat((feature.properties.anomaly_score * 10).toFixed(2)),
      severity: classification,
      color: colorMap[classification],
      variable,
    };
  });

  return {
    variable,
    bounds: { latMin: 5, latMax: 40, lngMin: 60, lngMax: 100 },
    step: geojson.meta.grid_resolution,
    totalPoints: geojson.features.length,
    anomalyCount: geojson.meta.total_anomalies,
    heatmapData,
    anomalies: heatmapData.filter((point) => point.severity !== 'Normal'),
    timestamp: new Date().toISOString(),
    demo: true,
  };
}

export {
  generateDemoGeoJSON,
  generateDemoExplanation,
  generateDemoForecast,
  generateDemoAlerts,
  generateDemoGridData,
};
