"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, KeyRound, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Leemos el token directo de la URL del navegador, ya con la página
  // cargada del todo (evita líos de pre-renderizado en el servidor).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get("token"))
    setReady(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      toast.error("Este link no es válido. Pedí uno nuevo.")
      return
    }
    setLoading(true)
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token })
      if (error) {
        toast.error(error.message ?? "No se pudo cambiar la contraseña.")
        return
      }
      setDone(true)
      setTimeout(() => router.push("/sign-in"), 1500)
    } catch {
      toast.error("Ocurrió un error. Probá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Nueva contraseña</CardTitle>
          <CardDescription>
            {ready && !token
              ? "Este link no tiene token. Pedí uno nuevo desde 'Olvidé mi contraseña'."
              : "Elegí tu nueva contraseña."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle className="h-8 w-8 text-success" />
              <p className="text-sm text-muted-foreground">Contraseña actualizada. Redirigiendo...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña nueva</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              </div>
              <Button type="submit" disabled={loading || !ready || !token} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar contraseña
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/sign-in" className="font-semibold text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
