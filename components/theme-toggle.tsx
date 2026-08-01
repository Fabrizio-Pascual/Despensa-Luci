'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Botón para alternar entre modo claro y oscuro.
 * Antes el tema estaba forzado a "dark" (forcedTheme en el ThemeProvider),
 * por eso no existía este botón. Ahora que se sacó ese forzado, este
 * componente permite cambiar y persiste la elección (next-themes la guarda
 * sola en localStorage).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evita mismatch de hidratación: hasta que el componente esté montado
  // en el cliente no sabemos el tema real (podría depender de localStorage).
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={`rounded-full ${className}`} disabled>
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`rounded-full hover:bg-secondary/50 ${className}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
