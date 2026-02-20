'use client';

import dynamic from 'next/dynamic';

const VenueAreaMap = dynamic(() => import('./VenueAreaMap'), { ssr: false });

interface VenueArea {
  lat: number;
  lng: number;
  radiusKm: number;
}

interface VenueAreaMapWrapperProps {
  myLat: number;
  myLng: number;
  venues: VenueArea[];
}

export default function VenueAreaMapWrapper(props: VenueAreaMapWrapperProps) {
  return <VenueAreaMap {...props} />;
}
