"use server"

import { db } from "@/lib/db"
import { customerPurchases, supplierOrders } from "@/lib/db/schema"
import { requireEnabledUser } from "@/lib/session"
import { and, eq, gte, sql } from "drizzle-orm"

export type OwnerSummary = {
  fiadoSemana: number
  cobradoSemana: number
  pagadoProveedoresSemana: number
  deudaTotalClientes: number
  deudaTotalProveedores: number
}

export async function getOwnerSummary(): Promise<OwnerSummary> {
  const user = await requireEnabledUser()
  if (user.role !== "admin") {
    // Solo el dueño ve el resumen general.
    return {
      fiadoSemana: 0,
      cobradoSemana: 0,
      pagadoProveedoresSemana: 0,
      deudaTotalClientes: 0,
      deudaTotalProveedores: 0,
    }
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [fiadoRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${customerPurchases.amount}), 0)` })
    .from(customerPurchases)
    .where(gte(customerPurchases.createdAt, weekAgo))

  const [cobradoRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${customerPurchases.amount}), 0)` })
    .from(customerPurchases)
    .where(and(eq(customerPurchases.paid, true), gte(customerPurchases.paidAt, weekAgo)))

  const [pagadoProvRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${supplierOrders.amountToPay}), 0)` })
    .from(supplierOrders)
    .where(and(eq(supplierOrders.paid, true), gte(supplierOrders.paidAt, weekAgo)))

  const [deudaClientesRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${customerPurchases.amount}), 0)` })
    .from(customerPurchases)
    .where(eq(customerPurchases.paid, false))

  const [deudaProvRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${supplierOrders.amountToPay}), 0)` })
    .from(supplierOrders)
    .where(eq(supplierOrders.paid, false))

  return {
    fiadoSemana: Number(fiadoRow?.total ?? 0),
    cobradoSemana: Number(cobradoRow?.total ?? 0),
    pagadoProveedoresSemana: Number(pagadoProvRow?.total ?? 0),
    deudaTotalClientes: Number(deudaClientesRow?.total ?? 0),
    deudaTotalProveedores: Number(deudaProvRow?.total ?? 0),
  }
}
