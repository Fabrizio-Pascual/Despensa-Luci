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
// Códigos de error que SÍ significan "la sesión está realmente rota"
// (recién ahí tiene sentido limpiar cookies). Cualquier otra cosa
// (timeout, red caída, 500 momentáneo de Supabase) NO debe cerrar sesión.
const INVALID_SESSION_CODES = [
  'refresh_token_not_found',
  'refresh_token_already_used',
  'invalid_grant',
  'session_not_found',
  'user_not_found',
]

export async function getUserSafe(supabase: SupabaseClient, timeoutMs = 8000) {
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth_timeout')), timeoutMs)
      ),
    ])

    if (result.error) {
      const code = (result.error as { code?: string }).code
      console.error('[getUserSafe] error de auth.getUser():', result.error.message, code)
      if (code && INVALID_SESSION_CODES.includes(code)) {
        // Esto sí es una sesión rota de verdad: limpiamos.
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      }
      // Error transitorio (red, 500, etc.): NO tocamos la sesión,
      // simplemente devolvemos null para esta llamada puntual.
      return null
    }

    return result.data.user
  } catch (e) {
    // Se colgó por timeout o falló la red: NO es evidencia de que el
    // token sea inválido. No cerramos sesión, solo devolvemos null
    // para que esta pantalla no se trabe.
    console.error('[getUserSafe] timeout o error de red:', e instanceof Error ? e.message : e)
    return null
  }
}