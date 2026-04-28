import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, HeatmapLayerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { generateDemoGridData } from '../demoData.js';

const libraries = ['visualization'];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '24px',
  overflow: 'hidden',
};

// India center and bounds
const indianaBounds = {
  north: 35.5,
  south: 8.4,
  east: 97.25,
  west: 68.7,
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const defaultZoom = 5;

function makeMarkerIcon(color) {
  const fill = color || '#ff4757';
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
        <path fill="${fill}" stroke="white" stroke-width="1.5" d="M18 2C11.4 2 6 7.4 6 14c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"/>
        <circle cx="18" cy="14" r="4.5" fill="white"/>
      </svg>
    `)}`,
    scaledSize: new window.google.maps.Size(30, 30),
    anchor: new window.google.maps.Point(15, 30),
  };
}

export default function GoogleLiveMap({ gridData, anomalies, latestAlert, onPointSelect }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const markerRefs = useRef([]);
  const [activePoint, setActivePoint] = useState(null);

  const getLng = (point) => point?.lng ?? point?.lon ?? 0;
  const getLat = (point) => point?.lat ?? 0;

  const liveGrid = useMemo(() => gridData || generateDemoGridData(), [gridData]);
  const markerPoints = useMemo(() => {
    const points = anomalies?.length ? anomalies : liveGrid.anomalies || [];
    // Filter to India-only markers
    return points.filter((p) => {
      const lat = getLat(p);
      const lng = getLng(p);
      return lat >= indianaBounds.south && lat <= indianaBounds.north && lng >= indianaBounds.west && lng <= indianaBounds.east;
    });
  }, [anomalies, liveGrid]);

  const googleMaps = isLoaded ? window.google?.maps : null;
  const heatmapPoints = useMemo(() => {
    if (!googleMaps) return [];
    return (liveGrid.heatmapData || []).map((p) => ({
      location: new googleMaps.LatLng(p.lat, p.lng),
      weight: Math.max(0.5, Math.abs(p.zScore || 0)),
    }));
  }, [liveGrid, googleMaps]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    // Initialize/update marker clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    if (markerPoints.length > 0) {
      const markers = markerPoints.map((point, index) => {
        const marker = new window.google.maps.Marker({
          position: { lat: getLat(point), lng: getLng(point) },
          icon: makeMarkerIcon(point.color),
          map: null, // Will be managed by clusterer
          title: point.city || `${getLat(point).toFixed(2)}°, ${getLng(point).toFixed(2)}°`,
        });

        marker.addListener('click', () => {
          setActivePoint(point);
          onPointSelect?.(point);
        });

        return marker;
      });

      markerRefs.current = markers;

      if (!clustererRef.current) {
        clustererRef.current = new MarkerClusterer({
          map: mapRef.current,
          markers,
        });
      } else {
        clustererRef.current.addMarkers(markers);
      }
    }

    // Fit to India bounds
    const bounds = new window.google.maps.LatLngBounds(
      { lat: indianaBounds.south, lng: indianaBounds.west },
      { lat: indianaBounds.north, lng: indianaBounds.east }
    );
    mapRef.current.fitBounds(bounds, 64);
  }, [markerPoints]);

  useEffect(() => {
    if (latestAlert) {
      setActivePoint(latestAlert);
    }
  }, [latestAlert]);

  if (!apiKey) {
    return (
      <div className="map-container" style={{ display: 'grid', placeItems: 'center', color: 'white' }}>
        Google Maps key is missing.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="map-container" style={{ display: 'grid', placeItems: 'center', color: 'white' }}>
        Google Maps failed to load.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-container" style={{ display: 'grid', placeItems: 'center', color: 'white' }}>
        Loading Google Maps…
      </div>
    );
  }

  return (
    <div className="map-container" id="anomaly-map">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={defaultZoom}
        options={{
          mapTypeId: 'satellite',
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          backgroundColor: '#080c14',
          restriction: {
            latLngBounds: indianaBounds,
            strictBounds: false,
          },
        }}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {heatmapPoints.length > 0 && (
          <HeatmapLayerF
            data={heatmapPoints}
            options={{
              radius: 24,
              opacity: 0.75,
              dissipating: true,
              gradient: ['rgba(46, 213, 115, 0)', '#2ed573', '#ffd32a', '#ffa502', '#ff4757'],
            }}
          />
        )}

        {markerPoints.length === 0 && (
          <MarkerF position={defaultCenter} title="India Center" />
        )}

        {activePoint && (
          <InfoWindowF
            position={{ lat: getLat(activePoint), lng: getLng(activePoint) }}
            onCloseClick={() => setActivePoint(null)}
          >
            <div style={{ color: '#111827', minWidth: 200 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {activePoint.city || `${getLat(activePoint).toFixed(2)}°, ${getLng(activePoint).toFixed(2)}°`}
              </div>
              <div>Variable: {activePoint.variable || liveGrid.variable || 'T2M'}</div>
              <div>Severity: {activePoint.severity || 'Live'}</div>
              <div>Z-Score: {Number(activePoint.zScore || 0).toFixed(2)}</div>
              {typeof activePoint.currentValue !== 'undefined' && (
                <div>Value: {Number(activePoint.currentValue).toFixed(1)}</div>
              )}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      <div className="map-overlay-badge">
        <span className="map-overlay-count">{liveGrid.anomalyCount || 0}</span>
        <span className="map-overlay-label">live anomalies</span>
      </div>
    </div>
  );
}