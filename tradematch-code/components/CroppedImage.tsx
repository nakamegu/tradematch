'use client'

import type { ImageCrop } from '@/lib/supabase'

type Props = {
  src: string
  crop?: ImageCrop | null
  alt: string
  className?: string
}

export default function CroppedImage({ src, crop, alt, className = '' }: Props) {
  if (!crop) {
    return <img src={src} alt={alt} className={className} />
  }

  // background-size scales the full image so the crop region fills the container
  const bgW = (crop.naturalWidth / crop.width) * 100
  const bgH = (crop.naturalHeight / crop.height) * 100

  // CSS percentage background-position formula:
  // actual_offset = (container_size - bg_size) * (percent / 100)
  // We need offset = -crop.x * (container_size / crop.width)
  // Solving: percent = crop.x / (naturalWidth - crop.width) * 100
  const posX = crop.naturalWidth === crop.width ? 0 : (crop.x / (crop.naturalWidth - crop.width)) * 100
  const posY = crop.naturalHeight === crop.height ? 0 : (crop.y / (crop.naturalHeight - crop.height)) * 100

  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: `${bgW}% ${bgH}%`,
        backgroundPosition: `${posX}% ${posY}%`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
