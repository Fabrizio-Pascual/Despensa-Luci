"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateProduct, type ProductRow, type CategoryRow } from "@/app/actions/products"
import { toast } from "sonner"
import { Loader2, Image as ImageIcon } from "lucide-react"

const UNITS = ["unidad", "kg", "g", "litro", "pack"]

// Selecciona todo el texto al enfocar un input numérico para que al tipear
// se reemplace el valor entero (ej: el "0" inicial) en vez de anteponerse
// y obligar a usar la flechita o marcar todo a mano.
function selectAllOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select()
}

export function EditProductDialog({
  product,
  categories,
  open,
  onOpenChange,
  onSaved,
}: {
  product: ProductRow | null
  categories: CategoryRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [unit, setUnit] = useState("unidad")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [barcode, setBarcode] = useState("")

  // Precarga el formulario cada vez que se abre con un producto distinto.
  useEffect(() => {
    if (!product) return
    setName(product.name)
    setCategoryId(product.category_id ?? "")
    setPrice(String(product.price ?? ""))
    setStock(String(product.stock ?? ""))
    setUnit(product.unit || "unidad")
    setDescription(product.description ?? "")
    setImageUrl(product.image_url ?? "")
    setBarcode(product.barcode ?? "")
  }, [product])

  async function handleSave() {
    if (!product) return
    setSaving(true)
    try {
      await updateProduct(product.id, {
        name,
        category_id: categoryId,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        unit,
        description,
        image_url: imageUrl,
        barcode,
      })
      toast.success("Cambios guardados.")
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
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
              <Input
                type="number"
                inputMode="decimal"
                value={price}
                onFocus={selectAllOnFocus}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Stock</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={stock}
                onFocus={selectAllOnFocus}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
              />
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
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Escanealo o escribilo" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>URL de imagen (opcional)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-border p-2">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl || "/placeholder.svg"} alt="Vista previa" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Vista previa de la imagen</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descripción (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !categoryId || !price}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
