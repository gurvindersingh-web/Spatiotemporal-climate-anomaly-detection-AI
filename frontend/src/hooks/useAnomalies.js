/**
 * useAnomalies — TanStack Query hook for anomaly data.
 */

import { useQuery } from '@tanstack/react-query';
import { generateDemoGridData } from '../demoData.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Fetch anomaly for a single point.
 */
async function fetchPointAnomaly(lat, lng, variable) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    var: variable,
  });
  const res = await fetch(`${API_BASE}/api/anomalies?${params}`);
  if (!res.ok) throw new Error(`Anomaly fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch anomaly grid for a bounding box.
 */
async function fetchGridAnomalies(bounds, variable, step = 5) {
  const params = new URLSearchParams({
    latMin: String(bounds.latMin),
    latMax: String(bounds.latMax),
    lngMin: String(bounds.lngMin),
    lngMax: String(bounds.lngMax),
    var: variable,
    step: String(step),
  });

  try {
    const res = await fetch(`${API_BASE}/api/anomalies/grid?${params}`);
    if (!res.ok) throw new Error(`Grid anomaly fetch failed: ${res.status}`);
    return res.json();
  } catch {
    return generateDemoGridData(variable);
  }
}

/**
 * Hook: fetch anomaly for a single point.
 */
export function usePointAnomaly(lat, lng, variable = 'T2M', options = {}) {
  return useQuery({
    queryKey: ['anomaly', lat, lng, variable],
    queryFn: () => fetchPointAnomaly(lat, lng, variable),
    enabled: lat != null && lng != null,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook: fetch anomalies for a grid.
 */
export function useGridAnomalies(bounds, variable = 'T2M', step = 5, options = {}) {
  return useQuery({
    queryKey: ['anomalies-grid', bounds, variable, step],
    queryFn: () => fetchGridAnomalies(bounds, variable, step),
    enabled: !!bounds,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    ...options,
  });
}
