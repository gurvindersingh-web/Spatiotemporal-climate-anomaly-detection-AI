/**
 * MapView — Leaflet heatmap with anomaly overlay.
 * Uses react-leaflet + leaflet.heat for the heatmap layer.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

/**
 * HeatLayer component — imperatively adds a Leaflet heat layer.
 */
function HeatLayer({ points, options }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    if (points && points.length > 0) {
      layerRef.current = L.heatLayer(points, {
        radius: options?.radius || 35,
        blur: options?.blur || 25,
        maxZoom: options?.maxZoom || 10,
        max: options?.max || 4,
        gradient: options?.gradient || {
          0.0: '#2ed573',
          0.3: '#ffd32a',
          0.5: '#ffa502',
          0.7: '#ff6348',
          0.9: '#ff4757',
          1.0: '#e84393',
        },
      }).addTo(map);
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, points, options]);

  return null;
}

/**
 * Anomaly markers — pulsing circles for detected anomalies.
 */
function AnomalyMarkers({ anomalies, onMarkerClick }) {
  if (!anomalies || anomalies.length === 0) return null;

  return anomalies.map((a, i) => (
    <CircleMarker
      key={`anomaly-${i}`}
      center={[a.lat, a.lng]}
      radius={Math.min(Math.abs(a.zScore) * 4, 18)}
      pathOptions={{
        fillColor: a.color || '#ff4757',
        color: a.color || '#ff4757',
        fillOpacity: 0.6,
        weight: 2,
        className: a.severity === 'Extreme' ? 'pulse-marker' : '',
      }}
      eventHandlers={{
        click: () => onMarkerClick?.(a),
      }}
    >
      <Popup>
        <div className="map-popup">
          <div className="map-popup-title">{a.city || `${a.lat.toFixed(2)}°, ${a.lng.toFixed(2)}°`}</div>
          <div className="map-popup-row">
            <span>Variable:</span>
            <span>{a.variable}</span>
          </div>
          <div className="map-popup-row">
            <span>Z-Score:</span>
            <span style={{ color: a.color, fontWeight: 700 }}>{a.zScore?.toFixed(2)}</span>
          </div>
          <div className="map-popup-row">
            <span>Value:</span>
            <span>{a.currentValue?.toFixed(1)}</span>
          </div>
          <div className="map-popup-row">
            <span>Severity:</span>
            <span style={{ color: a.color }}>{a.severity}</span>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  ));
}

export default function MapView({ gridData, anomalies, latestAlert, onPointSelect }) {
  // Build heatmap points from grid data: [lat, lng, intensity]
  const heatmapPoints = useMemo(() => {
    if (!gridData?.heatmapData) return [];
    return gridData.heatmapData.map((p) => [p.lat, p.lng, Math.abs(p.zScore)]);
  }, [gridData]);

  // Flash effect when new alert arrives
  const mapRef = useRef(null);

  useEffect(() => {
    if (latestAlert && mapRef.current) {
      // Optionally fly to alert location
    }
  }, [latestAlert]);

  // Handle container resize to prevent squished tiles
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    // Create a resize observer on the map's container
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    resizeObserver.observe(map.getContainer());
    
    // Also trigger it once after a short delay to handle initial render edge cases
    setTimeout(() => map.invalidateSize(), 100);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="map-container" id="anomaly-map">
      <MapContainer
        center={[20, 40]}
        zoom={2}
        minZoom={2}
        maxZoom={12}
        style={{ height: '100%', width: '100%', background: '#080c14' }}
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          noWrap={false}
        />

        {/* Heatmap overlay */}
        <HeatLayer points={heatmapPoints} />

        {/* Anomaly markers */}
        <AnomalyMarkers anomalies={anomalies} onMarkerClick={onPointSelect} />
      </MapContainer>

      {/* Map overlay — anomaly count badge */}
      {gridData && (
        <div className="map-overlay-badge">
          <span className="map-overlay-count">{gridData.anomalyCount || 0}</span>
          <span className="map-overlay-label">anomalies detected</span>
        </div>
      )}
    </div>
  );
}
