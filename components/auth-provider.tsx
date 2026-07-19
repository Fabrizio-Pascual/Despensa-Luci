'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
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
 * Antes, además, esperábamos a auth.getUser() para saber quién sos:
 * esa llamada siempre sale a internet a confirmar el token con Supabase,
 * y si la red tiene un pico de lentitud, se cuelga y la app se queda sin
 * saber quién sos. Ahora usamos la sesión que el navegador ya tiene
 * guardada localmente (instantáneo, sin depender de la red) y dejamos
 * que Supabase la revalide en segundo plano cuando haga falta.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    console.log('[auth] AuthProvider montado, suscribiendo a onAuthStateChange')
    let active = true

    const loadProfile = async (userId: string) => {
      console.log('[auth] pidiendo profile de', userId)
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      console.log('[auth] respuesta profile:', { data, error })
      if (error) console.error('[auth] error cargando profile:', error.message, error.code, error.details)
      if (active) setProfile(data)
    }

    // onAuthStateChange dispara un evento inicial (INITIAL_SESSION) apenas
    // nos suscribimos, usando la sesión ya guardada en el navegador —
    // no hace falta pedirle nada a Supabase por red para saber el estado
    // inicial. Si más adelante el token vence, Supabase lo renueva solo
    // y dispara otro evento acá mismo.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      console.log('[auth] onAuthStateChange:', _event, 'user:', session?.user?.id ?? null)
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
