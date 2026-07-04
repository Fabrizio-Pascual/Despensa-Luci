import Link from 'next/link'
import { ArrowRight, ShoppingBag, Clock, Sparkles, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryCard } from '@/components/category-card'
import { ProductCarousel } from '@/components/product-carousel'
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

      {/* HERO */}
      <section className="bg-warm-gradient relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Pedidos online · Retiro en local</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.1] text-foreground">
                La despensa<br />
                <span className="text-primary">de tu barrio,</span><br />
                siempre abierta
              </h1>
              <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                Elegí tus productos, hacé el pedido y retiralo cuando quieras. Sin filas, sin apuros.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Button size="lg" asChild className="rounded-full px-8 shadow-warm-lg">
                  <Link href="#categorias">Ver productos <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                {!user && (
                  <Button size="lg" variant="outline" asChild className="rounded-full px-8">
                    <Link href="/auth/login">Ingresar</Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden md:grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-card/80 backdrop-blur rounded-2xl p-6 shadow-warm border border-border/60 col-span-2">
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Abierto 24hs</p>
                <p className="text-2xl font-bold text-foreground">Hacé tu pedido</p>
                <p className="text-sm text-muted-foreground mt-1">cuando quieras, desde donde estés</p>
              </div>
              <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
                <p className="text-3xl font-bold text-primary">{categories?.length || 0}</p>
                <p className="text-sm font-medium text-foreground mt-1">Categorías</p>
                <p className="text-xs text-muted-foreground">de productos</p>
              </div>
              <div className="bg-card/80 backdrop-blur rounded-2xl p-5 shadow-warm border border-border/60">
                <p className="text-3xl font-bold text-foreground">{products?.length || 0}+</p>
                <p className="text-sm font-medium text-foreground mt-1">Productos</p>
                <p className="text-xs text-muted-foreground">disponibles hoy</p>
              </div>
            </div>
          </div>
        </div>

        {products && products.length > 0 && (
          <div className="pb-8">
            <ProductCarousel products={products as any} />
          </div>
        )}
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <ShoppingBag className="h-5 w-5 text-primary" />, step: 'Paso 1', title: 'Elegí y pedí', desc: 'Agregá lo que necesitás al carrito y confirmá en segundos.' },
            { icon: <Clock className="h-5 w-5 text-primary" />, step: 'Paso 2', title: 'Lo preparamos', desc: 'Armamos tu pedido y te avisamos cuando está listo.' },
            { icon: <span className="text-lg">🏪</span>, step: 'Paso 3', title: 'Retirás sin esperar', desc: 'Venís, mostrás tu código y te llevás todo listo.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 bg-card rounded-2xl p-6 shadow-warm border border-border/60">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{item.step}</p>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section id="categorias" className="container mx-auto px-4 pb-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Nuestros productos</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">¿Qué necesitás hoy?</h2>
          </div>
          <Button variant="ghost" asChild className="hidden md:flex text-primary hover:text-primary">
            <Link href="/categorias">Ver todo <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        {categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => <CategoryCard key={cat.id} category={cat} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">🛒</p>
            <p>Pronto vas a ver nuestros productos acá.</p>
          </div>
        )}
        <div className="mt-6 md:hidden">
          <Button variant="outline" className="w-full rounded-full" asChild>
            <Link href="/categorias">Ver todas las categorías <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* RESEÑAS — componente client que carga desde Supabase */}
      <ReviewsSection />

      {/* UBICACIÓN — Villa San Nicolás, Malagueño */}
      <section className="container mx-auto px-4 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Dónde estamos</p>
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">Encontranos en el barrio</h2>
            <p className="text-muted-foreground mb-2">
              <span className="font-medium">Segundo Dutari Rodríguez 746</span><br />
              Villa San Nicolás, Malagueño, Córdoba
            </p>
            <p className="text-sm text-muted-foreground mb-4">Abiertos todos los días para vos 🧡</p>
            <Button asChild variant="outline" className="rounded-full gap-2">
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
          <div className="rounded-2xl overflow-hidden shadow-warm-lg border border-border/60 h-64">
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
        </div>
      </section>

      {/* CTA — solo si no está logueado */}
      {!user && (
        <section className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-12 md:px-14 md:py-16 text-center shadow-warm-lg">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-8 -left-8 text-[180px] opacity-[0.08]">🧡</div>
              <div className="absolute -bottom-8 -right-8 text-[180px] opacity-[0.08]">🛒</div>
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">¿Primera vez acá?</h2>
              <p className="mt-3 text-primary-foreground/85 max-w-md mx-auto text-base leading-relaxed">
                Creá tu cuenta gratis y hacé tu primer pedido en minutos.
              </p>
              <Button size="lg" className="mt-8 rounded-full px-10 bg-white text-primary hover:bg-white/90 shadow-md font-semibold" asChild>
                <Link href="/auth/sign-up">Crear cuenta gratis</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}