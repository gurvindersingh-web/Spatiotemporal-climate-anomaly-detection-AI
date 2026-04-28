/**
 * useAlerts — Socket.IO hook for real-time anomaly alerts.
 */

import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocketService.js';

const MAX_ALERTS = 100;

/**
 * Hook: connect to Socket.IO and receive real-time alerts with robust reconnection.
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('offline'); // offline | connecting | online | reconnecting
  const [lastConnectedTime, setLastConnectedTime] = useState(null);
  const [reconnectInfo, setReconnectInfo] = useState({ attempts: 0, nextRetryIn: 0 });
  const [latestAlert, setLatestAlert] = useState(null);

  useEffect(() => {
    // Fetch initial alerts via REST
    fetchInitialAlerts();

    // Connect WebSocket
    const socket = websocketService.connect();

    // Set up event listeners
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionStatus('online');
      setLastConnectedTime(new Date().toISOString());
    };

    const handleDisconnect = ({ reason }) => {
      setIsConnected(false);
      setConnectionStatus(reason === 'io server disconnect' ? 'offline' : 'reconnecting');
    };

    const handleReconnect = ({ attempt, nextRetry }) => {
      setConnectionStatus('reconnecting');
      setReconnectInfo({ attempts: attempt, nextRetryIn: nextRetry });
    };

    const handleAlert = (alert) => {
      const enriched = {
        ...alert,
        id: alert.id || `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        receivedAt: new Date().toISOString(),
      };

      setLatestAlert(enriched);
      setAlerts((prev) => {
        const updated = [enriched, ...prev];
        return updated.slice(0, MAX_ALERTS);
      });
    };

    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('reconnect', handleReconnect);
    websocketService.on('alert', handleAlert);

    return () => {
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('reconnect', handleReconnect);
      websocketService.off('alert', handleAlert);
    };
  }, []);

  async function fetchInitialAlerts() {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/alerts?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch {
      // Silently fail — alerts will populate via WebSocket
    }
  }

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setLatestAlert(null);
  }, []);

  const reconnectManually = useCallback(() => {
    websocketService.reconnectManually();
  }, []);

  return {
    alerts,
    isConnected,
    connectionStatus,
    lastConnectedTime,
    reconnectInfo,
    latestAlert,
    clearAlerts,
    reconnectManually,
    alertCount: alerts.length,
  };
}
