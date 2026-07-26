
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Package, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'
import { AddToCartPanel } from '@/components/add-to-cart-panel'
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/categorias"><ArrowLeft className="mr-2 h-4 w-4" />Categorías</Link>
          </Button>
          {product.category?.name && (
            <>
              <span>/</span>
              <Link href={`/categorias/${product.category.slug}`} className="hover:text-primary premium-transition">
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Imagen principal */}
          <div className="relative aspect-square rounded-[24px] overflow-hidden bg-card border border-border/40">
            {product.image_url ? (
              <Image src={product.image_url} alt={product.name} fill className="object-contain p-8" unoptimized />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Package className="h-20 w-20 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Info + acciones (client, por el carrito) */}
          <div>
            {product.category?.name && (
              <span className="inline-block bg-primary/10 text-primary text-label-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                {product.category.name}
              </span>
            )}
            <h1 className="text-display-lg text-foreground mb-3">{product.name}</h1>
            {product.description && (
              <p className="text-body-lg text-muted-foreground leading-relaxed mb-6">{product.description}</p>
            )}

            <AddToCartPanel product={product} variants={variants || []} />

            <div className="flex items-center gap-3 mt-6 p-4 rounded-2xl bg-card border border-border/40">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">
                Retirá tu pedido en Segundo Dutari Rodríguez 746, Villa San Nicolás, Malagueño.
              </p>
            </div>
          </div>
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
