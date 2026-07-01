'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckCircle, AlertCircle, DollarSign, Search, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

interface DebtItem {
  id: string
  user_id: string
  order_id: string | null
  amount: number
  paid_amount: number
  is_paid: boolean
  notes: string | null
  created_at: string
  order?: { id: string; total: number; created_at: string; payment_method: string }
}

interface ClientDebt {
  user_id: string
  full_name: string
  phone: string
  totalDebt: number
  paidAmount: number
  remaining: number
  debts: DebtItem[]
  isPaid: boolean
}

export default function AdminDeudasPage() {
  const [clientDebts, setClientDebts] = useState<ClientDebt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [filterLetter, setFilterLetter] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const loadDebts = useCallback(async () => {
    // Traer deudas con el pedido
    const { data: debtsData } = await supabase
      .from('debts')
      .select('*, order:orders(id, total, created_at, payment_method)')
      .order('created_at', { ascending: false })

    if (!debtsData) { setIsLoading(false); return }

    // Traer profiles por separado para evitar el problema del join
    const userIds = [...new Set(debtsData.map((d: any) => d.user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', userIds)

    const profileMap: Record<string, any> = {}
    profilesData?.forEach((p: any) => { profileMap[p.id] = p })

    // Agrupar por cliente
    const grouped: Record<string, ClientDebt> = {}
    debtsData.forEach((debt: any) => {
      const uid = debt.user_id
      const profile = profileMap[uid]
      if (!grouped[uid]) {
        grouped[uid] = {
          user_id: uid,
          full_name: profile?.full_name || 'Sin nombre',
          phone: profile?.phone || '',
          totalDebt: 0,
          paidAmount: 0,
          remaining: 0,
          debts: [],
          isPaid: true,
        }
      }
      grouped[uid].totalDebt += debt.amount
      grouped[uid].paidAmount += debt.paid_amount || 0
      grouped[uid].debts.push(debt)
      if (!debt.is_paid) grouped[uid].isPaid = false
    })

    Object.values(grouped).forEach(c => { c.remaining = c.totalDebt - c.paidAmount })

    setClientDebts(Object.values(grouped).sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    loadDebts()

    const channel = supabase.channel('admin-debts-realtime')
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'debts',
    }, () => { loadDebts() })
    channel.subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadDebts])

  const letters = useMemo(() => {
    const unique = [...new Set(clientDebts.map(c => c.full_name[0]?.toUpperCase()).filter(Boolean))]
    return unique.sort()
  }, [clientDebts])

  const filtered = useMemo(() => {
    return clientDebts.filter(c => {
      const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase())
      const matchLetter = !filterLetter || c.full_name[0]?.toUpperCase() === filterLetter
      return matchSearch && matchLetter
    })
  }, [clientDebts, search, filterLetter])

  const handlePay = async () => {
    if (!selectedClient || !payAmount) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Ingresá un monto válido'); return }
    if (amount > selectedClient.remaining) { toast.error(`El máximo es ${formatPrice(selectedClient.remaining)}`); return }

    setIsPaying(true)
    try {
      let remaining = amount
      const unpaidDebts = selectedClient.debts.filter(d => !d.is_paid)

      for (const debt of unpaidDebts) {
        if (remaining <= 0) break
        const debtRemaining = debt.amount - (debt.paid_amount || 0)
        const toPay = Math.min(remaining, debtRemaining)
        const newPaid = (debt.paid_amount || 0) + toPay
        const isPaid = newPaid >= debt.amount

        const { error } = await supabase
          .from('debts')
          .update({ paid_amount: newPaid, is_paid: isPaid, updated_at: new Date().toISOString() })
          .eq('id', debt.id)

        if (error) throw error
        remaining -= toPay
      }

      toast.success(`Pago de ${formatPrice(amount)} registrado para ${selectedClient.full_name}`)
      setSelectedClient(null)
      setPayAmount('')
      loadDebts()
    } catch {
      toast.error('Error al registrar el pago')
    } finally {
      setIsPaying(false)
    }
  }

  const totalPendiente = clientDebts.filter(c => !c.isPaid).reduce((sum, c) => sum + c.remaining, 0)

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deudas (Fiado)</h1>
        <p className="text-muted-foreground">Control de fiados por cliente</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total pendiente</p>
            <p className="text-2xl font-bold text-destructive">{formatPrice(totalPendiente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Clientes con deuda</p>
            <p className="text-2xl font-bold">{clientDebts.filter(c => !c.isPaid).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total cobrado</p>
            <p className="text-2xl font-bold text-green-600">
              {formatPrice(clientDebts.reduce((sum, c) => sum + c.paidAmount, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button variant={!filterLetter ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setFilterLetter(null)}>
            Todos
          </Button>
          {letters.map(l => (
            <Button key={l} variant={filterLetter === l ? 'default' : 'outline'} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setFilterLetter(filterLetter === l ? null : l)}>
              {l}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No hay deudas registradas</CardContent></Card>
        ) : (
          filtered.map(client => (
            <Card key={client.user_id} className={client.isPaid ? 'opacity-60' : 'border-destructive/30'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {client.full_name}
                      <Badge variant={client.isPaid ? 'outline' : 'destructive'} className="text-xs">
                        {client.isPaid ? 'Al día' : `Debe ${formatPrice(client.remaining)}`}
                      </Badge>
                    </CardTitle>
                    {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    {!client.isPaid && (
                      <Button size="sm" onClick={() => { setSelectedClient(client); setPayAmount('') }}>
                        <DollarSign className="h-4 w-4 mr-1" />
                        Pago
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setExpandedClient(expandedClient === client.user_id ? null : client.user_id)}>
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedClient === client.user_id ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedClient === client.user_id && (
                <CardContent className="pt-0">
                  <div className="space-y-2 border-t pt-3">
                    {client.debts.map(debt => (
                      <div key={debt.id} className="flex items-start justify-between text-sm py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">
                            {debt.order ? `Pedido #${debt.order.id.slice(0, 8)}` : 'Deuda manual'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(debt.created_at).toLocaleDateString('es-AR')}
                            {debt.notes && ` · ${debt.notes}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(debt.amount)}</p>
                          {debt.paid_amount > 0 && (
                            <p className="text-xs text-green-600">Pagó {formatPrice(debt.paid_amount)}</p>
                          )}
                          <Badge variant={debt.is_paid ? 'outline' : 'secondary'} className="text-xs mt-1">
                            {debt.is_paid ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 font-semibold">
                      <span>Total deuda</span>
                      <span>{formatPrice(client.totalDebt)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Pagado</span>
                      <span>{formatPrice(client.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-destructive font-bold">
                      <span>Pendiente</span>
                      <span>{formatPrice(client.remaining)}</span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedClient} onOpenChange={(open) => { if (!open) setSelectedClient(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago — {selectedClient?.full_name}</DialogTitle>
            <DialogDescription>
              Deuda pendiente: {selectedClient && formatPrice(selectedClient.remaining)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto a pagar</Label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setPayAmount(selectedClient?.remaining.toString() || '')}>
              Pagar todo ({selectedClient && formatPrice(selectedClient.remaining)})
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedClient(null)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={isPaying}>
              {isPaying ? 'Registrando...' : 'Confirmar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}