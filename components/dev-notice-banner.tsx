'use client'

import { useEffect, useState } from 'react'
import { HardHat, Mail, X } from 'lucide-react'

const SHOWN_KEY = 'despensa-luci-dev-notice-shown'
// Tiempo de espera antes de mostrar el aviso, para no interrumpir
// el primer vistazo del usuario a la página.
const SHOW_DELAY_MS = 2500

export function DevNoticeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let alreadyShown = false
    try {
      alreadyShown = window.sessionStorage.getItem(SHOWN_KEY) === '1'
    } catch {
      // sessionStorage no disponible (modo privado, etc.): mostramos igual,
      // simplemente no vamos a poder recordar que ya se vio.
    }

    if (alreadyShown) return

    const timer = window.setTimeout(() => {
      setVisible(true)
      try {
        window.sessionStorage.setItem(SHOWN_KEY, '1')
      } catch {}
    }, SHOW_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Aviso: sitio en construcción"
      className="fixed inset-x-0 top-0 z-[100] p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-card/95 backdrop-blur-md shadow-xl shadow-black/20 px-4 py-3.5 sm:px-5 sm:py-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
          <HardHat className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Estamos construyendo Despensa Luci
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            La página todavía está en proceso de elaboración: la vamos mejorando paso a paso, así
            que podés encontrarte con algunos cambios de diseño o productos que por ahora no están
            disponibles. Si tenés algún inconveniente, escribinos y te ayudamos.
          </p>
          <a
            href="mailto:fpascual624@gmail.com?subject=Ayuda%20-%20Despensa%20Luci&body=Hola%2C%20necesito%20ayuda%20con..."
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            Contactar soporte
          </a>
        </div>

        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
