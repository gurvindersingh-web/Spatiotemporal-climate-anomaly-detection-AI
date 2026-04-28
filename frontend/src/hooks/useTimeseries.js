/**
 * useTimeseries — TanStack Query hook for historical climate data.
 */

import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Fetch historical timeseries from backend.
 */
async function fetchTimeseries(lat, lng, variable, years) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    var: variable,
    years: String(years),
  });
  const res = await fetch(`${API_BASE}/api/timeseries?${params}`);
  if (!res.ok) throw new Error(`Timeseries fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Hook: fetch historical timeseries.
 */
export function useTimeseries(lat, lng, variable = 'T2M', years = 30, options = {}) {
  return useQuery({
    queryKey: ['timeseries', lat, lng, variable, years],
    queryFn: () => fetchTimeseries(lat, lng, variable, years),
    enabled: lat != null && lng != null,
    staleTime: 30 * 60 * 1000,  // 30 minutes (historical data doesn't change fast)
    ...options,
  });
}
