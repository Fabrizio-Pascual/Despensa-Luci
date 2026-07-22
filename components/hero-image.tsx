'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1645567454567-901dc409551b?q=80&w=1600&auto=format&fit=crop'

export function HeroImage() {
  const [opacity, setOpacity] = useState(1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const el = wrapperRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      // Cuando el elemento sale de la vista hacia arriba, se va desvaneciendo.
      const fadeDistance = rect.height * 0.9 || 400
      const hiddenBy = -rect.top
      const next = 1 - Math.min(Math.max(hiddenBy / fadeDistance, 0), 1)
      setOpacity(next)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute inset-0 -z-0 hidden md:block transition-opacity duration-300 ease-out"
      style={{ opacity }}
    >
      <div className="absolute right-0 top-0 h-full w-[52%]">
        <Image
          src={HERO_IMAGE_URL}
          alt=""
          fill
          priority
          className="object-cover"
          unoptimized
        />
        {/* Degradados que difuminan los bordes de la imagen para que se mezcle con el fondo, sin cortes bruscos */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to left, transparent 45%, var(--color-background) 100%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, var(--color-background) 0%, transparent 25%, transparent 75%, var(--color-background) 100%)' }}
        />
      </div>
    </div>
  )
}
