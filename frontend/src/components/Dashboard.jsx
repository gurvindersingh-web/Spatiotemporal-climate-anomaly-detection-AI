/**
 * Dashboard — Unified SCAD layout: Map + Search + Detail Panel + Alerts.
 * Merges the map view and global anomaly detector into one cohesive interface.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import GoogleLiveMap from './GoogleLiveMap.jsx';
import MapView from './MapView.jsx';
import ControlBar from './ControlBar.jsx';
import StatsBar from './StatsBar.jsx';
import AlertPanel from './AlertPanel.jsx';
import SearchBox from './search/SearchBox.jsx';
import DetailPanel from './panel/DetailPanel.jsx';
import { useGridAnomalies } from '../hooks/useAnomalies.js';
import { useTimeseries } from '../hooks/useTimeseries.js';
import { useAlerts } from '../hooks/useAlerts.js';
import { useAnomalyAnalysis } from '../hooks/useAnomalyAnalysis.js';
import { getSeverityConfig, getOverallStatus } from '../utils/openMeteoApi.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ArrowLeft, TrendingUp, Globe } from 'lucide-react';

const DEFAULT_BOUNDS = {
  latMin: -60, latMax: 70,
  lngMin: -180, lngMax: 180,
};

export default function Dashboard({ onBackToHero }) {
  // ── Existing state ──
  const [selectedVariable, setSelectedVariable] = useState('T2M');
  const [threshold, setThreshold] = useState(2.0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [alertPanelOpen, setAlertPanelOpen] = useState(true);

  // ── NEW: Unified search + panel state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scad-recent-v2') || '[]'); } catch { return []; }
  });

  // ── Map ref (for Leaflet flyTo) ──
  const mapRef = useRef(null);

  // ── Data hooks ──
  const { data: gridData, isLoading: gridLoading, refetch: refetchGrid } = useGridAnomalies(
    DEFAULT_BOUNDS, selectedVariable, 10, { enabled: true }
  );
  const { data: timeseriesData } = useTimeseries(
    selectedPoint?.lat || 28.6, selectedPoint?.lng || 77.2, selectedVariable, 30
  );
  const { alerts, isConnected, connectionStatus, reconnectInfo, latestAlert, clearAlerts, reconnectManually } = useAlerts();

  // ── NEW: Analysis hook ──
  const { analyzeCity, loading: analysisLoading, error: analysisError, analysisData, reset: resetAnalysis } = useAnomalyAnalysis();

  // ── City search → analysis + flyTo ──
  const handleCitySelect = useCallback(async (city) => {
    setSelectedCity(city);
    setPanelOpen(true);

    // Trigger map fly-to
    setFlyTarget({ lat: city.latitude, lng: city.longitude });
    setSelectedPoint({ lat: city.latitude, lng: city.longitude, city: city.name });

    try {
      const data = await analyzeCity(city);

      // Save to recent
      if (data) {
        const item = {
          city: city.name,
          country: city.country || '',
          overall: data.overall,
          location: city,
        };
        setRecent((prev) => {
          const upd = [
            item,
            ...prev.filter((r) => r.city !== city.name || r.country !== (city.country || '')),
          ].slice(0, 8);
          localStorage.setItem('scad-recent-v2', JSON.stringify(upd));
          return upd;
        });
      }
    } catch {
      // Error already stored in hook
    }
  }, [analyzeCity]);

  // ── Close panel ──
  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
  }, []);

  // ── Retry analysis ──
  const handleRetry = useCallback(() => {
    if (selectedCity) handleCitySelect(selectedCity);
  }, [selectedCity, handleCitySelect]);

  // ── Recent city re-select ──
  const handleRecentSelect = useCallback((loc) => {
    setSearchQuery(`${loc.name}, ${loc.country || ''}`);
    handleCitySelect(loc);
  }, [handleCitySelect]);

  // ── Clear recent ──
  const handleRecentClear = useCallback(() => {
    setRecent([]);
    localStorage.removeItem('scad-recent-v2');
  }, []);

  // ── Existing handlers ──
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        handleCitySelect(data.results[0]);
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
  }, [searchQuery, handleCitySelect]);

  const handlePointSelect = useCallback((point) => {
    setSelectedPoint(point);
  }, []);

  const handleRefresh = useCallback(() => { refetchGrid(); }, [refetchGrid]);

  const handleLocateAlert = useCallback((alert) => {
    setSelectedPoint({ lat: alert.lat, lng: alert.lng, city: alert.city });
    setFlyTarget({ lat: alert.lat, lng: alert.lng });
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape' && panelOpen) {
        setPanelOpen(false);
      }
      if (e.key === ']' && !panelOpen && selectedCity) {
        setPanelOpen(true);
      }
      if (e.key === '[' && panelOpen) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [panelOpen, selectedCity]);

  return (
    <div className="dashboard" id="dashboard">
      {/* ── Header ── */}
      <motion.header
        className="dashboard-header"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="dashboard-brand">
          <button className="back-btn" onClick={onBackToHero} title="Back to Home">
            <ArrowLeft size={18} />
          </button>
          <span className="brand-icon">🌍</span>
          <span className="brand-name">SCAD</span>
          <span className="brand-subtitle">Spatiotemporal Climate Anomaly Detector</span>
        </div>

        {/* NEW: Always-visible search box in header */}
        <SearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onCitySelect={handleCitySelect}
        />

        <div className="dashboard-header-right">
          {selectedCity && analysisData && (
            <motion.div
              className="dashboard-analyzed-badge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="analyzed-dot" style={{
                background: getSeverityConfig(analysisData.overall)?.color || '#52c41a',
              }} />
              {selectedCity.name}
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* ── Control Bar ── */}
      <ControlBar
        selectedVariable={selectedVariable}
        onVariableChange={setSelectedVariable}
        threshold={threshold}
        onThresholdChange={setThreshold}
        onRefresh={handleRefresh}
        isLoading={gridLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearch}
      />

      {/* ── Stats Bar ── */}
      <StatsBar
        gridData={gridData}
        alertCount={alerts.length}
        isConnected={isConnected}
        selectedVariable={selectedVariable}
      />

      {/* ── Main content: Map + Panel ── */}
      <div className="dashboard-main">
        {/* Map */}
        <div className={`dashboard-map-area ${panelOpen ? 'with-panel' : ''}`}>
          <GoogleLiveMap
            gridData={gridData}
            anomalies={gridData?.anomalies || []}
            latestAlert={latestAlert}
            onPointSelect={handlePointSelect}
            flyTarget={flyTarget}
            searchPin={selectedCity && analysisData ? {
              lat: selectedCity.latitude,
              lng: selectedCity.longitude,
              name: selectedCity.name,
              severity: analysisData.overall,
            } : null}
          />

          {/* Zoom toast */}
          <AnimatePresence>
            {flyTarget && selectedCity && (
              <ZoomToast city={selectedCity} onDone={() => {}} />
            )}
          </AnimatePresence>
        </div>

        {/* Detail Panel */}
        <DetailPanel
          isOpen={panelOpen}
          onClose={handlePanelClose}
          loading={analysisLoading}
          error={analysisError}
          analysisData={analysisData}
          onRetry={handleRetry}
          recent={recent}
          onRecentSelect={handleRecentSelect}
          onRecentClear={handleRecentClear}
        />

        {/* Alert Panel */}
        <AlertPanel
          alerts={alerts}
          isConnected={isConnected}
          connectionStatus={connectionStatus}
          reconnectInfo={reconnectInfo}
          onReconnect={reconnectManually}
          onClear={clearAlerts}
          onLocate={handleLocateAlert}
          isOpen={alertPanelOpen}
          onToggle={() => setAlertPanelOpen(!alertPanelOpen)}
        />
      </div>

      {/* ── Timeseries chart ── */}
      {timeseriesData && (
        <motion.div
          className="dashboard-chart-section"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="glass-card chart-card">
            <h3 className="chart-title">
              <TrendingUp size={18} />
              Historical {selectedVariable} — {timeseriesData.period}
              {selectedPoint?.city && <span className="chart-location"> • {selectedPoint.city}</span>}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeseriesData.annualData || []}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="year" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                <Tooltip contentStyle={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="mean" stroke="#7c5cfc" fill="url(#chartGradient)" strokeWidth={2} />
                <Line type="monotone" dataKey="max" stroke="#ff4757" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="min" stroke="#2ed573" strokeDasharray="4 4" strokeWidth={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Zoom Toast ── */
function ZoomToast({ city }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, [city?.name]);

  if (!visible) return null;

  return (
    <motion.div
      className="zoom-toast"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <span className="zoom-toast-dot" />
      Zoomed to {city.name}{city.country ? `, ${city.country}` : ''}
    </motion.div>
  );
}
