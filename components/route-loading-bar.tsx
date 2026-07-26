'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Barra de carga global (arriba de la pantalla), con la temática de la
 * marca (gradiente primary -> accent). Se activa sola con cualquier click
 * en un <a>/<Link> interno de la app -sin tener que tocar cada botón o
 * link uno por uno- y se completa cuando la navegación termina (cambia el
 * pathname). Así el usuario siempre ve que "algo está pasando" al navegar
 * entre páginas, no solo al enviar datos.
 */
export function RouteLoadingBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
    setVisible(true)
    setProgress(12)
    let current = 12
    intervalRef.current = setInterval(() => {
      // Avanza rápido al principio y se frena cerca del final, como si
      // fuera cargando de verdad, hasta que la navegación cierre el ciclo.
      current = Math.min(current + Math.random() * 8, 88)
      setProgress(current)
    }, 180)
  }

  function finish() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!activeRef.current) return
    setProgress(100)
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
      activeRef.current = false
    }, 220)
  }

  // Cuando cambia la ruta, la navegación terminó: completamos y ocultamos.
  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[200] h-[3px] bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%`, boxShadow: '0 0 8px var(--color-primary)' }}
      />
    </div>
  )
}
