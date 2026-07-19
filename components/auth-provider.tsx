'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserSafe } from '@/lib/supabase/get-user-safe'
import type { Profile } from '@/lib/types'

interface AuthUser {
  id: string
  email?: string
}

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
})

/**
 * Única fuente de verdad para "¿quién está logueado?".
 *
 * Antes, el header, el carrito y las reseñas le preguntaban a Supabase
 * cada uno por su cuenta, al mismo tiempo, en cada carga de página.
 * Esas consultas simultáneas podían chocar entre sí y hacer que
 * Supabase invalidara la sesión.
 *
 * Ahora esto se pregunta UNA sola vez acá arriba, y el resto de la
 * app simplemente lee el resultado con el hook useAuth().
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let active = true

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) console.error('[auth] error cargando profile:', error.message, error.code, error.details)
      if (active) setProfile(data)
    }

    const init = async () => {
      const u = await getUserSafe(supabase)
      if (!active) return
      setUser(u)
      if (u) await loadProfile(u.id)
      if (active) setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = useMemo(() => ({ user, profile, loading }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
