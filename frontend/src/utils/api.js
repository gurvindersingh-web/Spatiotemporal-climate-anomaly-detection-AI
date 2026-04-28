const BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5678/webhook';

export const detectAnomaly = async (lat, lon, location_name) => {
  const res = await fetch(`${BASE_URL}/anomaly-detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, location_name })
  });
  if (!res.ok) throw new Error('Failed to detect anomaly');
  return res.json();
};

export const fetchClimateStream = async () => {
  const res = await fetch(`${BASE_URL}/climate-stream`);
  if (!res.ok) throw new Error('Failed to fetch climate stream');
  return res.json();
};

export const askClimateAI = async (question, context_data) => {
  const res = await fetch(`${BASE_URL}/ask-climate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context_data })
  });
  if (!res.ok) throw new Error('Failed to fetch AI response');
  return res.json();
};

export const geocodeCity = async (city) => {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error('City not found');
  return data.results[0];
};

export const fetchOpenMeteoForecast = async (
  latitude,
  longitude,
  hourly = 'temperature_2m',
  pastDays = 0,
  forecastDays = 7
) => {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly,
    past_days: String(pastDays),
    forecast_days: String(forecastDays),
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error('Failed to fetch Open-Meteo forecast');
  return res.json();
};
