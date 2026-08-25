import { Metadata } from 'next'
import Link from 'next/link'
import { Heart, ShoppingBag, ArrowLeft, Zap, PackageX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Product } from '@/lib/types'

// Umbral simple para considerar "poco stock" en el aviso de favoritos.
const LOW_STOCK_THRESHOLD = 5

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

  const productIds = products.map((p) => p.id)

  // Ofertas activas (flash sales) sobre productos favoritos, para
  // avisarle al usuario que algo que le interesa está con descuento.
  const { data: flashSales } = productIds.length > 0
    ? await supabase
        .from('flash_sales')
        .select('product_id, discount_percent, ends_at')
        .in('product_id', productIds)
        .eq('is_active', true)
        .gt('ends_at', new Date().toISOString())
    : { data: [] as { product_id: string; discount_percent: number; ends_at: string }[] }

  const onSaleProducts = products.filter((p) => flashSales?.some((f) => f.product_id === p.id))
  const lowStockProducts = products.filter(
    (p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD && !flashSales?.some((f) => f.product_id === p.id)
  )

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
      <section className="container mx-auto px-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-6 w-6 text-primary fill-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Mis Favoritos</h1>
        </div>
        <p className="text-muted-foreground">
          {products.length} producto{products.length !== 1 ? 's' : ''} guardado{products.length !== 1 ? 's' : ''}
        </p>
      </section>

      {/* Avisos sobre favoritos: en oferta o con poco stock */}
      {(onSaleProducts.length > 0 || lowStockProducts.length > 0) && (
        <section className="container mx-auto px-4 mb-8 space-y-3">
          {onSaleProducts.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
                <Zap className="h-5 w-5" fill="currentColor" />
              </span>
              <p className="text-sm text-foreground">
                <strong className="font-semibold">
                  {onSaleProducts.length === 1 ? '¡Un favorito tuyo está en oferta!' : `¡${onSaleProducts.length} favoritos tuyos están en oferta!`}
                </strong>{' '}
                {onSaleProducts.map((p) => p.name).slice(0, 3).join(', ')}
                {onSaleProducts.length > 3 ? ' y más' : ''}. Aprovechá antes de que termine la promo.
              </p>
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <PackageX className="h-5 w-5" />
              </span>
              <p className="text-sm text-foreground">
                <strong className="font-semibold">
                  {lowStockProducts.length === 1 ? 'Queda poco stock de un favorito tuyo' : `Queda poco stock de ${lowStockProducts.length} favoritos tuyos`}
                </strong>{' '}
                — {lowStockProducts.map((p) => p.name).slice(0, 3).join(', ')}
                {lowStockProducts.length > 3 ? ' y más' : ''}. Si lo querés, no te lo pierdas.
              </p>
            </div>
          )}
        </section>
      )}

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