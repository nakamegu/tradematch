'use client';

import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationPickerMapProps {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [map, lat, lng]);
  return null;
}

export default function LocationPickerMap({ lat, lng, radiusKm, onChange }: LocationPickerMapProps) {
  const center: [number, number] = lat != null && lng != null
    ? [lat, lng]
    : [35.6812, 139.7671]; // Default: Tokyo

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '250px', width: '100%', borderRadius: '8px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onChange={onChange} />
      {lat != null && lng != null && (
        <>
          <Marker position={[lat, lng]} />
          {radiusKm != null && radiusKm > 0 && (
            <Circle
              center={[lat, lng]}
              radius={radiusKm * 1000}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15 }}
            />
          )}
          <RecenterMap lat={lat} lng={lng} />
        </>
      )}
    </MapContainer>
  );
}
