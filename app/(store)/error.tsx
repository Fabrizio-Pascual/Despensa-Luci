'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Next.js App Router muestra esto automáticamente si algo se rompe al
 * renderizar cualquier página dentro de app/(store)/ — reemplaza la
 * pantalla de error genérica en blanco por algo con la marca de la
 * tienda, que le explica al usuario qué pasó y le da una salida clara.
 * Nunca mostramos el error técnico crudo (error.message) al usuario.
 */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[store error boundary]', error)
  }, [error])

  return (
    <div className="pb-16">
      <div className="mesh-bg" />
      <div className="container mx-auto px-4 py-24 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-display-lg text-foreground mb-3">Algo salió mal</h1>
        <p className="text-muted-foreground mb-8">
          Tuvimos un problema para mostrar esta página. No es nada que hayas hecho vos —
          probá de nuevo en un momento.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/"><Home className="mr-2 h-4 w-4" /> Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
