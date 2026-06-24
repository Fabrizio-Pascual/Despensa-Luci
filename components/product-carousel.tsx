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

  // Duplicamos para loop infinito
  const items = [...products, ...products, ...products]

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const speed = 0.5 // px por frame
    const totalWidth = track.scrollWidth / 3 // un tercio porque triplicamos

    const animate = () => {
      if (!paused) {
        posRef.current += speed
        if (posRef.current >= totalWidth) {
          posRef.current = 0
        }
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
      {/* Degradé izquierda */}
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, var(--color-background) 0%, transparent 100%)' }}
      />
      {/* Degradé derecha */}
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--color-background) 0%, transparent 100%)' }}
      />

      {/* Track */}
      <div ref={trackRef} className="flex gap-4 py-4 will-change-transform" style={{ width: 'max-content' }}>
        {items.map((product, i) => (
          <Link
            key={`${product.id}-${i}`}
            href={`/categorias/${product.category?.slug || ''}`}
            className="flex-shrink-0 group"
          >
            <div className="w-44 md:w-52 bg-card rounded-2xl border border-border/60 overflow-hidden shadow-warm transition-all duration-300 group-hover:shadow-warm-lg group-hover:-translate-y-1">
              {/* Imagen */}
              <div className="relative h-36 md:h-40 bg-muted overflow-hidden">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="220px"
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/5">
                    <span className="text-5xl opacity-30">🛒</span>
                  </div>
                )}
                {/* Categoría badge */}
                {product.category && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/50 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {product.category.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{product.name}</p>
                <p className="text-base font-bold text-primary mt-1">{formatPrice(product.price)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}