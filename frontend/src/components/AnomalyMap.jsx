import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const CLASSIFICATION_COLORS = {
  extreme: [124, 58, 237, 180],
  warning: [220, 38, 38, 160],
  watch: [217, 119, 6, 140],
  normal: [22, 163, 74, 100],
};

const CLASSIFICATION_COLORS_BRIGHT = {
  extreme: [124, 58, 237, 255],
  warning: [220, 38, 38, 255],
  watch: [217, 119, 6, 255],
  normal: [22, 163, 74, 255],
};

// South Asia centered view
const DEFAULT_CENTER = { lat: 22, lng: 78 };
const DEFAULT_ZOOM = 4.5;

// Light map style — clean minimal look
const LIGHT_MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0f2fe' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
];

// ── Deck.gl overlay bridge for Google Maps ──────────────
function DeckGLOverlay({ layers }) {
  const map = useMap();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    const overlay = new GoogleMapsOverlay({});
    overlay.setMap(map);
    overlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers });
    }
  }, [layers]);

  return null;
}

// ── Main Map Component ──────────────────────────────────
export default function AnomalyMap({ geojson, selectedRegion, onSelectRegion, mapStyle }) {
  const [hoveredFeature, setHoveredFeature] = useState(null);

  // ── Build layers ──────────────────────────────────────
  const layers = useMemo(() => {
    if (!geojson || !geojson.features || geojson.features.length === 0) return [];

    const layerList = [];

    if (mapStyle === 'heatmap') {
      // Heatmap layer
      const heatmapData = geojson.features.map(f => ({
        position: [f.properties.lon, f.properties.lat],
        weight: f.properties.anomaly_score,
      }));

      layerList.push(
        new HeatmapLayer({
          id: 'anomaly-heatmap',
          data: heatmapData,
          getPosition: d => d.position,
          getWeight: d => d.weight,
          radiusPixels: 45,
          intensity: 1.8,
          threshold: 0.12,
          colorRange: [
            [34, 211, 238, 40],
            [250, 204, 21, 100],
            [251, 146, 60, 150],
            [239, 68, 68, 200],
            [220, 38, 38, 240],
            [180, 20, 20, 255],
          ],
        })
      );

      // Add scatter dots on top for interactivity
      layerList.push(
        new ScatterplotLayer({
          id: 'anomaly-scatter',
          data: geojson.features,
          getPosition: d => [d.properties.lon, d.properties.lat],
          getFillColor: d => {
            if (selectedRegion === d.properties.region_id) return [37, 99, 235, 255];
            return CLASSIFICATION_COLORS_BRIGHT[d.properties.classification] || [100, 100, 100, 100];
          },
          getRadius: d => {
            if (selectedRegion === d.properties.region_id) return 18000;
            return 6000 + d.properties.anomaly_score * 10000;
          },
          radiusMinPixels: 3,
          radiusMaxPixels: 18,
          pickable: true,
          onClick: (info) => {
            if (info.object) onSelectRegion(info.object.properties.region_id);
          },
          onHover: (info) => {
            setHoveredFeature(info.object || null);
          },
          updateTriggers: {
            getFillColor: [selectedRegion],
            getRadius: [selectedRegion],
          },
          stroked: true,
          getLineColor: d => selectedRegion === d.properties.region_id
            ? [37, 99, 235, 255] : [100, 116, 139, 60],
          lineWidthMinPixels: 1,
        })
      );
    } else {
      // Polygon mode (GeoJSON cells)
      layerList.push(
        new GeoJsonLayer({
          id: 'anomaly-cells',
          data: geojson,
          filled: true,
          stroked: true,
          getFillColor: f => {
            if (selectedRegion === f.properties.region_id) return [37, 99, 235, 60];
            return CLASSIFICATION_COLORS[f.properties.classification] || [100, 100, 100, 60];
          },
          getLineColor: f => {
            if (selectedRegion === f.properties.region_id) return [37, 99, 235, 255];
            const cls = f.properties.classification;
            if (cls === 'extreme') return [124, 58, 237, 120];
            if (cls === 'warning') return [220, 38, 38, 100];
            return [148, 163, 184, 40];
          },
          getLineWidth: f => selectedRegion === f.properties.region_id ? 2 : 0.5,
          lineWidthMinPixels: 0.5,
          pickable: true,
          onClick: (info) => {
            if (info.object) onSelectRegion(info.object.properties.region_id);
          },
          onHover: (info) => {
            setHoveredFeature(info.object || null);
          },
          updateTriggers: {
            getFillColor: [selectedRegion],
            getLineColor: [selectedRegion],
            getLineWidth: [selectedRegion],
          },
        })
      );
    }

    return layerList;
  }, [geojson, selectedRegion, mapStyle, onSelectRegion]);

  // ── Tooltip ───────────────────────────────────────────
  const renderTooltip = useCallback(() => {
    if (!hoveredFeature) return null;
    const p = hoveredFeature.properties || hoveredFeature;
    return (
      <div className="map-tooltip" style={{
        position: 'absolute',
        left: 16, top: 60,
        pointerEvents: 'none',
      }}>
        <div className="tooltip-title">{p.region_id}</div>
        <div className="tooltip-row">
          <span className="tooltip-label">Score</span>
          <span className="tooltip-value" style={{ color: getScoreColor(p.anomaly_score) }}>
            {p.anomaly_score?.toFixed(4)}
          </span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Level</span>
          <span className="tooltip-value">{p.classification?.toUpperCase()}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Location</span>
          <span className="tooltip-value">{p.lat?.toFixed(2)}°N, {p.lon?.toFixed(2)}°E</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Z-Score</span>
          <span className="tooltip-value">{p.zscore?.toFixed(2)}</span>
        </div>
      </div>
    );
  }, [hoveredFeature]);

  return (
    <>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={true}
          styles={LIGHT_MAP_STYLES}
          style={{ width: '100%', height: '100%' }}
          backgroundColor="#F8FAFC"
        >
          <DeckGLOverlay layers={layers} />
        </Map>
      </APIProvider>
      {renderTooltip()}
    </>
  );
}

function getScoreColor(score) {
  if (score >= 0.9) return '#7C3AED';
  if (score >= 0.8) return '#DC2626';
  if (score >= 0.7) return '#D97706';
  return '#16A34A';
}
