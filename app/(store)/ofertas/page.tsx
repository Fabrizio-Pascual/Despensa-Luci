import { Metadata } from 'next'
import Link from 'next/link'
import { Zap, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { FlashSaleBadge } from '@/components/flash-sale-badge'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Ofertas | Despensa Luci',
  description: 'Descuentos y ofertas especiales en nuestros productos'
}

export const revalidate = 300 // Revalidar cada 5 minutos

export default async function OffersPage() {
  const supabase = await createClient()

  // Obtener ofertas activas
  const { data: activeSales } = await supabase
    .from('active_flash_sales_view')
    .select('*')
    .order('discount_percent', { ascending: false })

  // Obtener productos en oferta
  const productIds = activeSales?.map(sale => sale.product_id) || []
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .in('id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000'])

  // Crear mapa de sales por producto
  const salesMap = new Map(
    activeSales?.map(sale => [sale.product_id, sale]) || []
  )

  const productsOnSale = products?.map(product => ({
    ...product,
    flashSale: salesMap.get(product.id)
  })) || []

  return (
    <div className="pb-20 md:pb-8">
      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { label: 'Ofertas', href: '/ofertas', current: true }
          ]}
        />
      </div>

      {/* Header con animación */}
      <section className="container mx-auto px-4 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 mb-4">
          <Zap className="h-4 w-4 text-red-500" fill="currentColor" />
          <span className="text-sm font-semibold text-red-600">OFERTAS LIMITADAS</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          ¡Descuentos Especiales Ahora!
        </h1>
        <p className="text-muted-foreground">
          {productsOnSale.length} producto{productsOnSale.length !== 1 ? 's' : ''} en oferta
        </p>
      </section>

      {/* Contenido */}
      {productsOnSale.length === 0 ? (
        <section className="container mx-auto px-4">
          <div className="glass rounded-lg border border-border p-12 text-center">
            <Zap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sin ofertas activas</h2>
            <p className="text-muted-foreground mb-6">
              Vuelve pronto para ver nuestras ofertas especiales
            </p>
            <Button asChild>
              <Link href="/categorias" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Ver Todos los Productos
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {productsOnSale.map((product) => (
              <div key={product.id} className="relative">
                {/* Badge de descuento */}
                {product.flashSale && (
                  <div className="absolute top-2 left-2 z-10">
                    <FlashSaleBadge
                      discountPercent={product.flashSale.discount_percent}
                    />
                  </div>
                )}
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      {productsOnSale.length > 0 && (
        <section className="container mx-auto px-4 mt-12">
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/categorias" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Ver Más Productos
            </Link>
          </Button>
        </section>
      )}
    </div>
  )
}