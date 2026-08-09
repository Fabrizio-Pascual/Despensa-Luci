"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { signIn, signUp } from "@/lib/auth-client"
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
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const isSignUp = mode === "sign-up"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await signUp.email({ email, password, name })
        if (error) {
          toast.error(error.message ?? "No se pudo crear la cuenta.")
          return
        }
        toast.success("Cuenta creada. Esperá a que el administrador te habilite.")
      } else {
        const { error } = await signIn.email({ email, password })
        if (error) {
          toast.error(error.message ?? "Email o contraseña incorrectos.")
          return
        }
      }
      router.push("/")
      router.refresh()
    } catch {
      toast.error("Ocurrió un error. Probá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo-despensa.png"
          alt="Logo de la Despensa de la Luci"
          width={72}
          height={72}
          className="h-16 w-16 object-contain"
          priority
        />
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground text-balance">
            Despensa de la Luci
          </h1>
          <p className="text-sm text-muted-foreground">Cuentas y proveedores</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Registrate. El administrador te va a habilitar para poder ver todo."
              : "Ingresá con tu email y contraseña."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              )}
              {!isSignUp && (
                <Link href="/forgot-password" className="text-xs text-primary hover:underline self-end">
                  ¿Olvidaste tu contraseña?
                </Link>
              )}
            </div>

            <Button type="submit" disabled={loading} className="mt-1 w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? "Crear cuenta" : "Entrar"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignUp ? (
              <>
                ¿Ya tenés cuenta?{" "}
                <Link href="/sign-in" className="font-semibold text-primary hover:underline">
                  Iniciar sesión
                </Link>
              </>
            ) : (
              <>
                ¿No tenés cuenta?{" "}
                <Link href="/sign-up" className="font-semibold text-primary hover:underline">
                  Registrate
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
