'use client'

import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

export default function ClienteDeudasPage() {
  const [debts, setDebts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let channel: any
    let mounted = true

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('debts')
        .select('*, order:orders(id, total, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!mounted) return
      setDebts(data || [])
      setIsLoading(false)

      channel = supabase.channel(`client-debts-${user.id}`)
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'debts',
        filter: `user_id=eq.${user.id}`,
      }, async () => {
        if (!mounted) return
        const { data: fresh } = await supabase
          .from('debts')
          .select('*, order:orders(id, total, created_at)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (mounted) setDebts(fresh || [])
      })
      channel.subscribe()
    }

    load()
    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0)
  const totalPaid = debts.reduce((sum, d) => sum + (d.paid_amount || 0), 0)
  const remaining = totalDebt - totalPaid

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Deudas</h1>
        <p className="text-muted-foreground">Tu historial de fiados</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendiente</p>
            <p className={`text-2xl font-bold ${remaining > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {formatPrice(remaining)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total pagado</p>
            <p className="text-2xl font-bold text-green-600">{formatPrice(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de deudas */}
      {debts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium">¡Estás al día!</p>
            <p className="text-sm text-muted-foreground">No tenés deudas pendientes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {debts.map(debt => (
            <Card key={debt.id} className={debt.is_paid ? 'opacity-60' : 'border-destructive/30'}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {debt.order ? `Pedido #${debt.order.id.slice(0, 8)}` : 'Deuda'}
                  </CardTitle>
                  <Badge variant={debt.is_paid ? 'outline' : 'destructive'}>
                    {debt.is_paid
                      ? <><CheckCircle className="h-3 w-3 mr-1" />Pagado</>
                      : <><AlertCircle className="h-3 w-3 mr-1" />Pendiente</>
                    }
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(debt.created_at).toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total fiado</span>
                  <span className="font-medium">{formatPrice(debt.amount)}</span>
                </div>
                {debt.paid_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pagado</span>
                    <span className="text-green-600 font-medium">{formatPrice(debt.paid_amount)}</span>
                  </div>
                )}
                {!debt.is_paid && (
                  <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
                    <span>Pendiente</span>
                    <span className="text-destructive">{formatPrice(debt.amount - (debt.paid_amount || 0))}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}