import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBasket } from 'lucide-react'
import type { Category } from '@/lib/types'

// Category icons mapping
const categoryIcons: Record<string, string> = {
  gaseosas: '/images/categories/gaseosas.jpg',
  lacteos: '/images/categories/lacteos.jpg',
  cigarrillos: '/images/categories/cigarrillos.jpg',
  pastas: '/images/categories/pastas.jpg',
  galletas: '/images/categories/galletas.jpg',
  alfajores: '/images/categories/alfajores.jpg',
  fiambres: '/images/categories/fiambres.jpg',
  copetin: '/images/categories/copetin.jpg',
  limpieza: '/images/categories/limpieza.jpg',
  papel: '/images/categories/papel.jpg',
}

interface CategoryCardProps {
  category: Category
}

export function CategoryCard({ category }: CategoryCardProps) {
  const imageUrl = category.image_url || categoryIcons[category.slug]

  return (
    <Link href={`/categorias/${category.slug}`}>
      <div className="group relative h-80 rounded-[24px] overflow-hidden border border-border/40 card-hover cursor-pointer">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={category.name}
            fill
            className="object-cover premium-transition group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-secondary">
            <ShoppingBasket className="h-16 w-16 text-secondary-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent premium-transition" />
        <div className="absolute bottom-0 left-0 p-6">
          <h3 className="text-headline-sm text-foreground mb-2">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{category.description}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
