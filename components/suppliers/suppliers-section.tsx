"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { SupplierWithBalance } from "@/app/actions/suppliers"
import { formatMoney } from "@/lib/format"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AddSupplierDialog } from "@/components/suppliers/add-supplier-dialog"
import { SupplierCard } from "@/components/suppliers/supplier-card"
import { Search, Truck } from "lucide-react"

export function SuppliersSection({
  initialSuppliers,
}: {
  initialSuppliers: SupplierWithBalance[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 6000)
    return () => clearInterval(interval)
  }, [router])

  const totalToPay = useMemo(
    () => initialSuppliers.reduce((sum, s) => sum + s.toPay, 0),
    [initialSuppliers],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initialSuppliers
    return initialSuppliers.filter((s) => s.name.toLowerCase().includes(q))
  }, [initialSuppliers, query])

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Total a pagar a proveedores
            </p>
            <p className="font-serif text-2xl font-semibold text-primary">
              {formatMoney(totalToPay)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">Proveedores</p>
            <p className="font-serif text-2xl font-semibold text-foreground">
              {initialSuppliers.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proveedor..."
            className="pl-9"
            aria-label="Buscar proveedor"
          />
        </div>
        <AddSupplierDialog onDone={() => router.refresh()} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasSuppliers={initialSuppliers.length > 0} />
      ) : (
        <ul className="reveal-sequential flex flex-col gap-3">
          {filtered.map((supplier) => (
            <li key={supplier.id}>
              <SupplierCard supplier={supplier} onChange={() => router.refresh()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyState({ hasSuppliers }: { hasSuppliers: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Truck className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          {hasSuppliers
            ? "No se encontró ningún proveedor con ese nombre."
            : "Todavía no cargaste proveedores. Tocá “Agregar” para empezar."}
        </p>
      </CardContent>
    </Card>
  )
}
