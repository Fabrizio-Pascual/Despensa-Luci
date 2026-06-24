import { Users, ShoppingCart, DollarSign } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'

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

export default async function AdminClientsPage() {
  const supabase = await createClient()

  // Get all profiles (non-admin users)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_admin', false)
    .order('created_at', { ascending: false })

  // Get order stats for each user
  const clientStats = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { data: orders } = await supabase
        .from('orders')
        .select('total, status')
        .eq('user_id', profile.id)
        .eq('status', 'completed')

      const { data: debts } = await supabase
        .from('debts')
        .select('amount, paid_amount, is_paid')
        .eq('user_id', profile.id)
        .eq('is_paid', false)

      const totalSpent = orders?.reduce((sum, o) => sum + o.total, 0) || 0
      const orderCount = orders?.length || 0
      const pendingDebt = debts?.reduce((sum, d) => sum + (d.amount - d.paid_amount), 0) || 0

      return {
        ...profile,
        totalSpent,
        orderCount,
        pendingDebt
      }
    })
  )

  const totalClients = clientStats.length
  const totalRevenue = clientStats.reduce((sum, c) => sum + c.totalSpent, 0)
  const totalPendingDebt = clientStats.reduce((sum, c) => sum + c.pendingDebt, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Listado y estadisticas de clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total clientes</p>
                <p className="text-2xl font-bold">{totalClients}</p>
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
                <p className="text-sm text-muted-foreground">Ingresos totales</p>
                <p className="text-2xl font-bold text-success">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <ShoppingCart className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deuda total</p>
                <p className="text-2xl font-bold text-warning">{formatPrice(totalPendingDebt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de clientes</CardTitle>
          <CardDescription>{totalClients} clientes registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total gastado</TableHead>
                <TableHead>Deuda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay clientes registrados
                  </TableCell>
                </TableRow>
              ) : (
                clientStats.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.full_name || 'Sin nombre'}</TableCell>
                    <TableCell>{client.phone || '-'}</TableCell>
                    <TableCell>{formatDate(client.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.orderCount}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatPrice(client.totalSpent)}</TableCell>
                    <TableCell>
                      {client.pendingDebt > 0 ? (
                        <Badge variant="destructive">{formatPrice(client.pendingDebt)}</Badge>
                      ) : (
                        <Badge variant="outline">Sin deuda</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
