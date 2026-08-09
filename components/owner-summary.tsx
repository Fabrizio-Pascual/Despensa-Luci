import { formatMoney } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, HandCoins } from "lucide-react"
import type { OwnerSummary } from "@/app/actions/summary"

export function OwnerSummaryBanner({ summary }: { summary: OwnerSummary }) {
  const items = [
    {
      label: "Fiado esta semana",
      value: summary.fiadoSemana,
      icon: TrendingUp,
      tone: "text-foreground",
    },
    {
      label: "Cobrado esta semana",
      value: summary.cobradoSemana,
      icon: HandCoins,
      tone: "text-success",
    },
    {
      label: "Pagado a proveedores",
      value: summary.pagadoProveedoresSemana,
      icon: TrendingDown,
      tone: "text-foreground",
    },
    {
      label: "Deuda total pendiente",
      value: summary.deudaTotalClientes,
      icon: Wallet,
      tone: "text-destructive",
    },
  ]

  return (
    <Card className="mb-5 border-primary/20 bg-primary/5">
      <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </div>
            <p className={`text-lg font-semibold ${item.tone}`}>{formatMoney(item.value)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
