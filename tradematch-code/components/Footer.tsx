'use client'

import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  return (
    <div className="mt-6 flex justify-center gap-4">
      {pathname !== '/guide' && (
        <a href="/guide" className="text-indigo-400 text-xs font-semibold hover:text-indigo-300">
          使い方ガイド
        </a>
      )}
      {pathname !== '/privacy' && (
        <a href="/privacy" className="text-slate-400 text-xs hover:text-slate-300">
          データの取り扱い
        </a>
      )}
    </div>
  )
}
