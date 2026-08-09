"use client"

import { Users, Truck, ShieldCheck, ScanBarcode, Plus } from "lucide-react"

export function MobileBottomNav({
  tab,
  onTabChange,
  isAdmin,
}: {
  tab: string
  onTabChange: (tab: string) => void
  isAdmin: boolean
}) {
  const itemClass = (active: boolean) =>
    `flex flex-1 h-full flex-col items-center justify-center gap-0.5 premium-transition ${
      active ? "text-primary" : "text-muted-foreground"
    }`
  const labelClass = "text-[10px] font-medium leading-none"

  return (
    <nav
      className="glass fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-x-0 border-b-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex w-full h-14">
        <button type="button" onClick={() => onTabChange("clientes")} className={itemClass(tab === "clientes")}>
          <Users className="h-5 w-5" />
          <span className={labelClass}>Clientes</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("proveedores")}
          className={itemClass(tab === "proveedores")}
        >
          <Truck className="h-5 w-5" />
          <span className={labelClass}>Proveedores</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("productos")}
          className="flex flex-1 h-full flex-col items-center justify-center gap-0.5"
          aria-label="Productos"
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md -mt-4 ${
              tab === "productos" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <ScanBarcode className="h-5 w-5" />
          </span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => onTabChange("empleados")}
            className={itemClass(tab === "empleados")}
          >
            <ShieldCheck className="h-5 w-5" />
            <span className={labelClass}>Empleados</span>
          </button>
        )}
      </div>
    </nav>
  )
}
