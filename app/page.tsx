import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { getCustomers } from "@/app/actions/customers"
import { getSuppliers } from "@/app/actions/suppliers"
import { getAllUsers } from "@/app/actions/admin"
import { getOwnerSummary } from "@/app/actions/summary"
import { Dashboard } from "@/components/dashboard"
import { PendingApproval } from "@/components/pending-approval"

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  if (!user.enabled) {
    return <PendingApproval name={user.name} />
  }

  const isAdmin = user.role === "admin"
  const [customers, suppliers, users, summary] = await Promise.all([
    getCustomers(),
    getSuppliers(),
    isAdmin ? getAllUsers() : Promise.resolve([]),
    isAdmin ? getOwnerSummary() : Promise.resolve(null),
  ])

  return (
    <Dashboard
      user={user}
      initialCustomers={customers}
      initialSuppliers={suppliers}
      initialUsers={users}
      summary={summary}
    />
  )
}
