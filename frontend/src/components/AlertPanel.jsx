/**
 * AlertPanel — Real-time scrolling alert feed with Z-score-based severity.
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Trash2, MapPin, X, Wifi, WifiOff, Activity, RotateCcw } from 'lucide-react';

/**
 * Map Z-score magnitude to severity classification.
 * Z < 2: Normal, Z 2-3: Watch, Z 3-4: Warning, Z >= 4: Extreme
 */
function getSeverityFromZScore(zScore) {
  const absZ = Math.abs(zScore || 0);
  if (absZ >= 4) return 'Extreme';
  if (absZ >= 3) return 'Warning';
  if (absZ >= 2) return 'Watch';
  return 'Normal';
}

function SeverityBadge({ severity }) {
  const colors = {
    Extreme: { bg: 'rgba(255,71,87,0.15)', border: '#ff4757', text: '#ff4757' },
    Warning: { bg: 'rgba(255,165,2,0.15)', border: '#ffa502', text: '#ffa502' },
    Watch: { bg: 'rgba(255,221,87,0.15)', border: '#ffdd57', text: '#ffdd57' },
    Normal: { bg: 'rgba(46,213,115,0.15)', border: '#2ed573', text: '#2ed573' },
  };
  const c = colors[severity] || colors.Normal;

  return (
    <span
      className="severity-badge"
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
    >
      {severity}
    </span>
  );
}

function AlertItem({ alert, onLocate, index }) {
  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Compute severity from Z-score if not explicitly provided
  const severity = alert.severity || getSeverityFromZScore(alert.zScore);

  return (
    <motion.div
      className="alert-item"
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -60, opacity: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03 }}
      layout
    >
      <div className="alert-item-header">
        <SeverityBadge severity={severity} />
        <span className="alert-time">{timeAgo(alert.timestamp || alert.receivedAt)}</span>
      </div>

      <div className="alert-item-body">
        <div className="alert-city">
          <MapPin size={12} />
          {alert.city || `${alert.lat?.toFixed(2)}°, ${alert.lng?.toFixed(2)}°`}
        </div>
        <div className="alert-detail">
          {alert.variable} = {alert.currentValue?.toFixed(1)} • Z = {alert.zScore?.toFixed(2)}
        </div>
      </div>

      <button
        className="alert-locate-btn"
        onClick={() => onLocate?.(alert)}
        title="Zoom to location"
      >
        <MapPin size={14} />
      </button>
    </motion.div>
  );
}

/**
 * Connection status indicator showing WebSocket state and reconnection info.
 */
function ConnectionStatus({ isConnected, connectionStatus, reconnectInfo, onReconnect }) {
  const statusText = {
    offline: 'Disconnected',
    connecting: 'Connecting…',
    online: 'Connected',
    reconnecting: `Retrying (${reconnectInfo?.attempts || 0})…`,
  };

  const statusColor = {
    offline: '#ff4757',
    connecting: '#ffdd57',
    online: '#2ed573',
    reconnecting: '#ffa502',
  };

  return (
    <div className="connection-status" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: statusColor[connectionStatus] || '#999',
          animation: connectionStatus === 'online' ? 'pulse 2s infinite' : 'none',
        }}
      />
      <span style={{ fontSize: '12px', color: '#aaa' }}>
        {statusText[connectionStatus] || 'Unknown'}
      </span>
      {connectionStatus === 'offline' && (
        <button
          onClick={onReconnect}
          style={{
            marginLeft: 4,
            padding: '2px 8px',
            background: '#2ed573',
            color: '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Reconnect manually"
        >
          <RotateCcw size={10} /> Retry
        </button>
      )}
    </div>
  );
}

export default function AlertPanel({ alerts, isConnected, connectionStatus, reconnectInfo, onReconnect, onClear, onLocate, isOpen, onToggle }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current && alerts.length > 0) {
      listRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  return (
    <div className={`alert-panel ${isOpen ? 'open' : 'collapsed'}`} id="alert-panel">
      <div className="alert-panel-header" onClick={onToggle}>
        <div className="alert-panel-title">
          {isConnected ? <Bell size={16} className="bell-pulse" /> : <BellOff size={16} />}
          <span>Live Alerts</span>
          {alerts.length > 0 && (
            <span className="alert-count-badge">{alerts.length}</span>
          )}
        </div>

        <div className="alert-panel-controls">
          <ConnectionStatus
            isConnected={isConnected}
            connectionStatus={connectionStatus}
            reconnectInfo={reconnectInfo}
            onReconnect={onReconnect}
          />
          {alerts.length > 0 && (
            <button
              className="alert-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClear?.();
              }}
              title="Clear alerts"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button className="alert-toggle-btn">
            <X size={16} style={{ transform: isOpen ? 'rotate(0)' : 'rotate(45deg)' }} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="alert-panel-list" ref={listRef}>
          {alerts.length === 0 ? (
            <div className="alert-empty">
              <Activity size={24} />
              <p>No alerts yet</p>
              <span>Anomalies will appear here in real-time</span>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {alerts.map((alert, i) => (
                <AlertItem
                  key={alert.id || i}
                  alert={alert}
                  onLocate={onLocate}
                  index={i}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
