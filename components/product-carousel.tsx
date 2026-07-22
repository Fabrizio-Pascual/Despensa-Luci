'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/types'

interface ProductCarouselProps {
  products: (Product & { category?: { name: string; slug: string } })[]
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price)
}

export function ProductCarousel({ products }: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const posRef = useRef(0)
  const rafRef = useRef<number>(0)

  const items = [...products, ...products, ...products]

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const speed = 0.45
    const totalWidth = track.scrollWidth / 3

    const animate = () => {
      if (!paused) {
        posRef.current += speed
        if (posRef.current >= totalWidth) posRef.current = 0
        track.style.transform = `translateX(-${posRef.current}px)`
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused])

  if (!products.length) return null

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, var(--color-background) 0%, transparent 100%)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--color-background) 0%, transparent 100%)' }} />

      <div ref={trackRef} className="flex gap-5 py-5 will-change-transform" style={{ width: 'max-content' }}>
        {items.map((product, i) => (
          <Link
            key={`${product.id}-${i}`}
            href={`/categorias/${product.category?.slug || ''}`}
            className="flex-shrink-0 group"
          >
            <div className="relative w-48 md:w-56 rounded-3xl overflow-hidden bg-card border border-border shadow-warm transition-all duration-300 group-hover:shadow-warm-lg group-hover:-translate-y-1.5">
              {/* Imagen */}
              <div className="relative h-40 md:h-44 bg-muted overflow-hidden">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="230px"
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/5">
                    <span className="text-5xl opacity-30">🛒</span>
                  </div>
                )}
                {/* Overlay degradado sutil */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                {product.category && (
                  <div className="absolute top-2.5 left-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/55 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/10">
                      {product.category.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3.5">
                <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{product.name}</p>
                <p className="text-base font-bold text-gradient mt-1.5">{formatPrice(product.price)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}