import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CLASSIFICATION_COLORS = {
  extreme: '#7C3AED',
  warning: '#DC2626',
  watch: '#D97706',
  normal: '#16A34A',
};

const DEFAULT_CENTER = [22, 78];
const DEFAULT_ZOOM = 4.5;

export default function AnomalyMap({ geojson, selectedRegion, onSelectRegion, mapStyle }) {
  const points = useMemo(() => {
    if (!geojson || !geojson.features) return [];
    return geojson.features.map(f => {
      const p = f.properties;
      return {
        id: p.region_id,
        lat: p.lat,
        lng: p.lon,
        score: p.anomaly_score,
        classification: p.classification,
        zscore: p.zscore
      };
    });
  }, [geojson]);

  return (
    <MapContainer 
      center={DEFAULT_CENTER} 
      zoom={DEFAULT_ZOOM} 
      style={{ height: '100%', width: '100%', background: '#F8FAFC' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {points.map((pt) => {
        const isSelected = selectedRegion === pt.id;
        const color = isSelected ? '#2563EB' : (CLASSIFICATION_COLORS[pt.classification] || '#64748B');
        const radius = isSelected ? 12 : (pt.score * 8 + 2);
        
        return (
          <CircleMarker
            key={pt.id}
            center={[pt.lat, pt.lng]}
            radius={radius}
            pathOptions={{ 
              fillColor: color, 
              fillOpacity: isSelected ? 0.8 : 0.6,
              color: isSelected ? '#1E40AF' : color,
              weight: isSelected ? 2 : 1
            }}
            eventHandlers={{
              click: () => onSelectRegion(pt.id),
            }}
          >
            <Popup>
              <div style={{ fontSize: '12px' }}>
                <strong>{pt.id}</strong><br/>
                Score: {pt.score?.toFixed(4)}<br/>
                Level: {pt.classification?.toUpperCase()}<br/>
                Lat/Lng: {pt.lat?.toFixed(2)}, {pt.lng?.toFixed(2)}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
