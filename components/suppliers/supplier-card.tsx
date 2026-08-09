"use client"

import type React from "react"
import { useState, useTransition } from "react"
import type { SupplierWithBalance } from "@/app/actions/suppliers"
import {
  getSupplierOrders,
  addOrder,
  setOrderStatus,
  toggleOrderPaid,
  toggleOrderUrgent,
  deleteOrder,
  deleteSupplier,
} from "@/app/actions/suppliers"
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
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Order = {
  id: number
  supplierId: number
  items: string
  cost: string
  amountToPay: string
  status: string
  urgent: boolean
  paid: boolean
  paidAt: Date | null
  createdByUserId: string
  createdByName: string | null
  createdAt: Date
}

const STATUSES = [
  { value: "pendiente", label: "Encargar" },
  { value: "encargado", label: "Encargado" },
  { value: "recibido", label: "Recibido" },
] as const

const STATUS_STYLES: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning-foreground border-warning/40",
  encargado: "bg-primary/10 text-primary border-primary/40",
  recibido: "bg-success/15 text-success border-success/40",
}

export function SupplierCard({
  supplier,
  onChange,
}: {
  supplier: SupplierWithBalance
  onChange: () => void
}) {
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [items, setItems] = useState("")
  const [cost, setCost] = useState("")
  const [toPay, setToPay] = useState("")
  const [adding, setAdding] = useState(false)

  async function loadOrders() {
    setLoadingList(true)
    try {
      const data = (await getSupplierOrders(supplier.id)) as Order[]
      setOrders(data)
    } catch {
      toast.error("No se pudieron cargar los pedidos.")
    } finally {
      setLoadingList(false)
    }
  }

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && orders === null) loadOrders()
  }

  function refreshAll() {
    loadOrders()
    onChange()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!items.trim()) {
      toast.error("Anotá qué hay que encargar.")
      return
    }
    setAdding(true)
    try {
      await addOrder({
        supplierId: supplier.id,
        items,
        cost: Number(cost || 0),
        amountToPay: Number(toPay || 0),
      })
      setItems("")
      setCost("")
      setToPay("")
      toast.success("Pedido anotado.")
      refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo anotar.")
    } finally {
      setAdding(false)
    }
  }

  function handleStatus(order: Order, status: string) {
    startTransition(async () => {
      try {
        await setOrderStatus(order.id, status)
        refreshAll()
      } catch {
        toast.error("No se pudo cambiar el estado.")
      }
    })
  }

  function handleTogglePaid(order: Order) {
    startTransition(async () => {
      try {
        await toggleOrderPaid(order.id, !order.paid)
        refreshAll()
      } catch {
        toast.error("No se pudo actualizar el pago.")
      }
    })
  }

  function handleToggleUrgent(order: Order) {
    startTransition(async () => {
      try {
        await toggleOrderUrgent(order.id, !order.urgent)
        refreshAll()
      } catch {
        toast.error("No se pudo marcar como urgente.")
      }
    })
  }

  function handleDeleteOrder(id: number) {
    startTransition(async () => {
      try {
        await deleteOrder(id)
        refreshAll()
      } catch {
        toast.error("No se pudo borrar el pedido.")
      }
    })
  }

  function handleDeleteSupplier() {
    if (
      !confirm(
        `¿Borrar a ${supplier.name} y todos sus pedidos? Esto no se puede deshacer.`,
      )
    )
      return
    startTransition(async () => {
      try {
        await deleteSupplier(supplier.id)
        toast.success("Proveedor borrado.")
        onChange()
      } catch {
        toast.error("No se pudo borrar el proveedor.")
      }
    })
  }

  const hasToPay = supplier.toPay > 0

  return (
    <Card className={cn("overflow-hidden premium-transition", open && "ring-1 ring-primary/20")}>
      <div className="h-1 w-full bg-gradient-to-r from-accent to-primary" />
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {supplier.name}
            </span>
            {supplier.phone && (
              <Phone className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            {supplier.urgentOrders > 0 && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <AlertTriangle className="h-3 w-3" />
                Urgente
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {supplier.pendingOrders > 0
              ? `${supplier.pendingOrders} pedido${supplier.pendingOrders > 1 ? "s" : ""} en curso`
              : supplier.note || "Sin pedidos pendientes"}
          </p>
        </div>

        <div className="flex flex-col items-end">
          {hasToPay ? (
            <>
              <span className="font-serif text-base font-semibold text-primary">
                {formatMoney(supplier.toPay)}
              </span>
              <span className="text-[11px] text-muted-foreground">a pagar</span>
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
          {/* Add order */}
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`items-${supplier.id}`} className="text-xs">
                ¿Qué hay que encargar / qué trae?
              </Label>
              <Input
                id={`items-${supplier.id}`}
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder="Ej: 3 cajones de gaseosa, 10 kg de azúcar"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`cost-${supplier.id}`} className="text-xs">
                  Cuánto sale ($)
                </Label>
                <Input
                  id={`cost-${supplier.id}`}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`pay-${supplier.id}`} className="text-xs">
                  A pagar ($)
                </Label>
                <Input
                  id={`pay-${supplier.id}`}
                  value={toPay}
                  onChange={(e) => setToPay(e.target.value)}
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
            </div>
          </form>

          <Separator className="my-4" />

          {/* Orders list */}
          {loadingList ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : orders && orders.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5",
                    o.urgent ? "border-destructive/50 bg-destructive/5" : "border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground text-pretty">
                        {o.urgent && (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        {o.items}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(o.createdAt)}
                        {o.createdByName ? ` · ${o.createdByName}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7",
                          o.urgent
                            ? "text-destructive hover:text-destructive"
                            : "text-muted-foreground hover:text-destructive",
                        )}
                        onClick={() => handleToggleUrgent(o)}
                        disabled={isPending}
                        aria-label={o.urgent ? "Quitar urgente" : "Marcar urgente"}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteOrder(o.id)}
                        disabled={isPending}
                        aria-label="Borrar pedido"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Sale:{" "}
                      <span className="font-semibold text-foreground">
                        {formatMoney(Number(o.cost))}
                      </span>
                    </span>
                    <span>
                      A pagar:{" "}
                      <span className="font-semibold text-primary">
                        {formatMoney(Number(o.amountToPay))}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Status selector */}
                    <div className="flex gap-1">
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => handleStatus(o, s.value)}
                          disabled={isPending}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            o.status === s.value
                              ? STATUS_STYLES[s.value]
                              : "border-input bg-background text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Paid checkbox */}
                    <button
                      type="button"
                      onClick={() => handleTogglePaid(o)}
                      disabled={isPending}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        o.paid
                          ? "border-success bg-success text-success-foreground"
                          : "border-input bg-background text-muted-foreground hover:border-success",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border",
                          o.paid ? "border-success-foreground" : "border-current",
                        )}
                      >
                        {o.paid && <Check className="h-3 w-3" />}
                      </span>
                      {o.paid ? "Pagado" : "Marcar pagado"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no hay pedidos anotados para {supplier.name}.
            </p>
          )}

          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleDeleteSupplier}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              Borrar proveedor
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
