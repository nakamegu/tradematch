'use client';

import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

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
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const center: [number, number] = lat != null && lng != null
    ? [lat, lng]
    : [35.6812, 139.7671]; // Default: Tokyo

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const url = 'https://nominatim.openstreetmap.org/search?'
        + new URLSearchParams({ format: 'json', q, limit: '1', 'accept-language': 'ja' });
      const res = await fetch(url);
      if (!res.ok) {
        alert('検索に失敗しました');
        return;
      }
      const data = await res.json();
      if (data.length > 0) {
        onChange(parseFloat(data[0].lat), parseFloat(data[0].lon));
      } else {
        alert('見つかりませんでした');
      }
    } catch {
      alert('検索中にエラーが発生しました');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder="住所・施設名で検索"
          className="flex-1 px-3 py-1.5 border rounded-md text-sm"
          disabled={searching}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
        >
          <Search size={14} />
          検索
        </button>
      </div>
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
    </div>
  );
}
