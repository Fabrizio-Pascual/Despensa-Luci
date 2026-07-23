'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, ShoppingCart, DollarSign, Ban, CheckCircle, Search, ShieldCheck, ShieldOff, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function getInitials(name?: string | null) {
  return (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

type ConfirmAction =
  | { type: 'ban' | 'unban'; client: any }
  | { type: 'make_admin' | 'remove_admin'; client: any }
  | null

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [admins, setAdmins] = useState<any[]>([])
  const [myRole, setMyRole] = useState<'user' | 'admin' | 'superadmin'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const supabase = useMemo(() => createClient(), [])

  const loadClients = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (myProfile?.role) setMyRole(myProfile.role)
    }

    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

    const withStats = await Promise.all((profiles || []).map(async (profile: any) => {
      const { data: orders } = await supabase.from('orders').select('total').eq('user_id', profile.id).eq('status', 'completed')
      const { data: debts } = await supabase.from('debts').select('amount, paid_amount').eq('user_id', profile.id).eq('is_paid', false)
      return {
        ...profile,
        totalSpent: orders?.reduce((s: number, o: any) => s + o.total, 0) || 0,
        orderCount: orders?.length || 0,
        pendingDebt: debts?.reduce((s: number, d: any) => s + (d.amount - d.paid_amount), 0) || 0,
      }
    }))

    setClients(withStats.filter(p => (p.role || 'user') === 'user'))
    setAdmins(withStats.filter(p => (p.role || 'user') !== 'user'))
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { loadClients() }, [loadClients])

  const filteredClients = clients.filter(c =>
    (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  )
  const filteredAdmins = admins.filter(c =>
    (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  )

  const toggleCanFiar = async (client: any, value: boolean) => {
    const { error } = await supabase.from('profiles').update({ can_fiar: value }).eq('id', client.id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success(value ? `${client.full_name} ahora puede sacar fiado` : `${client.full_name} ya no puede sacar fiado`)
    loadClients()
  }

  const runConfirm = async () => {
    if (!confirmAction) return
    const { type, client } = confirmAction
    try {
      if (type === 'ban' || type === 'unban') {
        const { error } = await supabase.from('profiles').update({ is_banned: type === 'ban' }).eq('id', client.id)
        if (error) throw error
        toast.success(type === 'ban' ? `${client.full_name} baneado` : `${client.full_name} desbaneado`)
      } else if (type === 'make_admin') {
        const { error } = await supabase.from('profiles').update({ role: 'admin', is_admin: true }).eq('id', client.id)
        if (error) throw error
        toast.success(`${client.full_name} ahora es administrador`)
      } else if (type === 'remove_admin') {
        const { error } = await supabase.from('profiles').update({ role: 'user', is_admin: false }).eq('id', client.id)
        if (error) throw error
        toast.success(`${client.full_name} ya no es administrador`)
      }
      setConfirmAction(null)
      loadClients()
    } catch {
      toast.error('Error al aplicar el cambio')
    }
  }

  // Solo superadmin puede tocar a otro admin (ascender/quitar/banear). Un admin
  // nunca puede tocar a otro admin ni banearlo. Un superadmin no puede ser
  // ni degradado ni baneado desde acá.
  const canManageAdmin = (target: any) => myRole === 'superadmin' && target.role !== 'superadmin'

  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0)
  const totalDebt = clients.reduce((s, c) => s + c.pendingDebt, 0)

  if (isLoading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Listado y estadísticas de clientes y administradores</p>
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o teléfono..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes ({filteredClients.length})</TabsTrigger>
          <TabsTrigger value="admins">Administradores ({filteredAdmins.length})</TabsTrigger>
        </TabsList>

        {/* --- CLIENTES --- */}
        <TabsContent value="clientes" className="space-y-2 mt-4">
          {filteredClients.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No hay clientes</CardContent></Card>
          )}
          {filteredClients.map((c) => (
            <Card key={c.id} className={c.is_banned ? 'opacity-60' : ''}>
              <button className="w-full text-left" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border shrink-0">
                      <AvatarImage src={c.avatar_url || undefined} alt={c.full_name || 'Avatar'} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xs font-semibold">
                        {getInitials(c.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.full_name || 'Sin nombre'}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || 'Sin teléfono'} · {formatDate(c.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.pendingDebt > 0 && <Badge variant="destructive">{formatPrice(c.pendingDebt)}</Badge>}
                    {c.can_fiar && <Badge variant="outline" className="text-blue-600 border-blue-300">Fiado</Badge>}
                    {c.is_banned
                      ? <Badge variant="destructive">Baneado</Badge>
                      : <Badge variant="outline" className="text-green-600 border-green-300">Activo</Badge>}
                    {expandedId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardContent>
              </button>
              {expandedId === c.id && (
                <CardContent className="pt-0 pb-4 px-4 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm pt-3">
                    <div><p className="text-muted-foreground">Pedidos</p><p className="font-medium">{c.orderCount}</p></div>
                    <div><p className="text-muted-foreground">Total gastado</p><p className="font-medium">{formatPrice(c.totalSpent)}</p></div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Habilitar fiado</p>
                      <p className="text-xs text-muted-foreground">Cliente de confianza: puede sacar productos fiados</p>
                    </div>
                    <Switch checked={!!c.can_fiar} onCheckedChange={(v) => toggleCanFiar(c, v)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {myRole === 'superadmin' && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirmAction({ type: 'make_admin', client: c })}>
                        <Shield className="h-3.5 w-3.5" />Hacer admin
                      </Button>
                    )}
                    {c.is_banned ? (
                      <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'unban', client: c })}>
                        <CheckCircle className="h-4 w-4 mr-1" />Desbanear
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                        onClick={() => setConfirmAction({ type: 'ban', client: c })}>
                        <Ban className="h-4 w-4 mr-1" />Banear
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* --- ADMINISTRADORES --- */}
        <TabsContent value="admins" className="space-y-2 mt-4">
          {filteredAdmins.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No hay administradores</CardContent></Card>
          )}
          {filteredAdmins.map((a) => (
            <Card key={a.id} className={a.is_banned ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 border shrink-0">
                    <AvatarImage src={a.avatar_url || undefined} alt={a.full_name || 'Avatar'} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xs font-semibold">
                      {getInitials(a.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate flex items-center gap-2">
                      {a.full_name || 'Sin nombre'}
                      <Badge variant={a.role === 'superadmin' ? 'default' : 'secondary'}>
                        {a.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">{a.phone || 'Sin teléfono'} · {formatDate(a.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageAdmin(a) ? (
                    <>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirmAction({ type: 'remove_admin', client: a })}>
                        <ShieldOff className="h-3.5 w-3.5" />Quitar admin
                      </Button>
                      {a.is_banned ? (
                        <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'unban', client: a })}>
                          <CheckCircle className="h-4 w-4 mr-1" />Desbanear
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                          onClick={() => setConfirmAction({ type: 'ban', client: a })}>
                          <Ban className="h-4 w-4 mr-1" />Banear
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />Protegido
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'ban' && '¿Banear usuario?'}
              {confirmAction?.type === 'unban' && '¿Desbanear usuario?'}
              {confirmAction?.type === 'make_admin' && '¿Convertir en administrador?'}
              {confirmAction?.type === 'remove_admin' && '¿Quitar permisos de administrador?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'ban' && `${confirmAction.client?.full_name} no podrá acceder a la app ni hacer pedidos.`}
              {confirmAction?.type === 'unban' && `${confirmAction.client?.full_name} recuperará el acceso a la app.`}
              {confirmAction?.type === 'make_admin' && `${confirmAction.client?.full_name} va a poder entrar al panel de administración.`}
              {confirmAction?.type === 'remove_admin' && `${confirmAction.client?.full_name} pasará a ser un cliente normal.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirm} className={confirmAction?.type === 'ban' ? 'bg-destructive text-destructive-foreground' : ''}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}