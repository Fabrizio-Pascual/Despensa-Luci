"use client"

import type React from "react"
import { useState, useTransition } from "react"
import type { CustomerWithBalance } from "@/app/actions/customers"
import {
  getCustomerPurchases,
  addPurchase,
  togglePurchasePaid,
  payAllForCustomer,
  deletePurchase,
  deleteCustomer,
} from "@/app/actions/customers"
import { formatMoney, formatDateTime } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ChevronDown,
  Phone,
  Plus,
  Check,
  Loader2,
  Trash2,
  CheckCheck,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { FileText } from "lucide-react"

type Purchase = {
  id: number
  customerId: number
  description: string
  amount: string
  paid: boolean
  paidAt: Date | null
  createdByUserId: string
  createdByName: string | null
  createdAt: Date
}

export function CustomerCard({
  customer,
  onChange,
}: {
  customer: CustomerWithBalance
  onChange: () => void
}) {
  const [open, setOpen] = useState(false)
  const [purchases, setPurchases] = useState<Purchase[] | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Add purchase form
  const [desc, setDesc] = useState("")
  const [amount, setAmount] = useState("")
  const [adding, setAdding] = useState(false)

  async function loadPurchases() {
    setLoadingList(true)
    try {
      const data = (await getCustomerPurchases(customer.id)) as Purchase[]
      setPurchases(data)
    } catch {
      toast.error("No se pudieron cargar las compras.")
    } finally {
      setLoadingList(false)
    }
  }

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && purchases === null) loadPurchases()
  }

  function refreshAll() {
    loadPurchases()
    onChange()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error("Anotá un monto mayor a 0.")
      return
    }
    setAdding(true)
    try {
      await addPurchase({
        customerId: customer.id,
        description: desc.trim() || "Fiado",
        amount: Number(amount || 0),
      })
      setDesc("")
      setAmount("")
      toast.success("Anotado.")
      refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo anotar.")
    } finally {
      setAdding(false)
    }
  }

  function handleTogglePaid(p: Purchase) {
    startTransition(async () => {
      try {
        await togglePurchasePaid(p.id, !p.paid)
        refreshAll()
      } catch {
        toast.error("No se pudo actualizar.")
      }
    })
  }

  function handlePayAll() {
    startTransition(async () => {
      try {
        await payAllForCustomer(customer.id)
        toast.success("Cuenta saldada. Quedó marcado con tilde.")
        refreshAll()
      } catch {
        toast.error("No se pudo saldar la cuenta.")
      }
    })
  }

  function handleDeletePurchase(id: number) {
    startTransition(async () => {
      try {
        await deletePurchase(id)
        refreshAll()
      } catch {
        toast.error("No se pudo borrar.")
      }
    })
  }

  function handleDeleteCustomer() {
    if (
      !confirm(
        `¿Borrar a ${customer.name} y todas sus compras? Esto no se puede deshacer.`,
      )
    )
      return
    startTransition(async () => {
      try {
        await deleteCustomer(customer.id)
        toast.success("Cliente borrado.")
        onChange()
      } catch {
        toast.error("No se pudo borrar el cliente.")
      }
    })
  }

  const hasDebt = customer.balance > 0

  return (
    <Card className={cn("overflow-hidden premium-transition", open && "ring-1 ring-primary/20")}>
      <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {customer.name}
            </span>
            {customer.phone && (
              <Phone className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          {customer.note && (
            <p className="truncate text-xs text-muted-foreground">{customer.note}</p>
          )}
          {customer.email && (
            <p className="truncate text-[11px] text-muted-foreground">
              🔗 {customer.email} · puede pagar con Fiado en la tienda online
            </p>
          )}
        </div>

        <div className="flex flex-col items-end">
          {hasDebt ? (
            <>
              <span className="font-serif text-base font-semibold text-accent">
                {formatMoney(customer.balance)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {customer.pendingCount} sin pagar
              </span>
            </>
          ) : (
            <Badge className="gap-1 bg-success text-success-foreground hover:bg-success">
              <Check className="h-3 w-3" />
              Al día
            </Badge>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <CardContent className="border-t border-border bg-muted/20 px-4 py-4">
          {/* Add purchase */}
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor={`desc-${customer.id}`} className="text-xs">
                ¿Qué llevó? (opcional)
              </Label>
              <Input
                id={`desc-${customer.id}`}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ej: 2 panes, 1 leche"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:w-32">
              <Label htmlFor={`amt-${customer.id}`} className="text-xs">
                Monto ($)
              </Label>
              <Input
                id={`amt-${customer.id}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            <Button type="submit" disabled={adding} className="shrink-0">
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Anotar
            </Button>
          </form>

          <Separator className="my-4" />

          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Historial</p>
              {purchases && purchases.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Histórico fiado: {formatMoney(purchases.reduce((s, p) => s + Number(p.amount), 0))}
                  {" · "}
                  Pagado: {formatMoney(purchases.filter(p => p.paid).reduce((s, p) => s + Number(p.amount), 0))}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clientes/${customer.id}/estado-cuenta`} target="_blank">
                <FileText className="h-3.5 w-3.5" />
                Estado de cuenta
              </Link>
            </Button>
          </div>

          {/* Purchase history */}
          {loadingList ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : purchases && purchases.length > 0 ? (
            <>
              <ul className="flex flex-col gap-2">
                {purchases.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2",
                      p.paid && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleTogglePaid(p)}
                      disabled={isPending}
                      aria-label={p.paid ? "Marcar como no pagado" : "Marcar como pagado"}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                        p.paid
                          ? "border-success bg-success text-success-foreground"
                          : "border-input bg-background hover:border-success",
                      )}
                    >
                      {p.paid && <Check className="h-4 w-4" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium text-foreground",
                          p.paid && "line-through",
                        )}
                      >
                        {p.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(p.createdAt)}
                        {p.createdByName ? ` · ${p.createdByName}` : ""}
                        {p.paid && p.paidAt ? ` · pagado ${formatDateTime(p.paidAt)}` : ""}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 font-semibold text-foreground",
                        p.paid && "line-through",
                      )}
                    >
                      {formatMoney(Number(p.amount))}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeletePurchase(p.id)}
                      disabled={isPending}
                      aria-label="Borrar anotación"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleDeleteCustomer}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar cliente
                </Button>
                {hasDebt && (
                  <Button
                    type="button"
                    onClick={handlePayAll}
                    disabled={isPending}
                    className="bg-success text-success-foreground hover:bg-success/90"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4" />
                    )}
                    Pagó todo ({formatMoney(customer.balance)})
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Todavía no hay nada anotado para {customer.name}.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={handleDeleteCustomer}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Borrar cliente
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
