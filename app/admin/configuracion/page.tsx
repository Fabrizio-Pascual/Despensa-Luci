'use client'

import { useEffect, useState } from 'react'
import { Store, StoreIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { StoreSettings } from '@/lib/types'

const DEFAULT_MESSAGE =
  'En este momento estamos cerrados. Podés dejar tu pedido cargado y lo empezamos a preparar apenas abramos.'

export default function AdminConfiguracionPage() {
  const [isOpen, setIsOpen] = useState(true)
  const [closedMessage, setClosedMessage] = useState(DEFAULT_MESSAGE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', true)
        .maybeSingle()

      if (error) {
        toast.error('No se pudo cargar la configuración de la tienda')
      } else if (data) {
        const settings = data as StoreSettings
        setIsOpen(settings.is_open)
        setClosedMessage(settings.closed_message || DEFAULT_MESSAGE)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const guardar = async (nextOpen: boolean, nextMessage: string) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('store_settings')
        .update({
          is_open: nextOpen,
          closed_message: nextMessage,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq('id', true)

      if (error) throw error
      toast.success(nextOpen ? 'Tienda marcada como abierta' : 'Tienda marcada como cerrada')
    } catch {
      toast.error('No se pudo guardar el cambio')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (checked: boolean) => {
    setIsOpen(checked)
    guardar(checked, closedMessage)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-headline-md text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Controlá si la tienda está tomando pedidos</p>
      </div>

      <Card className="glass border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              isOpen ? 'bg-green-500/15 text-green-500' : 'bg-amber-500/15 text-amber-500'
            }`}>
              {isOpen ? <Store className="h-5 w-5" /> : <StoreIcon className="h-5 w-5" />}
            </span>
            <div>
              <CardTitle>Estado de la tienda</CardTitle>
              <CardDescription>
                Esto NO se calcula por horario: vos decidís cuándo está abierta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
            <div>
              <p className="font-medium text-foreground">
                {isOpen ? 'Tienda abierta' : 'Tienda cerrada'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOpen
                  ? 'Los clientes pueden pedir con normalidad.'
                  : 'Los clientes van a ver un aviso al llegar al checkout.'}
              </p>
            </div>
            <Switch checked={isOpen} onCheckedChange={handleToggle} disabled={saving} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closed-message">Mensaje cuando está cerrada</Label>
            <Textarea
              id="closed-message"
              value={closedMessage}
              onChange={(e) => setClosedMessage(e.target.value)}
              rows={3}
              placeholder={DEFAULT_MESSAGE}
            />
            <p className="text-xs text-muted-foreground">
              Se muestra en el checkout cuando un cliente intenta pedir con la tienda cerrada.
            </p>
          </div>

          <Button onClick={() => guardar(isOpen, closedMessage)} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Guardando...' : 'Guardar mensaje'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
