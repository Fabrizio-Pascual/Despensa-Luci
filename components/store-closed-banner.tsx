'use client'

import { StoreIcon } from 'lucide-react'
import { useStoreStatus } from '@/lib/hooks/useStoreStatus'

/**
 * Franja visible en todas las páginas mientras el admin marcó la
 * tienda como "cerrada" desde Admin → Configuración. No bloquea la
 * navegación: solo avisa. El bloqueo/confirmación real pasa en el
 * checkout (ver CheckoutClosedNotice).
 */
export function StoreClosedBanner() {
  const { isOpen, loading } = useStoreStatus()

  if (loading || isOpen) return null

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-600 dark:text-amber-400">
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-center">
        <StoreIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Estamos cerrados por el momento. Podés dejar tu pedido y lo preparamos apenas abramos.</span>
      </div>
    </div>
  )
}
