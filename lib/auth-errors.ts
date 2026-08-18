/**
 * Traduce los mensajes de error de Supabase Auth (vienen en inglés,
 * técnicos) a algo que un cliente de la despensa pueda entender.
 * Si no reconocemos el mensaje, devolvemos un genérico en español en
 * vez de mostrar el texto técnico crudo — nunca mostramos errores
 * técnicos directo al usuario.
 */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase()

  if (m.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (m.includes('email not confirmed')) {
    return 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada.'
  }
  if (m.includes('user already registered') || m.includes('already registered')) {
    return 'Ya existe una cuenta con ese email. Probá iniciar sesión.'
  }
  if (m.includes('password should be at least')) {
    return 'La contraseña tiene que tener al menos 6 caracteres.'
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'Ese email no parece válido.'
  }
  if (m.includes('rate limit')) {
    return 'Demasiados intentos. Esperá un momento y probá de nuevo.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Sin conexión. Revisá tu internet e intentá de nuevo.'
  }

  return 'No pudimos completar la acción. Intentá de nuevo en un momento.'
}
