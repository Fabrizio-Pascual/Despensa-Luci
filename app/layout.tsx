import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/server'
import { getUserSafe } from '@/lib/supabase/get-user-safe'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Despensa Luci - Tu despensa de barrio',
  description: 'Hace tu pedido online y retiralo en el local. Gaseosas, lacteos, fiambres, snacks y mas.',
  keywords: ['despensa', 'almacen', 'supermercado', 'pedidos online', 'retiro en local'],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Resolvemos quién está logueado ACÁ, en el servidor, usando las cookies
  // que ya llegaron con la request. Así el cliente nunca arranca "a ciegas":
  // no hay más flash de deslogueado -> logueado -> admin al hacer F5,
  // porque el primer render ya sale con el estado correcto.
  //
  // IMPORTANTE: esto corre en CADA navegación (no solo en el F5 inicial),
  // porque este layout envuelve toda la app. Si Supabase tiene un pico de
  // lentitud o un error puntual acá y lo dejamos explotar, se rompe la
  // página ENTERA para esa navegación (categorías, carrito, reseñas, todo
  // lo que cuelga de este layout) — no solo el login. Por eso usamos
  // getUserSafe (con timeout) y nunca dejamos que un error acá tire abajo
  // el resto de la app: en el peor caso, seguimos sin user/profile y el
  // AuthProvider los termina de resolver del lado del cliente como antes.
  const supabase = await createClient()
  const user = await getUserSafe(supabase, 4000)

  let profile = null
  if (user) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) console.error('[layout] error cargando profile en servidor:', error.message)
      else profile = data
    } catch (e) {
      console.error('[layout] excepción cargando profile en servidor:', e instanceof Error ? e.message : e)
    }
  }

  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider
            initialUser={user ? { id: user.id, email: user.email ?? undefined } : null}
            initialProfile={profile}
          >
            {children}
            <div id="portal-root" />
            <Toaster position="top-center" richColors closeButton duration={3000} />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}