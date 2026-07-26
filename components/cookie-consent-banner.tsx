'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CONSENT_KEY = 'despensa-luci-cookie-consent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const consent = window.localStorage.getItem(CONSENT_KEY)
      if (!consent) setVisible(true)
    } catch {
      // localStorage no disponible (modo privado, etc.): no mostramos el banner
      // para no romper la navegación.
    }
  }, [])

  const aceptar = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ status: 'accepted', date: new Date().toISOString() }))
    } catch {}
    setVisible(false)
  }

  const soloNecesarias = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ status: 'necessary-only', date: new Date().toISOString() }))
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-5"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-xl px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Cookie className="hidden sm:block h-8 w-8 text-primary shrink-0" aria-hidden="true" />
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          Usamos cookies necesarias para que el sitio funcione (sesión, carrito) y, si aceptás, para mejorar tu
          experiencia. Podés leer más en nuestra{' '}
          <Link href="/cookies" className="text-primary hover:underline font-medium">
            Política de Cookies
          </Link>{' '}
          y en los{' '}
          <Link href="/terminos" className="text-primary hover:underline font-medium">
            Términos y Condiciones
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={soloNecesarias}>
            Solo necesarias
          </Button>
          <Button size="sm" onClick={aceptar}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}
