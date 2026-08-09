"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createProduct, type CategoryRow } from "@/app/actions/products"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

const UNITS = ["unidad", "kg", "g", "litro", "pack"]

export function NewProductDialog({
  categories,
  onCreated,
}: {
  categories: CategoryRow[]
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [unit, setUnit] = useState("unidad")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [barcode, setBarcode] = useState("")

  function reset() {
    setName("")
    setCategoryId("")
    setPrice("")
    setStock("")
    setUnit("unidad")
    setDescription("")
    setImageUrl("")
    setBarcode("")
  }

  async function handleSave() {
    setSaving(true)
    try {
      await createProduct({
        name,
        category_id: categoryId,
        price: Number(price),
        stock: Number(stock) || 0,
        unit,
        description,
        image_url: imageUrl,
        barcode,
      })
      toast.success("Producto creado.")
      reset()
      setOpen(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Yerba La Merced 1kg" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoría</Label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Elegí una categoría...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Precio</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Stock inicial</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Unidad</Label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Código de barras (opcional)</Label>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Escanealo después si no lo tenés a mano" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>URL de imagen (opcional)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descripción (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !categoryId || !price}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
