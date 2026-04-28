/**
 * Dashboard — Main layout combining all SCAD components.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

import GoogleLiveMap from './GoogleLiveMap.jsx';
import ControlBar from './ControlBar.jsx';
import StatsBar from './StatsBar.jsx';
import AlertPanel from './AlertPanel.jsx';
import { useGridAnomalies } from '../hooks/useAnomalies.js';
import { useTimeseries } from '../hooks/useTimeseries.js';
import { useAlerts } from '../hooks/useAlerts.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ArrowLeft, TrendingUp } from 'lucide-react';

const DEFAULT_BOUNDS = {
  latMin: -60, latMax: 70,
  lngMin: -180, lngMax: 180,
};

export default function Dashboard({ onBackToHero }) {
  // State
  const [selectedVariable, setSelectedVariable] = useState('T2M');
  const [threshold, setThreshold] = useState(2.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [alertPanelOpen, setAlertPanelOpen] = useState(true);

  // Data hooks
  const { data: gridData, isLoading: gridLoading, refetch: refetchGrid } = useGridAnomalies(
    DEFAULT_BOUNDS,
    selectedVariable,
    10, // step
    { enabled: true }
  );

  const { data: timeseriesData } = useTimeseries(
    selectedPoint?.lat || 28.6,
    selectedPoint?.lng || 77.2,
    selectedVariable,
    30
  );

  const { alerts, isConnected, connectionStatus, lastConnectedTime, reconnectInfo, latestAlert, clearAlerts, reconnectManually } = useAlerts();

  // Handlers
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name } = data.results[0];
        setSelectedPoint({ lat: latitude, lng: longitude, city: name });
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
  }, [searchQuery]);

  const handlePointSelect = useCallback((point) => {
    setSelectedPoint(point);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchGrid();
  }, [refetchGrid]);

  const handleLocateAlert = useCallback((alert) => {
    setSelectedPoint({ lat: alert.lat, lng: alert.lng, city: alert.city });
  }, []);

  return (
    <div className="dashboard" id="dashboard">
      {/* Header */}
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
      </motion.header>

      {/* Control Bar */}
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

      {/* Stats Bar */}
      <StatsBar
        gridData={gridData}
        alertCount={alerts.length}
        isConnected={isConnected}
        selectedVariable={selectedVariable}
      />

      {/* Main content area */}
      <div className="dashboard-main">
        {/* Map */}
        <div className="dashboard-map-area">
          <GoogleLiveMap
            gridData={gridData}
            anomalies={gridData?.anomalies || []}
            latestAlert={latestAlert}
            onPointSelect={handlePointSelect}
          />
        </div>

        {/* Right side: Alert Panel */}
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

      {/* Timeseries chart — shown when point is selected */}
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
                <XAxis
                  dataKey="year"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10,15,30,0.95)',
                    border: '1px solid rgba(124,92,252,0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="mean"
                  stroke="#7c5cfc"
                  fill="url(#chartGradient)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="max"
                  stroke="#ff4757"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="min"
                  stroke="#2ed573"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}
