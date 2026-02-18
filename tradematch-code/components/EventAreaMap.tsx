'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface AreaCircle {
  lat: number;
  lng: number;
  radiusKm: number;
}

interface EventAreaMapProps {
  areas: AreaCircle[];
}

function DrawAreas({ areas }: { areas: AreaCircle[] }) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];

    for (const area of areas) {
      const marker = L.marker([area.lat, area.lng]).addTo(map);
      layers.push(marker);

      if (area.radiusKm > 0) {
        const circle = L.circle([area.lat, area.lng], {
          radius: area.radiusKm * 1000,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
        }).addTo(map);
        layers.push(circle);
      }
    }

    // Fit bounds to all layers
    if (layers.length > 0) {
      const group = L.featureGroup(layers);
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }

    return () => {
      layers.forEach(l => map.removeLayer(l));
    };
  }, [map, areas]);

  return null;
}

export default function EventAreaMap({ areas }: EventAreaMapProps) {
  if (areas.length === 0) return null;

  const center: [number, number] = [areas[0].lat, areas[0].lng];

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '180px', width: '100%', borderRadius: '8px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DrawAreas areas={areas} />
    </MapContainer>
  );
}
