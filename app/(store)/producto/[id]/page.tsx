
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { ProductBuyBox } from '@/components/product-buy-box'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: product } = await supabase.from('products').select('name, description').eq('id', id).single()
  if (!product) return { title: 'Producto no encontrado' }
  return { title: `${product.name} - Despensa Luci`, description: product.description || undefined }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('id', id)
    .single()

  if (!product) notFound()

  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .eq('is_active', true)
    .order('display_order')

  const { data: related } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', id)
    .limit(4)

  return (
    <div className="pb-16">
      <div className="mesh-bg" />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: 'Categorías', href: '/categorias' },
            ...(product.category?.name
              ? [{ label: product.category.name, href: `/categorias/${product.category.slug}` }]
              : []),
            { label: product.name, href: '#', current: true },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ProductBuyBox product={product} variants={variants || []} />
        </div>

        <div className="flex items-center gap-3 mt-6 p-4 rounded-2xl bg-card border border-border/40 max-w-2xl">
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            Retirá tu pedido en Segundo Dutari Rodríguez 746, Villa San Nicolás, Malagueño.
          </p>
        </div>

        {/* Relacionados */}
        {related && related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-headline-md text-foreground">También te puede interesar</h2>
              {product.category?.slug && (
                <Link href={`/categorias/${product.category.slug}`} className="text-muted-foreground hover:text-primary premium-transition text-sm hidden md:block">
                  Ver categoría completa →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((p) => <ProductCard key={p.id} product={p as any} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
