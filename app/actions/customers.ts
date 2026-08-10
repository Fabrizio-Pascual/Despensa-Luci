"use server"

import { db, pool } from "@/lib/db"
import { customers, customerPurchases } from "@/lib/db/schema"
import { requireEnabledUser } from "@/lib/session"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Le prende (o apaga) el permiso de fiado en la cuenta de la tienda
// online, buscando al usuario por email. Si esa persona todavía no
// tiene cuenta en la tienda, no hace nada (no es un error: puede que
// solo compre de forma presencial, o que se registre más adelante).
async function syncTiendaCanFiar(email: string, enabled: boolean) {
  try {
    const { rows } = await pool.query(
      `select id from auth.users where lower(email) = lower($1) limit 1`,
      [email],
    )
    const userId = rows[0]?.id
    if (!userId) return
    await pool.query(`update public.profiles set can_fiar = $2 where id = $1`, [userId, enabled])
  } catch (err) {
    // Si por lo que sea no se puede sincronizar (falta la tabla, permisos,
    // etc.), no rompemos el alta del cliente en el cuaderno — solo lo avisamos.
    console.error("No se pudo sincronizar can_fiar con la tienda:", err)
  }
}

export type CustomerWithBalance = {
  id: number
  name: string
  phone: string | null
  email: string | null
  note: string | null
  balance: number
  pendingCount: number
}

export async function getCustomers(): Promise<CustomerWithBalance[]> {
  await requireEnabledUser()
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      note: customers.note,
      balance: sql<string>`COALESCE(SUM(CASE WHEN ${customerPurchases.paid} = false THEN ${customerPurchases.amount} ELSE 0 END), 0)`,
      pendingCount: sql<number>`COUNT(CASE WHEN ${customerPurchases.paid} = false THEN 1 END)::int`,
    })
    .from(customers)
    .leftJoin(customerPurchases, eq(customerPurchases.customerId, customers.id))
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt))

  return rows.map((r) => ({
    ...r,
    balance: Number(r.balance),
    pendingCount: Number(r.pendingCount),
  }))
}

export async function getCustomerPurchases(customerId: number) {
  await requireEnabledUser()
  return db
    .select()
    .from(customerPurchases)
    .where(eq(customerPurchases.customerId, customerId))
    .orderBy(desc(customerPurchases.createdAt))
}

export async function getCustomerStatement(customerId: number) {
  await requireEnabledUser()
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId))
  if (!customer) throw new Error("Cliente no encontrado")

  const purchases = await db
    .select()
    .from(customerPurchases)
    .where(eq(customerPurchases.customerId, customerId))
    .orderBy(desc(customerPurchases.createdAt))

  const pendiente = purchases
    .filter((p) => !p.paid)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const pagadoHistorico = purchases
    .filter((p) => p.paid)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return { customer, purchases, pendiente, pagadoHistorico }
}

export async function addCustomer(formData: {
  name: string
  phone?: string
  email?: string
  note?: string
}) {
  const currentUser = await requireEnabledUser()
  const name = formData.name?.trim()
  if (!name) throw new Error("El nombre es obligatorio.")

  await db.insert(customers).values({
    name,
    phone: formData.phone?.trim() || null,
    email: formData.email?.trim().toLowerCase() || null,
    note: formData.note?.trim() || null,
    createdByUserId: currentUser.id,
  })

  const email = formData.email?.trim().toLowerCase()
  if (email) await syncTiendaCanFiar(email, true)

  revalidatePath("/")
}

export async function addPurchase(formData: {
  customerId: number
  description: string
  amount: number
}) {
  const currentUser = await requireEnabledUser()
  const amount = Number(formData.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Anotá un monto mayor a 0.")
  }
  const description = formData.description?.trim() || "Fiado"

  await db.insert(customerPurchases).values({
    customerId: formData.customerId,
    description,
    amount: amount.toFixed(2),
    createdByUserId: currentUser.id,
    createdByName: currentUser.name,
  })
  revalidatePath("/")
}

export async function togglePurchasePaid(id: number, paid: boolean) {
  await requireEnabledUser()
  await db
    .update(customerPurchases)
    .set({ paid, paidAt: paid ? new Date() : null })
    .where(eq(customerPurchases.id, id))
  revalidatePath("/")
}

export async function payAllForCustomer(customerId: number) {
  await requireEnabledUser()
  await db
    .update(customerPurchases)
    .set({ paid: true, paidAt: new Date() })
    .where(
      and(
        eq(customerPurchases.customerId, customerId),
        eq(customerPurchases.paid, false),
      ),
    )
  revalidatePath("/")
}

export async function deletePurchase(id: number) {
  await requireEnabledUser()
  await db.delete(customerPurchases).where(eq(customerPurchases.id, id))
  revalidatePath("/")
}

export async function deleteCustomer(id: number) {
  await requireEnabledUser()
  const [existing] = await db.select({ email: customers.email }).from(customers).where(eq(customers.id, id))
  await db.delete(customerPurchases).where(eq(customerPurchases.customerId, id))
  await db.delete(customers).where(eq(customers.id, id))
  if (existing?.email) await syncTiendaCanFiar(existing.email, false)
  revalidatePath("/")
}
