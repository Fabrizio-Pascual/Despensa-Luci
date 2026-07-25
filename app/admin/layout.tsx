import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebarNav } from '@/components/admin-sidebar-nav'
import { PushSubscriber } from '@/components/push-subscribe'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Pide permiso de notificaciones y suscribe este navegador/celular
          a push. No renderiza nada visible. */}
      <PushSubscriber />
      <AdminSidebarNav />

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
