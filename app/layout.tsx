import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
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