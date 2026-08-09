"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCategory, updateCategory, deleteCategory, type CategoryRow } from "@/app/actions/products"
import { toast } from "sonner"
import { Settings2, Plus, Trash2, Loader2, Check, X, Pencil } from "lucide-react"

export function ManageCategoriesDialog({
  categories,
  onChanged,
}: {
  categories: CategoryRow[]
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createCategory({ name: newName })
      toast.success("Categoría creada.")
      setNewName("")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear.")
    } finally {
      setCreating(false)
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    setBusyId(id)
    try {
      await updateCategory(id, { name: editName })
      toast.success("Renombrada.")
      setEditingId(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo renombrar.")
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    try {
      await deleteCategory(id)
      toast.success("Categoría borrada.")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo borrar.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Categorías</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorías</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nueva categoría..."
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
              {editingId === c.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 flex-1" autoFocus />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRename(c.id)} disabled={busyId === c.id}>
                    <Check className="h-4 w-4 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{c.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingId(c.id)
                      setEditName(c.name)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(c.id)}
                    disabled={busyId === c.id}
                  >
                    {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Todavía no hay categorías.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
