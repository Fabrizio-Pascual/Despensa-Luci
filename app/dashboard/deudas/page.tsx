import { FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export default async function DebtsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: debts } = await supabase
    .from('debts')
    .select('*, order:orders(id)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const totalPending = debts?.filter(d => !d.is_paid).reduce((sum, d) => sum + (d.amount - d.paid_amount), 0) || 0
  const totalPaid = debts?.filter(d => d.is_paid).length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Deudas</h1>
        <p className="text-muted-foreground">Control de tus compras con boucher (fiado)</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deuda pendiente</p>
                <p className="text-2xl font-bold text-warning">{formatPrice(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-success/10 p-3">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deudas pagadas</p>
                <p className="text-2xl font-bold text-success">{totalPaid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debts List */}
      {debts && debts.length > 0 ? (
        <div className="space-y-4">
          {debts.map((debt) => (
            <Card key={debt.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {debt.notes || `Deuda #${debt.id.slice(0, 8)}`}
                    </CardTitle>
                    <CardDescription>
                      {formatDate(debt.created_at)}
                    </CardDescription>
                  </div>
                  <Badge variant={debt.is_paid ? 'outline' : 'secondary'}>
                    {debt.is_paid ? 'Pagada' : 'Pendiente'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Pagado: </span>
                    <span className="font-medium">{formatPrice(debt.paid_amount)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Total:</span>
                    <span className={`font-semibold ${debt.is_paid ? 'text-success' : 'text-foreground'}`}>
                      {formatPrice(debt.amount)}
                    </span>
                  </div>
                </div>
                {!debt.is_paid && debt.paid_amount > 0 && (
                  <div className="mt-2 text-sm text-warning">
                    Resta pagar: {formatPrice(debt.amount - debt.paid_amount)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No tenes deudas</h3>
            <p className="text-muted-foreground">
              Las compras con boucher (fiado) aparecerán aca
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
