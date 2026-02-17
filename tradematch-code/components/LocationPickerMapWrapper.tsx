'use client';

import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });

interface LocationPickerMapWrapperProps {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPickerMapWrapper(props: LocationPickerMapWrapperProps) {
  return <LocationPickerMap {...props} />;
}
