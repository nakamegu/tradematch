'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in webpack/next.js
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

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface TradeMapProps {
  myLat: number;
  myLng: number;
  otherLat: number;
  otherLng: number;
  otherName: string;
}

function FitBounds({ myLat, myLng, otherLat, otherLng }: { myLat: number; myLng: number; otherLat: number; otherLng: number }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(
      [myLat, myLng],
      [otherLat, otherLng]
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  }, [map, myLat, myLng, otherLat, otherLng]);

  return null;
}

export default function TradeMap({ myLat, myLng, otherLat, otherLng, otherName }: TradeMapProps) {
  const center: [number, number] = [(myLat + otherLat) / 2, (myLng + otherLng) / 2];

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[myLat, myLng]} icon={blueIcon}>
        <Popup>あなた</Popup>
      </Marker>
      <Marker position={[otherLat, otherLng]} icon={redIcon}>
        <Popup>{otherName}</Popup>
      </Marker>
      <FitBounds myLat={myLat} myLng={myLng} otherLat={otherLat} otherLng={otherLng} />
    </MapContainer>
  );
}
