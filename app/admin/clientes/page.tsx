'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, ShoppingCart, DollarSign, Ban, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [banDialog, setBanDialog] = useState<{ open: boolean; client: any | null; action: 'ban' | 'unban' }>({ open: false, client: null, action: 'ban' })
  const supabase = useMemo(() => createClient(), [])

  const loadClients = useCallback(async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').eq('is_admin', false).order('created_at', { ascending: false })

    const stats = await Promise.all((profiles || []).map(async (profile) => {
      const { data: orders } = await supabase.from('orders').select('total').eq('user_id', profile.id).eq('status', 'completed')
      const { data: debts } = await supabase.from('debts').select('amount, paid_amount').eq('user_id', profile.id).eq('is_paid', false)
      return {
        ...profile,
        totalSpent: orders?.reduce((s, o) => s + o.total, 0) || 0,
        orderCount: orders?.length || 0,
        pendingDebt: debts?.reduce((s, d) => s + (d.amount - d.paid_amount), 0) || 0,
      }
    }))

    setClients(stats)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { loadClients() }, [loadClients])

  const handleBan = async () => {
    if (!banDialog.client) return
    const isBanning = banDialog.action === 'ban'
    const { error } = await supabase.from('profiles').update({ is_banned: isBanning }).eq('id', banDialog.client.id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success(isBanning ? `${banDialog.client.full_name} baneado` : `${banDialog.client.full_name} desbaneado`)
    setBanDialog({ open: false, client: null, action: 'ban' })
    loadClients()
  }

  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0)
  const totalDebt = clients.reduce((s, c) => s + c.pendingDebt, 0)

  if (isLoading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Listado y estadísticas de clientes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-full bg-primary/10 p-3"><Users className="h-6 w-6 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">Total clientes</p><p className="text-2xl font-bold">{clients.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-full bg-green-500/10 p-3"><DollarSign className="h-6 w-6 text-green-500" /></div>
          <div><p className="text-sm text-muted-foreground">Ingresos totales</p><p className="text-2xl font-bold text-green-600">{formatPrice(totalRevenue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-full bg-warning/10 p-3"><ShoppingCart className="h-6 w-6 text-warning" /></div>
          <div><p className="text-sm text-muted-foreground">Deuda total</p><p className="text-2xl font-bold text-warning">{formatPrice(totalDebt)}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de clientes</CardTitle>
          <CardDescription>{clients.length} clientes registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total gastado</TableHead>
                <TableHead>Deuda</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay clientes</TableCell></TableRow>
              ) : clients.map((c) => (
                <TableRow key={c.id} className={c.is_banned ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{c.full_name || 'Sin nombre'}</TableCell>
                  <TableCell>{c.phone || '-'}</TableCell>
                  <TableCell>{formatDate(c.created_at)}</TableCell>
                  <TableCell><Badge variant="outline">{c.orderCount}</Badge></TableCell>
                  <TableCell>{formatPrice(c.totalSpent)}</TableCell>
                  <TableCell>
                    {c.pendingDebt > 0
                      ? <Badge variant="destructive">{formatPrice(c.pendingDebt)}</Badge>
                      : <Badge variant="outline">Sin deuda</Badge>}
                  </TableCell>
                  <TableCell>
                    {c.is_banned
                      ? <Badge variant="destructive">Baneado</Badge>
                      : <Badge variant="outline" className="text-green-600 border-green-300">Activo</Badge>}
                  </TableCell>
                  <TableCell>
                    {c.is_banned ? (
                      <Button variant="outline" size="sm" onClick={() => setBanDialog({ open: true, client: c, action: 'unban' })}>
                        <CheckCircle className="h-4 w-4 mr-1" />Desbanear
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                        onClick={() => setBanDialog({ open: true, client: c, action: 'ban' })}>
                        <Ban className="h-4 w-4 mr-1" />Banear
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={banDialog.open} onOpenChange={(o) => setBanDialog(prev => ({ ...prev, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{banDialog.action === 'ban' ? '¿Banear usuario?' : '¿Desbanear usuario?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {banDialog.action === 'ban'
                ? `${banDialog.client?.full_name} no podrá acceder a la app ni hacer pedidos.`
                : `${banDialog.client?.full_name} recuperará el acceso a la app.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBan} className={banDialog.action === 'ban' ? 'bg-destructive text-destructive-foreground' : ''}>
              {banDialog.action === 'ban' ? 'Sí, banear' : 'Sí, desbanear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}