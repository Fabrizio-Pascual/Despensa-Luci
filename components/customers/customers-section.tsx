"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { CustomerWithBalance } from "@/app/actions/customers"
import { formatMoney } from "@/lib/format"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog"
import { CustomerCard } from "@/components/customers/customer-card"
import { Search, Users } from "lucide-react"

export function CustomersSection({
  initialCustomers,
}: {
  initialCustomers: CustomerWithBalance[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  // Como puede haber más de un empleado usando esto al mismo tiempo,
  // refrescamos los datos solos cada pocos segundos (sin que haga falta
  // recargar la página a mano) para que todos vean lo mismo.
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 6000)
    return () => clearInterval(interval)
  }, [router])

  const totalDebt = useMemo(
    () => initialCustomers.reduce((sum, c) => sum + c.balance, 0),
    [initialCustomers],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initialCustomers
    return initialCustomers.filter((c) => c.name.toLowerCase().includes(q))
  }, [initialCustomers, query])

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Total fiado (sin pagar)
            </p>
            <p className="font-serif text-2xl font-semibold text-accent">
              {formatMoney(totalDebt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">Clientes</p>
            <p className="font-serif text-2xl font-semibold text-foreground">
              {initialCustomers.length}
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
            placeholder="Buscar cliente..."
            className="pl-9"
            aria-label="Buscar cliente"
          />
        </div>
        <AddCustomerDialog onDone={() => router.refresh()} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasCustomers={initialCustomers.length > 0} />
      ) : (
        <ul className="reveal-sequential flex flex-col gap-3">
          {filtered.map((customer) => (
            <li key={customer.id}>
              <CustomerCard customer={customer} onChange={() => router.refresh()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyState({ hasCustomers }: { hasCustomers: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Users className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          {hasCustomers
            ? "No se encontró ningún cliente con ese nombre."
            : "Todavía no anotaste ningún cliente. Tocá “Agregar” para empezar."}
        </p>
      </CardContent>
    </Card>
  )
}
