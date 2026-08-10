import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export type AppUser = {
  id: string
  name: string
  email: string
  enabled: boolean
  role: string
}

/**
 * Returns the current user with the freshest enabled/role flags from the DB,
 * or null if there is no session.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      enabled: userTable.enabled,
      role: userTable.role,
    })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Throws unless the current user exists AND is enabled by the admin.
 * Every data-touching server action uses this.
 */
export async function requireEnabledUser(): Promise<AppUser> {
  const current = await getCurrentUser()
  if (!current) throw new Error("No autorizado: iniciá sesión.")
  if (!current.enabled) {
    throw new Error("Tu cuenta todavía no fue habilitada por el administrador.")
  }
  return current
}

/** Throws unless the current user is an enabled admin. */
export async function requireAdmin(): Promise<AppUser> {
  const current = await requireEnabledUser()
  if (current.role !== "admin") {
    throw new Error("Solo el administrador puede hacer esto.")
  }
  return current
}
