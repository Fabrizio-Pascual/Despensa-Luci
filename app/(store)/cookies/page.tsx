import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const secciones = [
  {
    titulo: '1. ¿Qué son las cookies?',
    texto:
      'Son pequeños archivos que este sitio guarda en tu navegador o dispositivo para recordar información sobre tu visita, mejorar tu experiencia y permitir el funcionamiento de ciertas funciones, como mantener tu sesión iniciada o tu carrito de compras.',
  },
  {
    titulo: '2. Cookies necesarias',
    texto:
      'Imprescindibles para que el sitio funcione: mantener tu sesión (login), guardar el contenido del carrito, recordar tus preferencias y habilitar la instalación como aplicación. No se pueden desactivar porque el sitio no funcionaría correctamente sin ellas.',
  },
  {
    titulo: '3. Cookies de funcionalidad',
    texto:
      'Recuerdan elecciones que hiciste (por ejemplo, tu avatar o preferencias de notificaciones) para no pedírtelas de nuevo en cada visita.',
  },
  {
    titulo: '4. Notificaciones push',
    texto:
      'Podemos pedirte permiso para enviarte notificaciones (por ejemplo, sobre el estado de tu pedido). No es técnicamente una cookie sino un permiso del navegador, y podés revocarlo cuando quieras desde la configuración de tu navegador o dispositivo.',
  },
  {
    titulo: '5. Cómo administrar las cookies',
    texto:
      'Podés eliminar o bloquear las cookies desde la configuración de tu navegador. Bloquear las necesarias puede impedir que el sitio funcione bien (por ejemplo, que no se guarde tu carrito o que se cierre tu sesión).',
  },
  {
    titulo: '6. Cambios en esta política',
    texto:
      'Podemos actualizar esta política cuando se agreguen nuevas funcionalidades. La versión vigente es siempre la publicada en este sitio.',
  },
]

export default function CookiesPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </Button>

      <h1 className="text-display-lg text-foreground mb-2">Política de Cookies</h1>
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
        ¿Dudas? Escribinos a{' '}
        <a href="mailto:fpascual624@gmail.com" className="text-primary hover:underline">
          fpascual624@gmail.com
        </a>
        .
      </p>
    </div>
  )
}
