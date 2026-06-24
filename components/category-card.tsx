import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBasket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
        <CardContent className="p-0">
          <div className="relative aspect-[4/3] bg-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={category.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-secondary">
                <ShoppingBasket className="h-16 w-16 text-secondary-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-lg font-semibold text-white">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-white/80 line-clamp-1">{category.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
