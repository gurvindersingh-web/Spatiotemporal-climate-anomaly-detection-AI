/**
 * useAnomalyAnalysis — Orchestrates the full city analysis pipeline.
 * Fetches current weather + 5-year historical normals, computes z-scores.
 */
import { useState, useCallback } from 'react';
import {
  fetchCurrentWeather, fetchHistoricalNormals,
  computeZScores, getOverallStatus,
} from '../utils/openMeteoApi.js';

export function useAnomalyAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  const analyzeCity = useCallback(async (city) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setAnalysisData(null);

    try {
      const [cur, hist] = await Promise.all([
        fetchCurrentWeather(city.latitude, city.longitude),
        fetchHistoricalNormals(city.latitude, city.longitude, 5),
      ]);

      const analyses = computeZScores(cur, hist);
      const overall = getOverallStatus(analyses);
      const anomalyCount = analyses.filter(
        (a) => a.zScore !== null && Math.abs(a.zScore) >= 1.0
      ).length;

      const data = {
        location: city,
        analyses,
        overall,
        anomalyCount,
        timestamp: new Date().toISOString(),
      };

      setResults(analyses);
      setAnalysisData(data);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch climate data';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResults(null);
    setAnalysisData(null);
  }, []);

  return { analyzeCity, loading, error, results, analysisData, reset };
}
