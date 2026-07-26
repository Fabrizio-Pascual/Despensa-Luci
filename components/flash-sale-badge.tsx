'use client'

import { Zap } from 'lucide-react'

interface FlashSaleBadgeProps {
  discountPercent: number
  className?: string
}

export function FlashSaleBadge({ discountPercent, className }: FlashSaleBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-md ${className ?? ''}`}
    >
      <Zap className="h-3 w-3" fill="currentColor" />
      <span>-{discountPercent}%</span>
    </div>
  )
}
