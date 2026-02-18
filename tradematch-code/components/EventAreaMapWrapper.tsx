'use client';

import dynamic from 'next/dynamic';

const EventAreaMap = dynamic(() => import('./EventAreaMap'), { ssr: false });

interface AreaCircle {
  lat: number;
  lng: number;
  radiusKm: number;
}

interface EventAreaMapWrapperProps {
  areas: AreaCircle[];
}

export default function EventAreaMapWrapper(props: EventAreaMapWrapperProps) {
  return <EventAreaMap {...props} />;
}
