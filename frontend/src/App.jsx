import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, TrendingUp, Zap, Globe, Radio,
  MapPin, BarChart3, Eye, Layers, ChevronDown, Wifi, WifiOff, Info
} from 'lucide-react';
import AnomalyMap from './components/AnomalyMap';
import ForecastChart from './components/ForecastChart';
import ShapChart from './components/ShapChart';
import HeroPage from './components/HeroPage';
import api from './api';
import {
  generateDemoGeoJSON, generateDemoExplanation,
  generateDemoForecast, generateDemoAlerts
} from './demoData';

const SEVERITY_ORDER = { extreme: 3, warning: 2, watch: 1, normal: 0 };

export default function App() {
  // ── Page State ────────────────────────────────────────
  const [showDashboard, setShowDashboard] = useState(false);

  // ── State ─────────────────────────────────────────────
  const [geojson, setGeojson] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [mapStyle, setMapStyle] = useState('heatmap');
  const [error, setError] = useState(null);

  const wsRef = useRef(null);

  // ── Check backend on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function checkBackend() {
      try {
        await api.health();
        if (!cancelled) setBackendConnected(true);
      } catch {
        if (!cancelled) {
          setBackendConnected(false);
          setDemoMode(true);
          loadDemoData();
        }
      }
    }
    checkBackend();
    return () => { cancelled = true; };
  }, []);

  function loadDemoData() {
    const demoGeo = generateDemoGeoJSON();
    setGeojson(demoGeo);
    const demoAlerts = generateDemoAlerts();
    setAlerts(demoAlerts.alerts || []);
  }

  // ── Detect ────────────────────────────────────────────
  const handleDetect = useCallback(async () => {
    setIsDetecting(true);
    setError(null);
    try {
      if (demoMode) {
        await new Promise(r => setTimeout(r, 800));
        loadDemoData();
      } else {
        const geo = await api.detect();
        setGeojson(geo);
        const alertsData = await api.alerts();
        setAlerts(alertsData.alerts || []);
      }
    } catch (err) {
      setError(err.message);
      if (!demoMode) {
        setDemoMode(true);
        loadDemoData();
      }
    } finally {
      setIsDetecting(false);
    }
  }, [demoMode]);

  // ── Select Region ─────────────────────────────────────
  const handleSelectRegion = useCallback(async (regionId) => {
    if (selectedRegion === regionId) return;
    setSelectedRegion(regionId);
    setExplanation(null);
    setForecast(null);
    try {
      if (demoMode) {
        await new Promise(r => setTimeout(r, 300));
        setExplanation(generateDemoExplanation(regionId));
        setForecast(generateDemoForecast(regionId));
      } else {
        const [exp, fc] = await Promise.all([
          api.explain(regionId),
          api.forecast(regionId),
        ]);
        setExplanation(exp);
        setForecast(fc);
      }
    } catch (err) {
      setExplanation(generateDemoExplanation(regionId));
      setForecast(generateDemoForecast(regionId));
    }
  }, [demoMode, selectedRegion]);

  // ── WebSocket ─────────────────────────────────────────
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
  const wsRetries = useRef(0);
  const wsMaxRetries = 5;

  const connectWebSocket = useCallback(() => {
    if (!backendConnected) return;
    setWsStatus('connecting');
    try {
      const ws = api.createWebSocket();
      ws.onopen = () => {
        setIsLive(true);
        setWsStatus('connected');
        wsRetries.current = 0;
      };
      ws.onclose = () => {
        setIsLive(false);
        if (wsRetries.current < wsMaxRetries) {
          const delay = Math.min(1000 * Math.pow(2, wsRetries.current), 30000);
          wsRetries.current++;
          setWsStatus('connecting');
          setTimeout(() => {
            if (wsRef.current === ws) connectWebSocket();
          }, delay);
        } else {
          setWsStatus('disconnected');
        }
      };
      ws.onerror = () => {
        ws.close();
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'anomaly_update' && data.anomalies) {
            // Merge live scores into existing GeoJSON features
            setGeojson(prev => {
              if (!prev?.features) return prev;
              const scoreMap = new Map(data.anomalies.map(a => [a.region_id, a]));
              const updatedFeatures = prev.features.map(f => {
                const live = scoreMap.get(f.properties.region_id);
                if (live) {
                  return {
                    ...f,
                    properties: {
                      ...f.properties,
                      anomaly_score: live.score,
                      classification: live.classification,
                    },
                  };
                }
                return f;
              });
              return { ...prev, features: updatedFeatures };
            });
          }
        } catch { /* ignore parse errors */ }
      };
      wsRef.current = ws;
    } catch {
      setWsStatus('disconnected');
      setIsLive(false);
    }
  }, [backendConnected]);

  const toggleLive = useCallback(() => {
    if (isLive) {
      wsRef.current?.close();
      wsRef.current = null;
      wsRetries.current = wsMaxRetries; // prevent reconnection
      setIsLive(false);
      setWsStatus('disconnected');
      return;
    }
    wsRetries.current = 0;
    connectWebSocket();
  }, [isLive, connectWebSocket]);

  useEffect(() => {
    return () => {
      wsRetries.current = wsMaxRetries;
      wsRef.current?.close();
    };
  }, []);

  // ── Enter Dashboard Handler ───────────────────────────
  const handleEnterDashboard = useCallback(() => {
    setShowDashboard(true);
    document.body.style.overflow = 'hidden';
  }, []);

  // ── Computed values ───────────────────────────────────
  const meta = geojson?.meta || {};
  const sortedAlerts = [...alerts].sort((a, b) =>
    (SEVERITY_ORDER[b.classification] || 0) - (SEVERITY_ORDER[a.classification] || 0)
      || b.anomaly_score - a.anomaly_score
  );

  // ── Render ────────────────────────────────────────────
  if (!showDashboard) {
    return <HeroPage onEnterDashboard={handleEnterDashboard} />;
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header" id="app-header">
        <div className="header-left">
          <div className="header-logo">🌍</div>
          <div>
            <div className="header-title">Climate Anomaly Detection</div>
            <div className="header-subtitle">Spatiotemporal VAE + Isolation Forest Ensemble</div>
          </div>
        </div>
        <div className="header-right">
          {demoMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="header-status"
              style={{ background: 'rgba(217, 119, 6, 0.06)', borderColor: 'rgba(217, 119, 6, 0.2)' }}
            >
              <Info size={12} style={{ color: '#D97706' }} />
              <span style={{ color: '#D97706' }}>Demo Mode</span>
            </motion.div>
          )}
          <div className={`ws-indicator ${wsStatus === 'connected' ? 'connected' : wsStatus === 'connecting' ? 'reconnecting' : ''}`}>
            {wsStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Reconnecting...' : 'Offline'}
          </div>
          <div className={`header-status`}>
            <div className={`status-dot ${backendConnected ? '' : 'offline'}`} />
            {backendConnected ? 'API Connected' : 'API Disconnected'}
          </div>
        </div>
      </header>

      {/* Left Panel */}
      <aside className="panel-left" id="panel-left">
        {/* Detect Button */}
        <div className="panel-section">
          <button
            className="detect-btn"
            id="detect-button"
            onClick={handleDetect}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <>
                <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Analyzing...
              </>
            ) : (
              <>
                <Zap size={15} />
                Run Detection
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="panel-section">
          <div className="panel-section-title">
            <Activity size={12} /> Detection Summary
          </div>
          <div className="stats-grid">
            <motion.div className="stat-card total" whileHover={{ scale: 1.02 }}>
              <div className="stat-value">{meta.total_anomalies || 0}</div>
              <div className="stat-label">Total</div>
            </motion.div>
            <motion.div className="stat-card extreme" whileHover={{ scale: 1.02 }}>
              <div className="stat-value">{meta.extreme || 0}</div>
              <div className="stat-label">Extreme</div>
            </motion.div>
            <motion.div className="stat-card warning" whileHover={{ scale: 1.02 }}>
              <div className="stat-value">{meta.warning || 0}</div>
              <div className="stat-label">Warning</div>
            </motion.div>
            <motion.div className="stat-card watch" whileHover={{ scale: 1.02 }}>
              <div className="stat-value">{meta.watch || 0}</div>
              <div className="stat-label">Watch</div>
            </motion.div>
          </div>
        </div>

        {/* Alert List */}
        <div className="panel-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-section-title">
            <AlertTriangle size={12} /> Active Alerts
          </div>
          {sortedAlerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Globe size={20} /></div>
              <div className="empty-state-title">No alerts yet</div>
              <div className="empty-state-text">Run detection to scan for climate anomalies across the grid.</div>
            </div>
          ) : (
            <div className="alert-list" id="alert-list">
              <AnimatePresence>
                {sortedAlerts.map((alert, i) => (
                  <motion.div
                    key={alert.region_id}
                    className={`alert-item ${selectedRegion === alert.region_id ? 'selected' : ''}`}
                    onClick={() => handleSelectRegion(alert.region_id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    whileHover={{ x: 2 }}
                    id={`alert-${alert.region_id}`}
                  >
                    <span className={`alert-badge ${alert.classification}`}>
                      {alert.classification}
                    </span>
                    <div className="alert-content">
                      <div className="alert-region">{alert.region_id}</div>
                      <div className="alert-coords">
                        {alert.lat?.toFixed(2)}°N, {alert.lon?.toFixed(2)}°E
                      </div>
                    </div>
                    <span className={`alert-score ${alert.classification}`}>
                      {alert.anomaly_score?.toFixed(3)}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Response Time */}
        {meta.response_time_ms && (
          <div className="panel-section" style={{ padding: '10px 16px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Response time</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {meta.response_time_ms}ms
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Map (Center) */}
      <main className="map-container" id="map-container">
        <AnomalyMap
          geojson={geojson}
          selectedRegion={selectedRegion}
          onSelectRegion={handleSelectRegion}
          mapStyle={mapStyle}
        />

        {/* Map Controls */}
        <div className="map-overlay-controls">
          <button
            className={`map-control-btn ${mapStyle === 'heatmap' ? 'active' : ''}`}
            onClick={() => setMapStyle('heatmap')}
            id="btn-heatmap"
          >
            <Layers size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
            Heatmap
          </button>
          <button
            className={`map-control-btn ${mapStyle === 'polygon' ? 'active' : ''}`}
            onClick={() => setMapStyle('polygon')}
            id="btn-polygon"
          >
            <MapPin size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
            Cells
          </button>
          {backendConnected && (
            <button
              className={`map-control-btn ${isLive ? 'active' : ''}`}
              onClick={toggleLive}
              id="btn-live"
            >
              <Radio size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
              {isLive ? 'Live ●' : 'Go Live'}
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-title">Anomaly Classification</div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: '#7C3AED' }} />
              Extreme (≥0.9)
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: '#DC2626' }} />
              Warning (≥0.8)
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: '#D97706' }} />
              Watch (≥0.7)
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ background: '#16A34A' }} />
              Normal
            </div>
          </div>
        </div>
      </main>

      {/* Right Panel */}
      <aside className="panel-right" id="panel-right">
        {selectedRegion ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRegion}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Region Detail Header */}
              <div className="detail-card">
                <div className="detail-header">
                  <div className="detail-region-id">{selectedRegion}</div>
                  {explanation && (
                    <div className={`detail-score-badge ${getClassification(explanation.anomaly_score)}`}>
                      {explanation.anomaly_score?.toFixed(3)}
                    </div>
                  )}
                </div>
                {explanation && (
                  <div className="detail-coords-row">
                    <div className="detail-coord">
                      Lat: <span>{explanation.lat?.toFixed(4)}°N</span>
                    </div>
                    <div className="detail-coord">
                      Lon: <span>{explanation.lon?.toFixed(4)}°E</span>
                    </div>
                  </div>
                )}
              </div>

              {/* SHAP Explanation */}
              {explanation ? (
                <div className="shap-section">
                  <div className="panel-section-title">
                    <BarChart3 size={12} /> Feature Attribution (SHAP)
                  </div>
                  <ShapChart explanation={explanation.explanation} />
                </div>
              ) : (
                <div className="loading-container" style={{ height: 150 }}>
                  <div className="loading-spinner" />
                  <div className="loading-text">Loading explanation...</div>
                </div>
              )}

              {/* Narrative */}
              {explanation?.narrative && (
                <div className="narrative-section">
                  <div className="panel-section-title">
                    <Eye size={12} /> AI Narrative
                  </div>
                  <div className="narrative-text">{explanation.narrative}</div>
                </div>
              )}

              {/* Forecast */}
              <div className="forecast-section">
                <div className="panel-section-title">
                  <TrendingUp size={12} /> Anomaly Forecast (24h)
                </div>
                {forecast ? (
                  <ForecastChart forecast={forecast} />
                ) : (
                  <div className="loading-container" style={{ height: 200 }}>
                    <div className="loading-spinner" />
                    <div className="loading-text">Loading forecast...</div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="empty-state" style={{ height: '100%' }}>
            <div className="empty-state-icon"><MapPin size={20} /></div>
            <div className="empty-state-title">Select a Region</div>
            <div className="empty-state-text">
              Click an anomaly on the map or select from the alert list to view SHAP explanations and forecasts.
            </div>
          </div>
        )}
      </aside>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 20px', borderRadius: 8, background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: '0.82rem',
              zIndex: 1000, backdropFilter: 'blur(12px)',
            }}
            onClick={() => setError(null)}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getClassification(score) {
  if (score >= 0.9) return 'extreme';
  if (score >= 0.8) return 'warning';
  if (score >= 0.7) return 'watch';
  return 'normal';
}
