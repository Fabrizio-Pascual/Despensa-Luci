'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StoreSettings } from '@/lib/types'

const DEFAULT_CLOSED_MESSAGE =
  'En este momento estamos cerrados. Podés dejar tu pedido cargado y lo empezamos a preparar apenas abramos.'

/**
 * Estado en vivo de "¿la tienda está tomando pedidos?".
 *
 * Es una bandera manual que el admin prende/apaga desde el panel
 * (Admin → Configuración), no un cálculo por horario. Se suscribe a
 * cambios en tiempo real para que, si el admin cierra la tienda,
 * todos los que están navegando lo vean sin recargar la página.
 */
export function useStoreStatus() {
  const [isOpen, setIsOpen] = useState(true)
  const [closedMessage, setClosedMessage] = useState<string>(DEFAULT_CLOSED_MESSAGE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const load = async () => {
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', true)
        .maybeSingle()

      if (!mounted) return
      const settings = data as StoreSettings | null
      setIsOpen(settings?.is_open ?? true)
      if (settings?.closed_message) setClosedMessage(settings.closed_message)
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('store-settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_settings' }, (payload: { new: StoreSettings }) => {
        if (!mounted) return
        const next = payload.new as StoreSettings
        setIsOpen(next.is_open)
        if (next.closed_message) setClosedMessage(next.closed_message)
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { isOpen, closedMessage, loading }
}
