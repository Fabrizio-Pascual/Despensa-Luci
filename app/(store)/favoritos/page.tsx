import { Metadata } from 'next'
import Link from 'next/link'
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Product } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Mis Favoritos | Despensa Luci',
  description: 'Ve tus productos favoritos guardados'
}

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: favorites } = await supabase
    .from('user_favorites')
    .select('product:products(*, category:categories(name, slug))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const products: Product[] = (
    (favorites || [])
      .map((f: any) => f.product)
      .filter(Boolean)
  ) as Product[]

  return (
    <div className="pb-20 md:pb-8">
      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { label: 'Favoritos', href: '/favoritos', current: true }
          ]}
        />
      </div>

      {/* Header */}
      <section className="container mx-auto px-4 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-6 w-6 text-primary fill-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Mis Favoritos</h1>
        </div>
        <p className="text-muted-foreground">
          {products.length} producto{products.length !== 1 ? 's' : ''} guardado{products.length !== 1 ? 's' : ''}
        </p>
      </section>

      {/* Contenido */}
      {products.length === 0 ? (
        <section className="container mx-auto px-4">
          <div className="glass rounded-lg border border-border p-12 text-center">
            <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sin favoritos aún</h2>
            <p className="text-muted-foreground mb-6">
              Agrega productos a favoritos para encontrarlos fácilmente más tarde
            </p>
            <Button asChild>
              <Link href="/categorias" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Ver Productos
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      {products.length > 0 && (
        <section className="container mx-auto px-4 mt-12">
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/categorias" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Seguir Comprando
            </Link>
          </Button>
        </section>
      )}
    </div>
  )
}