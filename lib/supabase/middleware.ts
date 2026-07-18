import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: no correr lógica pesada acá.
  // Solo refrescamos la sesión / cookies.
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Rutas que requieren login
  const protectedRoutes = ['/dashboard', '/checkout']
  const isProtected = protectedRoutes.some(route => path.startsWith(route))
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  // Admin: solo verificamos que haya login. La verificación de is_admin
  // se hace DENTRO del layout del admin (server component), no acá.
  if (path.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Si está logueado no puede ir a login/register
  if (user && (path.startsWith('/auth/login') || path.startsWith('/auth/sign-up'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}