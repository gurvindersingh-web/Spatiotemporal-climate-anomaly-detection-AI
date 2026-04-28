/**
 * Robust WebSocket service with auto-reconnect and exponential backoff
 */

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start at 1s
    this.maxReconnectDelay = 30000; // Cap at 30s
    this.listeners = {
      connect: [],
      disconnect: [],
      reconnect: [],
      alert: [],
      error: [],
    };
  }

  connect(url) {
    if (this.socket) return this.socket;

    const socketUrl = url || (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelayMax: this.maxReconnectDelay,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('connect', { timestamp: new Date().toISOString() });
      this.socket.emit('subscribe', { channel: 'alerts' });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.emit('disconnect', { reason, timestamp: new Date().toISOString() });
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay
      );
      this.emit('reconnect', {
        attempt: this.reconnectAttempts,
        nextRetry: this.reconnectDelay,
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on('alert', (alert) => {
      this.emit('alert', alert);
    });

    this.socket.on('error', (error) => {
      this.emit('error', { error, timestamp: new Date().toISOString() });
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      nextRetryIn: this.reconnectDelay,
    };
  }

  reconnectManually() {
    if (this.socket) {
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.socket.connect();
    }
  }
}

export const websocketService = new WebSocketService();
