"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"

export function SignOutButton({
  variant = "ghost",
  className,
}: {
  variant?: "ghost" | "outline" | "default"
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleSignOut}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      <span>Salir</span>
    </Button>
  )
}
