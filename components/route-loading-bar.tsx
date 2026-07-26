'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Store } from 'lucide-react'

/**
 * Pantalla de carga a pantalla completa con la identidad de Despensa Luci.
 * Se activa sola con cualquier click en un <a>/<Link> interno de la app
 * -sin tocar cada botón/link uno por uno- y se cierra cuando la navegación
 * termina (cambia el pathname). Así el usuario siempre ve que "se está
 * enviando/cargando algo" al moverse entre pantallas.
 */
export function RouteLoadingBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    function isInternalNavigableLink(el: HTMLAnchorElement) {
      const href = el.getAttribute('href')
      if (!href) return false
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false
      if (el.target === '_blank' || el.hasAttribute('download')) return false
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return false
        if (url.pathname === window.location.pathname && url.search === window.location.search) return false
        return true
      } catch {
        return false
      }
    }

    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement)?.closest('a')
      if (!anchor || !isInternalNavigableLink(anchor)) return
      start()
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  function start() {
    if (activeRef.current) return
    activeRef.current = true
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    setClosing(false)
    setVisible(true)
  }

  function finish() {
    if (!activeRef.current) return
    // Transición corta de salida (fade) en vez de un corte seco.
    setClosing(true)
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false)
      setClosing(false)
      activeRef.current = false
    }, 180)
  }

  // Cuando cambia la ruta, la navegación terminó: cerramos la pantalla de carga.
  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 glass transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent opacity-90 animate-pulse" />
        <span className="absolute inset-0 rounded-2xl border-2 border-primary/40 border-t-primary animate-spin" />
        <Store className="relative h-7 w-7 text-primary-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground tracking-wide">Cargando…</p>
    </div>
  )
}
