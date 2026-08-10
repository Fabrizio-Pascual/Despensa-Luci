"use server"

import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getAllUsers() {
  await requireAdmin()
  return db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      enabled: userTable.enabled,
      role: userTable.role,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .orderBy(desc(userTable.createdAt))
}

export async function setUserEnabled(userId: string, enabled: boolean) {
  const admin = await requireAdmin()
  // An admin cannot disable themselves (would lock out the owner).
  if (userId === admin.id && !enabled) {
    throw new Error("No podés deshabilitar tu propia cuenta de administrador.")
  }
  await db
    .update(userTable)
    .set({ enabled })
    .where(eq(userTable.id, userId))
  revalidatePath("/")
}

export async function setUserRole(userId: string, role: "admin" | "employee") {
  const admin = await requireAdmin()
  if (userId === admin.id && role !== "admin") {
    throw new Error("No podés quitarte el rol de administrador a vos mismo.")
  }
  await db.update(userTable).set({ role }).where(eq(userTable.id, userId))
  revalidatePath("/")
}
