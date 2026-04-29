/**
 * DetailPanel — Right-side sliding panel showing full anomaly analysis for a city.
 * Includes header, summary bar, variable cards grid, AI block, and recent searches.
 */
import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Clock, Activity, BarChart3, Zap,
  TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle,
  Loader2, RefreshCw, X,
} from 'lucide-react';
import { getSeverityConfig } from '../../utils/openMeteoApi.js';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

/* ── Z-Score Gauge ─── */
function ZScoreGauge({ zScore, color }) {
  const clamped = Math.max(-5, Math.min(5, zScore || 0));
  const pct = ((clamped + 5) / 10) * 100;
  return (
    <div className="zscore-gauge">
      <div className="zscore-gauge-track">
        <div className="zscore-gauge-center" />
        <motion.div
          className="zscore-gauge-dot"
          initial={{ left: '50%' }}
          animate={{ left: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <div className="zscore-gauge-labels">
        <span>-5σ</span><span>0</span><span>+5σ</span>
      </div>
    </div>
  );
}

/* ── Sparkline ─── */
function Sparkline({ data, color }) {
  const filtered = (data || []).filter((v) => v !== null);
  if (filtered.length < 2) return null;
  const chartData = filtered.map((v, i) => ({ v, i }));
  return (
    <div className="sparkline-container">
      <span className="sparkline-label">7-DAY TREND</span>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={chartData}>
          <Line
            type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            dot={false} activeDot={false} isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Variable Card ─── */
const VariableCard = memo(function VariableCard({ a, index }) {
  const cfg = getSeverityConfig(a.severity);
  const isAnomaly = a.zScore !== null && Math.abs(a.zScore) >= 1.0;
  const dir = a.zScore > 0 ? 'above' : a.zScore < 0 ? 'below' : 'at';

  return (
    <motion.div
      className={`detail-var-card ${isAnomaly ? 'anomalous' : ''}`}
      style={{ '--accent': cfg.color }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      {/* Accent bar */}
      <div className="detail-var-accent" style={{ background: cfg.gradient }} />

      {/* Header */}
      <div className="detail-var-header">
        <div className="detail-var-meta">
          <span className="detail-var-icon">{a.icon}</span>
          <div>
            <div className="detail-var-name">{a.label}</div>
            <div className="detail-var-unit">{a.unit}</div>
          </div>
        </div>
        <span
          className="detail-var-badge"
          style={{ background: cfg.bgColor, color: cfg.color, borderColor: cfg.borderColor }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Value */}
      <div className="detail-var-value-row">
        <div className="detail-var-value" style={isAnomaly ? { color: cfg.color } : undefined}>
          {a.currentValue !== 'N/A' ? a.currentValue : '—'}
          <span className="detail-var-value-unit">{a.unit}</span>
        </div>
        {a.deviation !== null && (
          <div className={`detail-var-trend ${dir}`}>
            {dir === 'above' ? <TrendingUp size={13} /> : dir === 'below' ? <TrendingDown size={13} /> : <Minus size={13} />}
            {dir === 'above' ? '+' : ''}{a.deviation}
          </div>
        )}
      </div>

      {/* Stats row */}
      {a.historicalMean !== null && (
        <div className="detail-var-stats">
          <div className="detail-var-stat">
            <span className="detail-var-stat-label">HIST AVG</span>
            <span className="detail-var-stat-value">{a.historicalMean} {a.unit}</span>
          </div>
          <div className="detail-var-stat">
            <span className="detail-var-stat-label">STD DEV</span>
            <span className="detail-var-stat-value">±{a.historicalStd}</span>
          </div>
          <div className="detail-var-stat">
            <span className="detail-var-stat-label">Z-SCORE</span>
            <span className="detail-var-stat-value" style={{ color: cfg.color, fontWeight: 700 }}>
              {a.zScore > 0 ? '+' : ''}{a.zScore}σ
            </span>
          </div>
        </div>
      )}

      {a.zScore !== null && <ZScoreGauge zScore={a.zScore} color={cfg.color} />}

      {a.recentTrend?.length > 0 && <Sparkline data={a.recentTrend} color={cfg.color} />}
    </motion.div>
  );
});

/* ── Skeleton Loader ─── */
function PanelSkeleton() {
  return (
    <div className="detail-skeleton">
      <div className="skel skel-title" />
      <div className="skel skel-subtitle" />
      <div className="skel skel-summary" />
      <div className="detail-var-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel skel-card" />
        ))}
      </div>
    </div>
  );
}

/* ── Recent Searches ─── */
function RecentSearches({ recent, onSelect, onClear }) {
  if (!recent || recent.length === 0) return null;
  return (
    <div className="detail-recent">
      <div className="detail-recent-header">
        <span><Clock size={13} /> RECENT SEARCHES</span>
        <button onClick={onClear} className="detail-recent-clear">Clear</button>
      </div>
      {recent.map((r, i) => {
        const rc = getSeverityConfig(r.overall);
        return (
          <button key={`${r.city}-${i}`} onClick={() => onSelect(r.location)} className="detail-recent-item">
            <div className="detail-recent-dot" style={{ background: rc.color }} />
            <span className="detail-recent-name">{r.city}, {r.country}</span>
            <span className="detail-recent-badge" style={{ background: rc.bgColor, color: rc.color, borderColor: rc.borderColor }}>
              {rc.emoji} {rc.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN DETAIL PANEL
   ══════════════════════════════════════════════════════════ */
export default function DetailPanel({
  isOpen,
  onClose,
  loading,
  error,
  analysisData,
  onRetry,
  recent,
  onRecentSelect,
  onRecentClear,
}) {
  const loc = analysisData?.location;
  const analyses = analysisData?.analyses || [];
  const overall = analysisData?.overall;
  const overCfg = overall ? getSeverityConfig(overall) : null;
  const anomalyCount = analysisData?.anomalyCount || 0;
  const maxZ = analyses.length > 0
    ? Math.max(...analyses.filter((a) => a.zScore !== null).map((a) => Math.abs(a.zScore)), 0)
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          className="detail-panel"
          id="detail-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Close button */}
          <button className="detail-panel-close" onClick={onClose} aria-label="Close detail panel">
            <ArrowLeft size={16} />
          </button>

          {/* Scrollable content */}
          <div className="detail-panel-scroll">
            {loading && <PanelSkeleton />}

            {error && !loading && (
              <div className="detail-error">
                <AlertTriangle size={18} />
                <span>{error}</span>
                <button onClick={onRetry} className="detail-error-retry">
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            )}

            {analysisData && !loading && (
              <>
                {/* Header */}
                <div className="detail-header" style={{ borderColor: overCfg?.borderColor }}>
                  <div className="detail-header-left">
                    <h2 className="detail-city-name">{loc.name}</h2>
                    <div className="detail-location-line">
                      <MapPin size={11} />
                      {[loc.admin1, loc.country].filter(Boolean).join(', ')} ·{' '}
                      {loc.latitude?.toFixed(2)}°N, {loc.longitude?.toFixed(2)}°E
                      {loc.elevation && <span> · {loc.elevation}m elev.</span>}
                    </div>
                    <div className="detail-timestamp">
                      <span className="detail-live-dot" />
                      as of {new Date(analysisData.timestamp).toLocaleTimeString()} — live
                    </div>
                  </div>
                  {overCfg && (
                    <div className="detail-severity-pill" style={{ background: overCfg.gradient }}>
                      <span className="detail-severity-emoji">{overCfg.emoji}</span>
                      <div>
                        <div className="detail-severity-label">{overCfg.label}</div>
                        <div className="detail-severity-count">
                          {anomalyCount > 0
                            ? `${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'} detected`
                            : 'No anomalies'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary bar */}
                <div className="detail-summary-bar">
                  <div className="detail-summary-pill">
                    <Activity size={13} /> Variables: <strong>{analyses.length}</strong>
                  </div>
                  <div className="detail-summary-pill">
                    <Zap size={13} /> Anomalies: <strong style={{ color: overCfg?.color }}>{anomalyCount}</strong>
                  </div>
                  <div className="detail-summary-pill">
                    <BarChart3 size={13} /> Max z: <strong style={{ color: overCfg?.color }}>
                      {maxZ > 0 ? `${maxZ.toFixed(1)}σ` : '—'}
                    </strong>
                  </div>
                </div>

                {/* Variable cards grid */}
                <div className="detail-var-grid">
                  {analyses.map((a, i) => (
                    <VariableCard key={a.key} a={a} index={i} />
                  ))}
                </div>

                {/* AI summary */}
                <div className="detail-ai-block">
                  <div className="detail-ai-header">
                    <Sparkles size={15} /> Analysis Summary
                  </div>
                  <p className="detail-ai-text">
                    {anomalyCount === 0 ? (
                      <>All climate variables for <strong>{loc.name}</strong> are within normal ranges compared to the 5-year historical baseline.</>
                    ) : (
                      <>
                        <strong>{anomalyCount}</strong> variable{anomalyCount > 1 ? 's' : ''} in{' '}
                        <strong>{loc.name}</strong> show{anomalyCount > 1 ? '' : 's'} significant deviation.{' '}
                        {analyses
                          .filter((a) => a.zScore !== null && Math.abs(a.zScore) >= 1.0)
                          .map((a) => `${a.label} is ${Math.abs(a.zScore).toFixed(1)}σ ${a.zScore > 0 ? 'above' : 'below'} average`)
                          .join('; ')}.
                      </>
                    )}
                  </p>
                </div>
              </>
            )}

            {/* Recent searches */}
            <RecentSearches recent={recent} onSelect={onRecentSelect} onClear={onRecentClear} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
