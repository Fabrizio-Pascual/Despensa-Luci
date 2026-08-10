"use server"

import { db } from "@/lib/db"
import { suppliers, supplierOrders } from "@/lib/db/schema"
import { requireEnabledUser } from "@/lib/session"
import { desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type SupplierWithBalance = {
  id: number
  name: string
  phone: string | null
  note: string | null
  toPay: number
  pendingOrders: number
  urgentOrders: number
}

export async function getSuppliers(): Promise<SupplierWithBalance[]> {
  await requireEnabledUser()
  const rows = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      phone: suppliers.phone,
      note: suppliers.note,
      toPay: sql<string>`COALESCE(SUM(CASE WHEN ${supplierOrders.paid} = false THEN ${supplierOrders.amountToPay} ELSE 0 END), 0)`,
      pendingOrders: sql<number>`COUNT(CASE WHEN ${supplierOrders.status} <> 'recibido' THEN 1 END)::int`,
      urgentOrders: sql<number>`COUNT(CASE WHEN ${supplierOrders.urgent} = true AND ${supplierOrders.status} <> 'recibido' THEN 1 END)::int`,
    })
    .from(suppliers)
    .leftJoin(supplierOrders, eq(supplierOrders.supplierId, suppliers.id))
    .groupBy(suppliers.id)
    .orderBy(desc(suppliers.createdAt))

  return rows.map((r) => ({
    ...r,
    toPay: Number(r.toPay),
    pendingOrders: Number(r.pendingOrders),
    urgentOrders: Number(r.urgentOrders),
  }))
}

export async function getSupplierOrders(supplierId: number) {
  await requireEnabledUser()
  return db
    .select()
    .from(supplierOrders)
    .where(eq(supplierOrders.supplierId, supplierId))
    .orderBy(desc(supplierOrders.urgent), desc(supplierOrders.createdAt))
}

export async function addSupplier(formData: {
  name: string
  phone?: string
  note?: string
}) {
  const currentUser = await requireEnabledUser()
  const name = formData.name?.trim()
  if (!name) throw new Error("El nombre es obligatorio.")

  await db.insert(suppliers).values({
    name,
    phone: formData.phone?.trim() || null,
    note: formData.note?.trim() || null,
    createdByUserId: currentUser.id,
  })
  revalidatePath("/")
}

export async function addOrder(formData: {
  supplierId: number
  items: string
  cost: number
  amountToPay: number
  status?: string
}) {
  const currentUser = await requireEnabledUser()
  const items = formData.items?.trim()
  if (!items) throw new Error("Anotá qué hay que encargar.")
  const cost = Number(formData.cost)
  const amountToPay = Number(formData.amountToPay)
  if (!Number.isFinite(cost) || cost < 0) throw new Error("El costo no es válido.")
  if (!Number.isFinite(amountToPay) || amountToPay < 0)
    throw new Error("El monto a pagar no es válido.")

  await db.insert(supplierOrders).values({
    supplierId: formData.supplierId,
    items,
    cost: cost.toFixed(2),
    amountToPay: amountToPay.toFixed(2),
    status: formData.status ?? "pendiente",
    createdByUserId: currentUser.id,
    createdByName: currentUser.name,
  })
  revalidatePath("/")
}

export async function setOrderStatus(id: number, status: string) {
  await requireEnabledUser()
  await db.update(supplierOrders).set({ status }).where(eq(supplierOrders.id, id))
  revalidatePath("/")
}

export async function toggleOrderPaid(id: number, paid: boolean) {
  await requireEnabledUser()
  await db
    .update(supplierOrders)
    .set({ paid, paidAt: paid ? new Date() : null })
    .where(eq(supplierOrders.id, id))
  revalidatePath("/")
}

export async function toggleOrderUrgent(id: number, urgent: boolean) {
  await requireEnabledUser()
  await db.update(supplierOrders).set({ urgent }).where(eq(supplierOrders.id, id))
  revalidatePath("/")
}

export async function deleteOrder(id: number) {
  await requireEnabledUser()
  await db.delete(supplierOrders).where(eq(supplierOrders.id, id))
  revalidatePath("/")
}

export async function deleteSupplier(id: number) {
  await requireEnabledUser()
  await db.delete(supplierOrders).where(eq(supplierOrders.supplierId, id))
  await db.delete(suppliers).where(eq(suppliers.id, id))
  revalidatePath("/")
}
