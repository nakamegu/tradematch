'use client';

import dynamic from 'next/dynamic';

const TradeMap = dynamic(() => import('./TradeMap'), { ssr: false });

interface TradeMapWrapperProps {
  myLat: number;
  myLng: number;
  otherLat: number;
  otherLng: number;
  otherName: string;
}

export default function TradeMapWrapper(props: TradeMapWrapperProps) {
  return <TradeMap {...props} />;
}
