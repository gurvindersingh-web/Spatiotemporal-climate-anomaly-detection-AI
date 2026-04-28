/**
 * API Service — communicates with the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const WS_BASE = import.meta.env.VITE_WS_URL || '';

class ApiService {
  /** Resolve the base URL — empty string uses the Vite proxy (relative paths). */
  get baseUrl() {
    return API_BASE;
  }

  /** Build a WebSocket URL, deriving ws:// from http:// if WS_URL is not set. */
  get wsUrl() {
    if (WS_BASE) return WS_BASE;
    if (API_BASE) return API_BASE.replace(/^http/, 'ws') + '/ws/live';
    // When using Vite proxy, derive from current page origin
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/live`;
  }

  async health() {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  }

  async detect(timestep = -1, threshold = null) {
    const params = new URLSearchParams({ timestep: String(timestep) });
    if (threshold !== null) params.set('threshold', String(threshold));
    const res = await fetch(`${this.baseUrl}/detect?${params}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Detection failed: ${res.status}`);
    return res.json();
  }

  async explain(regionId) {
    const res = await fetch(`${this.baseUrl}/explain/${encodeURIComponent(regionId)}`);
    if (!res.ok) throw new Error(`Explanation failed: ${res.status}`);
    return res.json();
  }

  async forecast(regionId, horizon = 24) {
    const params = new URLSearchParams({ horizon: String(horizon) });
    const res = await fetch(`${this.baseUrl}/forecast/${encodeURIComponent(regionId)}?${params}`);
    if (!res.ok) throw new Error(`Forecast failed: ${res.status}`);
    return res.json();
  }

  async alerts(level = 'watch', limit = 50) {
    const params = new URLSearchParams({ level, limit: String(limit) });
    const res = await fetch(`${this.baseUrl}/alerts?${params}`);
    if (!res.ok) throw new Error(`Alerts failed: ${res.status}`);
    return res.json();
  }

  createWebSocket() {
    return new WebSocket(this.wsUrl);
  }
}

export const api = new ApiService();
export default api;
