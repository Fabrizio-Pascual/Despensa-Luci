'use client'

import { useMemo } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function DashboardLogoutButton() {
  const supabase = useMemo(() => createClient(), [])

  const handleSignOut = async () => {
    try {
      // Si signOut tarda más de 3s (problema de red), igual seguimos adelante
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
    } catch (error) {
      // Error silencioso: igual redirigimos al inicio
    } finally {
      window.location.href = '/'
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 premium-transition w-full text-left"
    >
      <LogOut className="h-5 w-5" />
      Cerrar sesión
    </button>
  )
}
