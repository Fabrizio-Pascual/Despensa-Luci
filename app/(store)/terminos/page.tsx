import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const secciones = [
  {
    titulo: '1. Datos del vendedor',
    texto:
      'Despensa De La Luci (CUIT: a completar). Domicilio: a completar. Email de contacto: fpascual624@gmail.com.',
  },
  {
    titulo: '2. Objeto',
    texto:
      'Estos Términos y Condiciones regulan el uso de este sitio y las compras realizadas a través de él. Al registrarte, navegar o hacer un pedido, los aceptás en su totalidad.',
  },
  {
    titulo: '3. Productos y precios',
    texto:
      'Los precios se muestran en pesos argentinos (ARS) e incluyen los impuestos vigentes, salvo que se indique lo contrario. Podemos modificar precios, disponibilidad y descripciones sin previo aviso; se aplica siempre el precio vigente al confirmar el pedido. Las imágenes son ilustrativas y pueden diferir levemente del producto real.',
  },
  {
    titulo: '4. Pedidos',
    texto:
      'Un pedido se considera confirmado cuando el sitio muestra la confirmación y/o llega la notificación de confirmación. Podemos cancelar o ajustar un pedido ante un error de precio o de stock, avisándote y ofreciendo reembolso o reemplazo.',
  },
  {
    titulo: '5. Medios de pago',
    texto:
      'Los medios de pago disponibles se muestran al finalizar la compra (efectivo, débito, boucher u otros que se habiliten en el futuro).',
  },
  {
    titulo: '6. Cambios y devoluciones',
    texto:
      'Ante un producto en mal estado, faltante o un error en tu pedido, escribinos dentro de las 48 horas a fpascual624@gmail.com indicando el número de pedido. Por tratarse de productos alimenticios, no se aceptan devoluciones de productos abiertos o perecederos, salvo defecto de fabricación o error nuestro. Se mantienen vigentes los derechos previstos en la Ley 24.240 de Defensa del Consumidor.',
  },
  {
    titulo: '7. Cuenta de usuario',
    texto:
      'Sos responsable de la confidencialidad de tus credenciales de acceso y de que los datos que nos das sean correctos. Podemos suspender cuentas ante uso fraudulento o incumplimiento de estos términos.',
  },
  {
    titulo: '8. Propiedad intelectual',
    texto:
      'El contenido de este sitio (textos, imágenes, logo, diseño) pertenece a Despensa De La Luci o a terceros que autorizaron su uso, y no puede reproducirse sin autorización.',
  },
  {
    titulo: '9. Modificaciones',
    texto:
      'Podemos modificar estos Términos y Condiciones en cualquier momento. La versión vigente es siempre la publicada en este sitio.',
  },
  {
    titulo: '10. Ley aplicable',
    texto:
      'Estos términos se rigen por las leyes de la República Argentina, sin perjuicio de las normas de protección al consumidor que resulten aplicables.',
  },
]

export default function TerminosPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </Button>

      <h1 className="text-display-lg text-foreground mb-2">Términos y Condiciones</h1>
      <p className="text-sm text-muted-foreground mb-8">Última actualización: a completar</p>

      <div className="space-y-4">
        {secciones.map((s) => (
          <Card key={s.titulo}>
            <CardContent className="pt-6">
              <h2 className="text-headline-sm text-foreground mb-2">{s.titulo}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.texto}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        ¿Dudas o reclamos? Escribinos a{' '}
        <a href="mailto:fpascual624@gmail.com" className="text-primary hover:underline">
          fpascual624@gmail.com
        </a>
        .
      </p>
    </div>
  )
}
