'use client'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { circle: 'w-8 h-8', text: 'text-sm', gap: '-space-x-1' },
  md: { circle: 'w-12 h-12', text: 'text-xl', gap: '-space-x-1.5' },
  lg: { circle: 'w-16 h-16', text: 'text-3xl', gap: '-space-x-2' },
}

export default function Logo({ size = 'md', className = '' }: Props) {
  const s = sizes[size]
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <span className={`inline-flex items-center justify-center ${s.circle} rounded-full bg-blue-500 text-white ${s.text} font-bold shadow-md`}>
        譲
      </span>
      <span className={`inline-flex items-center justify-center ${s.circle} rounded-full bg-pink-500 text-white ${s.text} font-bold shadow-md`}>
        求
      </span>
    </span>
  )
}
