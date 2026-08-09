"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setUserEnabled, setUserRole } from "@/app/actions/admin"
import { formatDate } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, ShieldCheck, Loader2, UserCog } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type AdminUser = {
  id: string
  name: string
  email: string
  enabled: boolean
  role: string
  createdAt: Date
}

export function EmployeesSection({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[]
  currentUserId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function toggleEnabled(u: AdminUser) {
    setBusyId(u.id)
    startTransition(async () => {
      try {
        await setUserEnabled(u.id, !u.enabled)
        toast.success(
          !u.enabled
            ? `${u.name} ahora puede ver todo.`
            : `${u.name} quedó sin acceso.`,
        )
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo actualizar.")
      } finally {
        setBusyId(null)
      }
    })
  }

  function toggleRole(u: AdminUser) {
    const nextRole = u.role === "admin" ? "employee" : "admin"
    setBusyId(u.id)
    startTransition(async () => {
      try {
        await setUserRole(u.id, nextRole)
        toast.success(
          nextRole === "admin"
            ? `${u.name} ahora es administrador.`
            : `${u.name} ahora es empleado.`,
        )
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo cambiar el rol.")
      } finally {
        setBusyId(null)
      }
    })
  }

  const pending = initialUsers.filter((u) => !u.enabled)
  const active = initialUsers.filter((u) => u.enabled)

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground text-pretty">
            Solo las personas <span className="font-semibold text-foreground">habilitadas</span>{" "}
            por vos pueden ver los clientes y proveedores. Habilitá a tus empleados
            cuando se registren.
          </p>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Esperando permiso ({pending.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {pending.map((u) => (
              <li key={u.id}>
                <UserRow
                  user={u}
                  currentUserId={currentUserId}
                  busy={busyId === u.id && isPending}
                  onToggleEnabled={() => toggleEnabled(u)}
                  onToggleRole={() => toggleRole(u)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Con acceso ({active.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {active.map((u) => (
            <li key={u.id}>
              <UserRow
                user={u}
                currentUserId={currentUserId}
                busy={busyId === u.id && isPending}
                onToggleEnabled={() => toggleEnabled(u)}
                onToggleRole={() => toggleRole(u)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function UserRow({
  user,
  currentUserId,
  busy,
  onToggleEnabled,
  onToggleRole,
}: {
  user: AdminUser
  currentUserId: string
  busy: boolean
  onToggleEnabled: () => void
  onToggleRole: () => void
}) {
  const isSelf = user.id === currentUserId
  const isAdmin = user.role === "admin"

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-foreground">{user.name}</span>
            {isAdmin && (
              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                <ShieldCheck className="h-3 w-3" />
                Admin
              </Badge>
            )}
            {isSelf && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                Vos
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="text-[11px] text-muted-foreground">
            Registrado {formatDate(user.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isSelf && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={onToggleRole}
              disabled={busy}
              aria-label={isAdmin ? "Quitar admin" : "Hacer admin"}
              title={isAdmin ? "Pasar a empleado" : "Hacer administrador"}
            >
              <UserCog className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant={user.enabled ? "outline" : "default"}
            onClick={onToggleEnabled}
            disabled={busy || isSelf}
            className={cn(
              !user.enabled && "bg-success text-success-foreground hover:bg-success/90",
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : user.enabled ? (
              <>
                <X className="h-4 w-4" />
                Quitar
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Habilitar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
