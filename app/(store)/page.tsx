import Link from 'next/link'
import { ArrowRight, ShoppingBag, MapPin, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryCard } from '@/components/category-card'
import { ProductCarousel } from '@/components/product-carousel'
import { HeroImage } from '@/components/hero-image'
import { ReviewsSection } from '@/components/reviews-section'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: categories } = await supabase
    .from('categories').select('*').order('display_order', { ascending: true })

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('is_active', true).gt('stock', 0).limit(24)

  return (
    <div className="pb-16">
      {/* Fondo mesh fijo — atmósfera Midnight Editorial */}
      <div className="mesh-bg" />

      {/* HERO */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-24 container mx-auto px-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative z-10 reveal">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-label-bold mb-8">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Pedidos online · Retiro en local</span>
            </div>
            <h1 className="text-display-lg text-foreground mb-6">
              La despensa de tu barrio, <span className="text-primary">siempre abierta</span>
            </h1>
            <p className="text-body-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
              Calidad premium, calidez de barrio. Hacé tu pedido online y retiralo cuando quieras.
              Los productos más frescos seleccionados para tu mesa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="rounded-xl px-8 h-auto py-4 text-label-bold shadow-lg shadow-primary/20">
                <Link href="#categorias">Ver productos <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-xl px-8 h-auto py-4 text-label-bold border-2">
                <Link href={user ? '/como-comprar' : '/auth/login'}>{user ? 'Conocenos' : 'Ingresar'}</Link>
              </Button>
            </div>
          </div>

          <div className="relative h-[320px] md:h-[500px] flex items-center justify-center reveal" style={{ animationDelay: '150ms' }}>
            <div className="absolute inset-0 rounded-[40px] overflow-hidden border border-border/40 shadow-2xl">
              <HeroImage />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
            </div>

            <div className="absolute -top-4 -right-4 glass p-6 rounded-3xl shadow-xl floating-card">
              <span className="text-primary text-display-lg block leading-none">24hs</span>
              <span className="text-muted-foreground text-label-bold text-sm">Abierto Siempre</span>
            </div>
            <div className="absolute -bottom-8 -left-4 md:-left-8 glass p-5 rounded-3xl shadow-xl floating-card" style={{ animationDelay: '-3s' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-foreground font-bold text-xl block leading-none">{products?.length || 0}+</span>
                  <span className="text-muted-foreground text-label-sm uppercase">Productos Premium</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section id="categorias" className="container mx-auto px-4 py-16 md:py-20">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6 reveal">
          <div>
            <span className="text-primary text-label-bold uppercase tracking-widest block mb-3">Explorá</span>
            <h2 className="text-headline-md text-foreground">Categorías Destacadas</h2>
          </div>
          <Button variant="ghost" asChild className="hidden md:flex text-muted-foreground hover:text-primary">
            <Link href="/categorias">Ver todas <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        {categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal-sequential">
            {categories.slice(0, 8).map((cat) => <CategoryCard key={cat.id} category={cat} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">🛒</p>
            <p>Pronto vas a ver nuestros productos acá.</p>
          </div>
        )}
        <div className="mt-6 md:hidden">
          <Button variant="outline" className="w-full rounded-xl" asChild>
            <Link href="/categorias">Ver todas las categorías <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* PRODUCTOS DESTACADOS */}
      {products && products.length > 0 && (
        <section className="py-16 md:py-20 bg-card/40 backdrop-blur-sm border-y border-border/40">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center reveal">
              <h2 className="text-headline-md text-foreground mb-4">Los más pedidos</h2>
              <div className="h-1.5 w-20 bg-primary mx-auto rounded-full" />
            </div>
            <ProductCarousel products={products as any} />
          </div>
        </section>
      )}

      {/* RESEÑAS — componente client que carga desde Supabase */}
      <ReviewsSection />

      {/* UBICACIÓN — Villa San Nicolás, Malagueño */}
      <section className="py-16 md:py-20 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 rounded-[32px] overflow-hidden h-72 md:h-[400px] border border-border/40 shadow-2xl grayscale hover:grayscale-0 premium-transition duration-700">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3a!2d-64.4549122429774!3d-31.434700519515722!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDI2JzA0LjkiUyA2NMKwMjcnMTcuNyJX!5e0!3m2!1ses!2sar!4v1"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-primary text-label-bold uppercase tracking-widest block mb-3">Dónde estamos</span>
              <h2 className="text-headline-md text-foreground mb-6">Encontranos en el barrio</h2>
              <p className="text-body-lg text-muted-foreground mb-8 leading-relaxed">
                Abiertos todos los días para vos 🧡
              </p>
              <div className="space-y-6">
                <div className="flex gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-card border border-border/40 flex items-center justify-center text-primary group-hover:scale-110 premium-transition shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Dirección</h4>
                    <p className="text-muted-foreground">Segundo Dutari Rodríguez 746, Villa San Nicolás, Malagueño, Córdoba</p>
                  </div>
                </div>
                <div className="flex gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-card border border-border/40 flex items-center justify-center text-primary group-hover:scale-110 premium-transition shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Horarios</h4>
                    <p className="text-muted-foreground">Todos los días, abierto siempre</p>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-xl gap-2 mt-8">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=-31.434700519515722,-64.4549122429774"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  Cómo llegar
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — solo si no está logueado */}
      {!user && (
        <section className="container mx-auto px-4 pt-16">
          <div className="relative overflow-hidden rounded-[32px] bg-primary px-8 py-12 md:px-14 md:py-16 text-center shadow-2xl shadow-primary/20">
            <div className="relative z-10">
              <h2 className="text-headline-md text-primary-foreground">¿Primera vez acá?</h2>
              <p className="mt-3 text-primary-foreground/85 max-w-md mx-auto text-body-lg leading-relaxed">
                Creá tu cuenta gratis y hacé tu primer pedido en minutos.
              </p>
              <Button size="lg" className="mt-8 rounded-xl px-10 bg-white text-primary hover:bg-white/90 shadow-md font-semibold" asChild>
                <Link href="/auth/sign-up">Crear cuenta gratis</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
