'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface VenueArea {
  lat: number;
  lng: number;
  radiusKm: number;
}

interface VenueAreaMapProps {
  myLat: number;
  myLng: number;
  venues: VenueArea[];
}

function FitAll({ myLat, myLng, venues }: VenueAreaMapProps) {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLng[] = [L.latLng(myLat, myLng)];
    for (const v of venues) {
      // Include the circle edges in bounds
      const radiusM = v.radiusKm * 1000;
      const center = L.latLng(v.lat, v.lng);
      points.push(center);
      // Extend bounds by the circle radius
      const circleBounds = center.toBounds(radiusM * 2);
      points.push(circleBounds.getNorthEast());
      points.push(circleBounds.getSouthWest());
    }
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }, [map, myLat, myLng, venues]);

  return null;
}

export default function VenueAreaMap({ myLat, myLng, venues }: VenueAreaMapProps) {
  const center: [number, number] = venues.length > 0
    ? [(myLat + venues[0].lat) / 2, (myLng + venues[0].lng) / 2]
    : [myLat, myLng];

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      scrollWheelZoom={false}
      dragging={true}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[myLat, myLng]} icon={blueIcon}>
        <Popup>あなたの現在地</Popup>
      </Marker>
      {venues.map((v, i) => (
        <Circle
          key={i}
          center={[v.lat, v.lng]}
          radius={v.radiusKm * 1000}
          pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.15, weight: 2 }}
        />
      ))}
      <FitAll myLat={myLat} myLng={myLng} venues={venues} />
    </MapContainer>
  );
}
