import Link from 'next/link'
import { ArrowLeft, Search, ShoppingCart, CreditCard, Package, Phone, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const pasos = [
  {
    icon: Search,
    titulo: '1. Buscá lo que necesitás',
    texto: 'Entrá a "Categorías" en la parte de arriba, o tocá la lupa 🔍 y escribí el nombre del producto (por ejemplo "arroz"). También podés recorrer la página principal, ahí aparecen productos destacados.',
  },
  {
    icon: MousePointerClick,
    titulo: '2. Agregalo al carrito',
    texto: 'Cuando encuentres el producto, tocá el botón "Agregar al carrito". Podés agregar todos los productos que quieras, uno por uno.',
  },
  {
    icon: ShoppingCart,
    titulo: '3. Revisá tu carrito',
    texto: 'Arriba a la derecha vas a ver un carrito 🛒 con un numerito. Ese número te dice cuántos productos tenés agregados. Tocá ahí para ver la lista completa y cambiar cantidades si hace falta.',
  },
  {
    icon: CreditCard,
    titulo: '4. Confirmá el pedido',
    texto: 'Tocá "Finalizar compra". Ahí elegís cómo vas a pagar (efectivo, débito o fiado) y confirmás. Si pagás en efectivo, decinos con cuánto vas a pagar para tener el vuelto preparado.',
  },
  {
    icon: Package,
    titulo: '5. Retirá tu pedido',
    texto: 'Te va a aparecer un código de retiro. Guardalo (podés sacarle una foto a la pantalla). Cuando esté listo para retirar, te va a llegar un aviso. Vas al local, mostrás el código y listo.',
  },
  {
    icon: Phone,
    titulo: '¿Tenés dudas?',
    texto: 'Si algo no te queda claro o preferís que te ayudemos por teléfono, comunicate con nosotros y con gusto te acompañamos en el pedido.',
  },
]

export default function ComoComprarPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Volver al inicio</Link>
      </Button>

      <h1 className="text-3xl md:text-4xl font-bold mb-3">¿Cómo hago un pedido?</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Guía simple, paso a paso. No hace falta saber de computadoras: seguí estos pasos con calma y listo.
      </p>

      <div className="space-y-5">
        {pasos.map((paso, i) => (
          <Card key={i} className="border-l-4 border-l-primary">
            <CardContent className="p-5 flex gap-4 items-start">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <paso.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">{paso.titulo}</h2>
                <p className="text-base leading-relaxed text-foreground/90">{paso.texto}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Button asChild size="lg" className="text-base">
          <Link href="/">Empezar a comprar</Link>
        </Button>
      </div>
    </div>
  )
}
