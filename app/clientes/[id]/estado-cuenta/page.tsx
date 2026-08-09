import { getCustomerStatement } from "@/app/actions/customers"
import { formatMoney, formatDateTime } from "@/lib/format"
import { PrintButton } from "@/components/print-button"
import { notFound } from "next/navigation"

export default async function EstadoCuentaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customerId = Number(id)
  if (!Number.isFinite(customerId)) notFound()

  const { customer, purchases, pendiente, pagadoHistorico } = await getCustomerStatement(customerId)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <a href="/" className="text-sm text-muted-foreground hover:underline">
          ← Volver
        </a>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 print:rounded-none print:border-0 print:p-0">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="font-serif text-xl font-semibold text-foreground">
              Despensa de la Luci
            </h1>
            <p className="text-sm text-muted-foreground">Estado de cuenta — Fiado</p>
          </div>
          <p className="text-xs text-muted-foreground">{formatDateTime(new Date())}</p>
        </div>

        <div className="mb-6">
          <p className="text-lg font-semibold text-foreground">{customer.name}</p>
          {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
          {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-destructive/10 p-4">
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="text-xl font-bold text-destructive">{formatMoney(pendiente)}</p>
          </div>
          <div className="rounded-xl bg-success/10 p-4">
            <p className="text-xs text-muted-foreground">Pagado histórico</p>
            <p className="text-xl font-bold text-success">{formatMoney(pagadoHistorico)}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">Fecha</th>
              <th className="py-2 font-medium">Detalle</th>
              <th className="py-2 text-right font-medium">Monto</th>
              <th className="py-2 text-right font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-b border-border/60">
                <td className="py-2 align-top text-xs text-muted-foreground">
                  {formatDateTime(p.createdAt)}
                </td>
                <td className="py-2 align-top">{p.description}</td>
                <td className="py-2 text-right align-top font-medium">{formatMoney(Number(p.amount))}</td>
                <td className="py-2 text-right align-top text-xs">
                  {p.paid ? (
                    <span className="text-success">Pagado</span>
                  ) : (
                    <span className="text-destructive">Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  Todavía no hay movimientos anotados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
