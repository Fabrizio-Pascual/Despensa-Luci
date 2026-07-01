'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Variant {
  id: string
  name: string
  image_url: string | null
  stock: number
  price_modifier: number
  is_active: boolean
  display_order: number
}

interface VariantsSheetProps {
  productId: string | null
  productName: string
  open: boolean
  onClose: () => void
}

export function VariantsSheet({ productId, productName, open, onClose }: VariantsSheetProps) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newImage, setNewImage] = useState('')
  const [newStock, setNewStock] = useState('')
  const [newPriceMod, setNewPriceMod] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const loadVariants = useCallback(async () => {
    if (!productId) return
    setIsLoading(true)
    const { data } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('display_order')
    setVariants(data || [])
    setIsLoading(false)
  }, [productId, supabase])

  useEffect(() => {
    if (open && productId) loadVariants()
  }, [open, productId, loadVariants])

  const handleAdd = async () => {
    if (!newName || !productId) { toast.error('El nombre es obligatorio'); return }
    setIsSaving(true)
    const { error } = await supabase.from('product_variants').insert({
      product_id: productId,
      name: newName,
      image_url: newImage || null,
      stock: parseInt(newStock) || 0,
      price_modifier: parseFloat(newPriceMod) || 0,
      display_order: variants.length,
    })
    if (error) { toast.error('Error al agregar variante'); }
    else {
      toast.success('Variante agregada')
      setNewName(''); setNewImage(''); setNewStock(''); setNewPriceMod('')
      loadVariants()
    }
    setIsSaving(false)
  }

  const handleUpdate = async (id: string, field: string, value: any) => {
    const { error } = await supabase
      .from('product_variants')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) loadVariants()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('product_variants').delete().eq('id', id)
    if (!error) { toast.success('Variante eliminada'); loadVariants() }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Variantes — {productName}</SheetTitle>
          <SheetDescription>
            Agregá sabores, tamaños o presentaciones del producto
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Agregar nueva variante */}
          <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-semibold">Nueva variante</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre *</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Mango Loco" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stock</Label>
                <Input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Diferencia de precio</Label>
                <Input type="number" value={newPriceMod} onChange={e => setNewPriceMod(e.target.value)} placeholder="0 (mismo precio)" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL imagen</Label>
                <Input value={newImage} onChange={e => setNewImage(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
              </div>
            </div>
            {newImage && (
              <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted">
                <Image src={newImage} alt="preview" fill className="object-cover" unoptimized />
              </div>
            )}
            <Button size="sm" onClick={handleAdd} disabled={isSaving} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              {isSaving ? 'Agregando...' : 'Agregar variante'}
            </Button>
          </div>

          {/* Lista de variantes */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : variants.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No hay variantes. Agregá la primera arriba.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{variants.length} variante(s)</p>
              {variants.map(variant => (
                <div key={variant.id} className="border rounded-xl p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {variant.image_url && (
                        <div className="relative h-8 w-8 rounded overflow-hidden bg-muted">
                          <Image src={variant.image_url} alt={variant.name} fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <Input
                        value={variant.name}
                        onChange={e => handleUpdate(variant.id, 'name', e.target.value)}
                        className="h-7 text-sm font-medium w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={variant.is_active}
                        onCheckedChange={v => handleUpdate(variant.id, 'is_active', v)}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(variant.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Stock</Label>
                      <Input
                        type="number"
                        value={variant.stock}
                        onChange={e => handleUpdate(variant.id, 'stock', parseInt(e.target.value) || 0)}
                        className="h-7 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">+/- Precio</Label>
                      <Input
                        type="number"
                        value={variant.price_modifier}
                        onChange={e => handleUpdate(variant.id, 'price_modifier', parseFloat(e.target.value) || 0)}
                        className="h-7 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">URL imagen</Label>
                    <Input
                      value={variant.image_url || ''}
                      onChange={e => handleUpdate(variant.id, 'image_url', e.target.value || null)}
                      placeholder="https://..."
                      className="h-7 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}