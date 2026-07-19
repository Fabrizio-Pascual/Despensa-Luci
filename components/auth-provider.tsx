'use client'

import { createContext, useContext, useEffect, useState, useMemo, useRef, ReactNode } from 'react'
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

interface AuthProviderProps {
  children: ReactNode
  /**
   * Usuario y perfil ya resueltos en el servidor (ver app/layout.tsx),
   * usando las cookies de la request. Esto es lo que evita el "flash"
   * de logueado -> no logueado -> admin que se veía al hacer F5: en vez
   * de que el cliente arranque en null y tenga que redescubrir la sesión
   * de a poco, arranca ya sabiendo quién sos desde el primer render.
   */
  initialUser?: AuthUser | null
  initialProfile?: Profile | null
}

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
export function AuthProvider({ children, initialUser = null, initialProfile = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  // Si el servidor ya nos dio el usuario, no hace falta mostrar el
  // estado "cargando" al cliente: ya arrancamos sabiendo quién sos.
  const [loading, setLoading] = useState(!initialUser)
  const supabase = useMemo(() => createClient(), [])
  // Para no volver a pedir el perfil si el servidor ya nos dio uno
  // válido para este mismo usuario justo al montar.
  const currentProfileIdRef = useRef<string | null>(initialProfile?.id ?? null)
  const isFirstEventRef = useRef(true)

  useEffect(() => {
    console.log('[auth] AuthProvider montado, suscribiendo a onAuthStateChange')
    let active = true

    const loadProfile = async (userId: string) => {
      console.log('[auth] pidiendo profile de', userId)
      try {
        // Esta consulta a veces se queda colgada (ni error ni respuesta),
        // y si no le ponemos un límite, el resto de la app se queda
        // esperando para siempre. Con el timeout, en el peor caso nos
        // quedamos con el perfil que ya teníamos (del servidor, si había)
        // en vez de trabarnos.
        const result = await Promise.race([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          new Promise<{ data: null; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error('profile_timeout') }), 6000)
          ),
        ])
        console.log('[auth] respuesta profile:', result)
        if (result.error) {
          console.error('[auth] error/timeout cargando profile:', result.error.message)
          // No pisamos un perfil válido que ya teníamos por un error puntual.
          return
        }
        if (active) {
          setProfile(result.data)
          currentProfileIdRef.current = (result.data as Profile | null)?.id ?? null
        }
      } catch (e) {
        console.error('[auth] excepción cargando profile:', e instanceof Error ? e.message : e)
      }
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
        // Si esta es la primera confirmación de sesión y el servidor ya
        // nos había dado el perfil correcto para este mismo usuario, no
        // lo volvemos a pedir: es una consulta menos compitiendo justo
        // en el momento más delicado (arranque de página).
        const canSkip = isFirstEventRef.current && currentProfileIdRef.current === session.user.id
        if (!canSkip) await loadProfile(session.user.id)
      } else {
        setProfile(null)
        currentProfileIdRef.current = null
      }
      isFirstEventRef.current = false
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
