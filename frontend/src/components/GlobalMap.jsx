import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { fetchClimateStream } from '../utils/api';
import 'leaflet/dist/leaflet.css';

export default function GlobalMap() {
  const [data, setData] = useState([]);
  const [highestAlert, setHighestAlert] = useState(null);

  const loadStream = async () => {
    try {
      const res = await fetchClimateStream();
      if (res && res.stream) {
        setData(res.stream);
        const highest = [...res.stream].sort((a,b)=>b.score - a.score)[0];
        setHighestAlert(highest);
      }
    } catch(e) {
      console.error("Failed to load stream", e);
    }
  };

  useEffect(() => {
    loadStream();
    const interval = setInterval(loadStream, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="map" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <MapContainer 
        bounds={[[5, 60], [55, 145]]} 
        zoomSnap={0.1}
        style={{ height: '100%', width: '100%', background: '#0e0e0e' }} 
        zoomControl={false}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          noWrap={true}
        />
        {data.map((pt, i) => (
          <CircleMarker
            key={i}
            center={[pt.lat, pt.lon]}
            radius={pt.score > 70 ? 12 : 8}
            pathOptions={{ fillColor: pt.color, color: pt.color, fillOpacity: 0.7 }}
            className={pt.score > 70 ? 'pulse' : ''}
          >
            <Popup>
              <div style={{color: '#333'}}>
                <strong>{pt.city}</strong><br/>
                Temp: {pt.temperature}°C<br/>
                Score: {pt.score}/100<br/>
                Alert: {pt.anomaly_type}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {highestAlert && (
        <div className="glass-card" style={{ position: 'absolute', bottom: '30px', left: '30px', zIndex: 1000, background: 'rgba(10,15,30,0.9)', borderLeft: `4px solid ${highestAlert.color}`, padding: '15px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Current Highest Alert</h4>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '5px' }}>{highestAlert.city}</div>
          <div style={{ color: highestAlert.color }}>{highestAlert.anomaly_type} (Score: {highestAlert.score})</div>
        </div>
      )}
    </div>
  );
}
