/**
 * StatsBar — Summary metrics cards.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, TrendingUp, Wifi, Clock, Zap } from 'lucide-react';

function StatCard({ icon, label, value, color, suffix, delay = 0 }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-value" style={{ color }}>
          {value}
          {suffix && <span className="stat-suffix">{suffix}</span>}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </motion.div>
  );
}

export default function StatsBar({ gridData, alertCount, isConnected, selectedVariable }) {
  const anomalyCount = gridData?.anomalyCount || 0;
  const totalPoints = gridData?.totalPoints || 0;

  // Find max Z-score
  const maxZ = gridData?.heatmapData?.length > 0
    ? Math.max(...gridData.heatmapData.map((p) => Math.abs(p.zScore)))
    : 0;

  // Count by severity
  const extremeCount = gridData?.anomalies?.filter((a) => a.severity === 'Extreme').length || 0;
  const warningCount = gridData?.anomalies?.filter((a) => a.severity === 'Warning').length || 0;

  return (
    <div className="stats-bar" id="stats-bar">
      <StatCard
        icon={<Zap size={20} />}
        label="Max Z-Score"
        value={maxZ.toFixed(2)}
        color={maxZ >= 3 ? '#ff4757' : maxZ >= 2 ? '#ffa502' : '#2ed573'}
        delay={0}
      />
      <StatCard
        icon={<AlertTriangle size={20} />}
        label="Anomalies"
        value={anomalyCount}
        suffix={`/ ${totalPoints}`}
        color="#ffa502"
        delay={0.1}
      />
      <StatCard
        icon={<Activity size={20} />}
        label="Live Alerts"
        value={alertCount || 0}
        color="#ff6348"
        delay={0.2}
      />
      <StatCard
        icon={<TrendingUp size={20} />}
        label="Extreme"
        value={extremeCount}
        color="#ff4757"
        delay={0.3}
      />
      <StatCard
        icon={<Clock size={20} />}
        label="Variable"
        value={selectedVariable || 'T2M'}
        color="#7c5cfc"
        delay={0.4}
      />
      <StatCard
        icon={<Wifi size={20} />}
        label="Socket"
        value={isConnected ? 'Live' : 'Offline'}
        color={isConnected ? '#2ed573' : '#ff4757'}
        delay={0.5}
      />
    </div>
  );
}
