import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Envoltorio seguro sobre supabase.auth.getUser().
 *
 * Si la sesión guardada en el navegador quedó corrupta o el refresh token
 * fue invalidado (por ejemplo, después de un cierre de sesión que no
 * terminó bien, o por usar la cuenta en otro dispositivo), la llamada
 * normal puede quedarse esperando para siempre y trabar toda la página.
 *
 * Esta función le pone un límite de tiempo: si no responde a tiempo,
 * o responde con un error, limpia la sesión local (borra las cookies/
 * storage de auth) para que la app quede en un estado limpio de
 * "no logueado" en vez de trabarse.
 */
export async function getUserSafe(supabase: SupabaseClient, timeoutMs = 6000) {
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth_timeout')), timeoutMs)
      ),
    ])

    if (result.error) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      return null
    }

    return result.data.user
  } catch {
    // Se colgó o tiró error de red/token inválido: limpiamos localmente
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    return null
  }
}