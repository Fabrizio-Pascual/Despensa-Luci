import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Verificar si el usuario está baneado
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, is_admin')
      .eq('id', user.id)
      .single()

    if (profile?.is_banned && !path.startsWith('/auth')) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('banned', '1')
      return NextResponse.redirect(url)
    }

    // Admin solo para admins
    if (path.startsWith('/admin') && !profile?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Rutas que requieren login
  const protectedRoutes = ['/dashboard', '/checkout']
  const isProtected = protectedRoutes.some(route => path.startsWith(route))
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  // Admin sin login
  if (path.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Si está logueado no puede ir a login/register
  if (user && (path.startsWith('/auth/login') || path.startsWith('/auth/sign-up'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}