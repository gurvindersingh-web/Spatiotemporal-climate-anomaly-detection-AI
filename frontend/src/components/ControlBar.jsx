/**
 * ControlBar — Variable selector, threshold slider, and refresh controls.
 */

import React from 'react';
import { Thermometer, Droplets, Wind, Gauge, RefreshCw, Search } from 'lucide-react';

const VARIABLES = [
  { id: 'T2M', label: 'Temperature', icon: <Thermometer size={16} />, unit: '°C' },
  { id: 'PRECTOTCORR', label: 'Precipitation', icon: <Droplets size={16} />, unit: 'mm/day' },
  { id: 'WS2M', label: 'Wind Speed', icon: <Wind size={16} />, unit: 'm/s' },
  { id: 'RH2M', label: 'Humidity', icon: <Gauge size={16} />, unit: '%' },
];

export default function ControlBar({
  selectedVariable,
  onVariableChange,
  threshold,
  onThresholdChange,
  onRefresh,
  isLoading,
  searchQuery,
  onSearchChange,
  onSearch,
}) {
  return (
    <div className="control-bar" id="control-bar">
      {/* Variable selector */}
      <div className="control-group control-variables">
        {VARIABLES.map((v) => (
          <button
            key={v.id}
            className={`control-var-btn ${selectedVariable === v.id ? 'active' : ''}`}
            onClick={() => onVariableChange?.(v.id)}
            title={`${v.label} (${v.unit})`}
            id={`var-btn-${v.id}`}
          >
            {v.icon}
            <span className="control-var-label">{v.label}</span>
          </button>
        ))}
      </div>

      {/* Threshold slider */}
      <div className="control-group control-threshold">
        <label className="control-label">
          Z-threshold: <span className="threshold-value">{threshold?.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="1.0"
          max="4.0"
          step="0.1"
          value={threshold || 2.0}
          onChange={(e) => onThresholdChange?.(parseFloat(e.target.value))}
          className="threshold-slider"
          id="threshold-slider"
        />
        <div className="threshold-labels">
          <span>1.0</span>
          <span>4.0</span>
        </div>
      </div>

      {/* Refresh */}
      <button
        className={`control-refresh-btn ${isLoading ? 'spinning' : ''}`}
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh data"
        id="refresh-btn"
      >
        <RefreshCw size={18} />
      </button>
    </div>
  );
}
