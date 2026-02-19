'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { ImageCrop } from '@/lib/supabase'

type Props = {
  imageUrl: string
  initialCrop?: ImageCrop | null
  onCropChange: (crop: ImageCrop | null) => void
}

export default function ImageCropper({ imageUrl, initialCrop, onCropChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [imgError, setImgError] = useState(false)

  // Initialize from initialCrop
  useEffect(() => {
    if (initialCrop && naturalSize && imgRef.current) {
      const img = imgRef.current
      const displayW = img.clientWidth
      const displayH = img.clientHeight
      const scaleX = displayW / naturalSize.w
      const scaleY = displayH / naturalSize.h
      setRect({
        x: initialCrop.x * scaleX,
        y: initialCrop.y * scaleY,
        w: initialCrop.width * scaleX,
        h: initialCrop.height * scaleY,
      })
    }
  }, [initialCrop, naturalSize])

  const handleImageLoad = () => {
    const img = imgRef.current
    if (img) {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      setImgError(false)
    }
  }

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    const bounds = container.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(0, Math.min(clientX - bounds.left, bounds.width)),
      y: Math.max(0, Math.min(clientY - bounds.top, bounds.height)),
    }
  }, [])

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    setDragging(true)
    setStartPos(pos)
    setRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
  }, [getPos])

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return
    e.preventDefault()
    const pos = getPos(e)
    setRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    })
  }, [dragging, startPos, getPos])

  const handleEnd = useCallback(() => {
    setDragging(false)
    if (!rect || !naturalSize || !imgRef.current) return
    if (rect.w < 10 || rect.h < 10) {
      setRect(null)
      onCropChange(null)
      return
    }
    const img = imgRef.current
    const displayW = img.clientWidth
    const displayH = img.clientHeight
    const scaleX = naturalSize.w / displayW
    const scaleY = naturalSize.h / displayH
    onCropChange({
      x: Math.round(rect.x * scaleX),
      y: Math.round(rect.y * scaleY),
      width: Math.round(rect.w * scaleX),
      height: Math.round(rect.h * scaleY),
      naturalWidth: naturalSize.w,
      naturalHeight: naturalSize.h,
    })
  }, [rect, naturalSize, onCropChange])

  const clearCrop = () => {
    setRect(null)
    onCropChange(null)
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative inline-block select-none touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={() => { if (dragging) handleEnd() }}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="切り抜き元"
          onLoad={handleImageLoad}
          onError={() => setImgError(true)}
          className="max-w-full max-h-[400px] rounded-lg"
        />
        {imgError && (
          <p className="text-red-500 text-sm mt-1">画像を読み込めませんでした</p>
        )}
        {/* Overlay */}
        {rect && rect.w > 0 && rect.h > 0 && (
          <>
            {/* Dark overlay outside selection */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            {/* Clear selection area */}
            <div
              className="absolute border-2 border-white pointer-events-none"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                background: 'transparent',
              }}
            />
            {/* Selection box on top of overlay */}
            <div
              className="absolute border-2 border-dashed border-indigo-400 pointer-events-none"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
              }}
            />
          </>
        )}
      </div>

      {rect && rect.w > 0 && rect.h > 0 && (
        <div className="flex items-center gap-3">
          <div className="bg-slate-200 rounded-lg overflow-hidden" style={{ width: 80, height: 80 }}>
            {naturalSize && (
              <div
                style={{
                  width: 80,
                  height: 80,
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: `${(naturalSize.w / (rect.w * (naturalSize.w / (imgRef.current?.clientWidth || 1)))) * 80}px ${(naturalSize.h / (rect.h * (naturalSize.h / (imgRef.current?.clientHeight || 1)))) * 80}px`,
                  backgroundPosition: `-${(rect.x / (imgRef.current?.clientWidth || 1)) * naturalSize.w / (rect.w * (naturalSize.w / (imgRef.current?.clientWidth || 1))) * 80}px -${(rect.y / (imgRef.current?.clientHeight || 1)) * naturalSize.h / (rect.h * (naturalSize.h / (imgRef.current?.clientHeight || 1))) * 80}px`,
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={clearCrop}
            className="text-sm text-red-500 hover:text-red-400"
          >
            切り抜きをクリア
          </button>
        </div>
      )}
    </div>
  )
}
