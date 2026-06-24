'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, CheckCircle, AlertCircle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Debt, Profile } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(price)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

type DebtWithProfile = Debt & { profile: Profile }

export default function AdminDebtsPage() {
  const [debts, setDebts] = useState<DebtWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDebt, setSelectedDebt] = useState<DebtWithProfile | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const loadDebts = useCallback(async () => {
    const { data } = await supabase
      .from('debts')
      .select('*, profile:profiles(*)')
      .order('is_paid', { ascending: true })
      .order('created_at', { ascending: false })

    setDebts(data || [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    loadDebts()
  }, [loadDebts])

  const handlePayment = async () => {
    if (!selectedDebt || !paymentAmount) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Monto invalido')
      return
    }

    setIsSaving(true)

    try {
      const newPaidAmount = selectedDebt.paid_amount + amount
      const remaining = selectedDebt.amount - newPaidAmount
      const isPaid = remaining <= 0

      const { error } = await supabase
        .from('debts')
        .update({
          paid_amount: Math.min(newPaidAmount, selectedDebt.amount),
          is_paid: isPaid,
          paid_at: isPaid ? new Date().toISOString() : null
        })
        .eq('id', selectedDebt.id)

      if (error) throw error

      toast.success(isPaid ? 'Deuda pagada completamente!' : 'Pago registrado')
      setIsPaymentDialogOpen(false)
      setSelectedDebt(null)
      setPaymentAmount('')
      loadDebts()
    } catch (error) {
      console.error('Error registering payment:', error)
      toast.error('Error al registrar pago')
    } finally {
      setIsSaving(false)
    }
  }

  const totalPending = debts.filter(d => !d.is_paid).reduce((sum, d) => sum + (d.amount - d.paid_amount), 0)
  const totalCollected = debts.reduce((sum, d) => sum + d.paid_amount, 0)
  const pendingCount = debts.filter(d => !d.is_paid).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Control de Deudas</h1>
        <p className="text-muted-foreground">Administra las deudas de clientes (boucher/fiado)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total pendiente</p>
                <p className="text-2xl font-bold text-warning">{formatPrice(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-success/10 p-3">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total cobrado</p>
                <p className="text-2xl font-bold text-success">{formatPrice(totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-muted p-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deudas pendientes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de deudas</CardTitle>
          <CardDescription>Haz clic en &quot;Registrar pago&quot; para cobrar</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay deudas registradas
                  </TableCell>
                </TableRow>
              ) : (
                debts.map((debt) => (
                  <TableRow key={debt.id} className={debt.is_paid ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{debt.profile?.full_name || 'Cliente'}</TableCell>
                    <TableCell>{debt.notes || '-'}</TableCell>
                    <TableCell>{formatDate(debt.created_at)}</TableCell>
                    <TableCell>{formatPrice(debt.amount)}</TableCell>
                    <TableCell>{formatPrice(debt.paid_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={debt.is_paid ? 'outline' : 'secondary'} className="flex items-center gap-1 w-fit">
                        {debt.is_paid ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {debt.is_paid ? 'Pagada' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!debt.is_paid && (
                        <Button 
                          size="sm" 
                          onClick={() => { 
                            setSelectedDebt(debt)
                            setPaymentAmount((debt.amount - debt.paid_amount).toString())
                            setIsPaymentDialogOpen(true) 
                          }}
                        >
                          Registrar pago
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              Cliente: {selectedDebt?.profile?.full_name}<br />
              Pendiente: {selectedDebt && formatPrice(selectedDebt.amount - selectedDebt.paid_amount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto a cobrar</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePayment} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
