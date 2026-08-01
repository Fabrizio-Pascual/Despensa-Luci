'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Gift, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Combo, Product } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

interface SelectedProduct {
  product: Product
  quantity: number
}

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null)
  const [comboToDelete, setComboToDelete] = useState<Combo | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [selected, setSelected] = useState<Map<string, SelectedProduct>>(new Map())

  const supabase = useMemo(() => createClient(), [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const { data: combosData } = await supabase
      .from('combos')
      .select('*, combo_items(*, product:products(*))')
      .order('created_at', { ascending: false })
    const { data: productsData } = await supabase
      .from('products').select('*').eq('is_active', true).order('name')
    setCombos(combosData || [])
    setProducts(productsData || [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const resetForm = () => {
    setName(''); setDescription(''); setPrice(''); setImageUrl(''); setIsActive(true)
    setProductSearch(''); setSelected(new Map()); setEditingCombo(null)
  }

  const openNew = () => { resetForm(); setIsDialogOpen(true) }

  const openEdit = (combo: Combo) => {
    setEditingCombo(combo)
    setName(combo.name)
    setDescription(combo.description || '')
    setPrice(String(combo.price))
    setImageUrl(combo.image_url || '')
    setIsActive(combo.is_active)
    const map = new Map<string, SelectedProduct>()
    for (const ci of combo.combo_items || []) {
      if (ci.product) map.set(ci.product_id, { product: ci.product, quantity: ci.quantity })
    }
    setSelected(map)
    setProductSearch('')
    setIsDialogOpen(true)
  }

  const toggleProduct = (product: Product) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(product.id)) next.delete(product.id)
      else next.set(product.id, { product, quantity: 1 })
      return next
    })
  }

  const setQty = (productId: string, quantity: number) => {
    setSelected(prev => {
      const next = new Map(prev)
      const entry = next.get(productId)
      if (entry) next.set(productId, { ...entry, quantity: Math.max(1, quantity) })
      return next
    })
  }

  const suggestedSum = useMemo(() =>
    Array.from(selected.values()).reduce((sum, s) => sum + s.product.price * s.quantity, 0),
    [selected]
  )

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const q = productSearch.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(q))
  }, [products, productSearch])

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Ponele un nombre al combo'); return }
    if (selected.size < 2) { toast.error('Elegí al menos 2 productos para el combo'); return }
    const priceNum = parseFloat(price)
    if (!priceNum || priceNum <= 0) { toast.error('Ingresá un precio válido'); return }

    setIsSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: priceNum,
        image_url: imageUrl.trim() || null,
        is_active: isActive,
      }

      let comboId = editingCombo?.id

      if (editingCombo) {
        const { error } = await supabase.from('combos').update(payload).eq('id', editingCombo.id)
        if (error) throw error
        // Reemplazamos los productos del combo: borramos los viejos y
        // cargamos de nuevo la selección actual.
        await supabase.from('combo_items').delete().eq('combo_id', editingCombo.id)
      } else {
        const { data, error } = await supabase.from('combos').insert(payload).select().single()
        if (error) throw error
        comboId = data.id
      }

      const items = Array.from(selected.entries()).map(([productId, s]) => ({
        combo_id: comboId, product_id: productId, quantity: s.quantity,
      }))
      const { error: itemsError } = await supabase.from('combo_items').insert(items)
      if (itemsError) throw itemsError

      toast.success(editingCombo ? 'Combo actualizado' : 'Combo creado')
      setIsDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      toast.error('Error al guardar el combo')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!comboToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('combos').delete().eq('id', comboToDelete.id)
      if (error) throw error
      toast.success('Combo eliminado')
      setIsDeleteOpen(false)
      setComboToDelete(null)
      loadData()
    } catch (error) {
      toast.error('Error al eliminar el combo')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Combos</h1>
          <p className="text-sm text-muted-foreground">Conjuntos de productos con un precio fijo (ej: pebete + bajío por $3000)</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo combo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : combos.length === 0 ? (
        <Card className="p-12 text-center">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Todavía no creaste ningún combo</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map(combo => (
            <Card key={combo.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-bold truncate">{combo.name}</h3>
                  {!combo.is_active && <Badge variant="secondary">Inactivo</Badge>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(combo)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setComboToDelete(combo); setIsDeleteOpen(true) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {(combo.combo_items || []).map(ci => `${ci.quantity > 1 ? ci.quantity + '× ' : ''}${ci.product?.name}`).join(' + ')}
              </p>
              <p className="text-xl font-bold text-primary">{formatPrice(combo.price)}</p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCombo ? 'Editar combo' : 'Nuevo combo'}</DialogTitle>
            <DialogDescription>Elegí los productos que lo componen y el precio fijo del conjunto.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Pebete + Bajío chico" />
            </div>

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Ej: Ideal para la merienda" />
            </div>

            <div className="space-y-2">
              <Label>Imagen (URL, opcional)</Label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Productos del combo</Label>
                {selected.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Suma de precios sueltos: {formatPrice(suggestedSum)}
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar producto..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
              </div>

              {selected.size > 0 && (
                <div className="flex flex-wrap gap-2 py-1">
                  {Array.from(selected.values()).map(s => (
                    <Badge key={s.product.id} variant="secondary" className="gap-1 pr-1">
                      {s.product.name}
                      <div className="flex items-center gap-1 ml-1">
                        <Input
                          type="number"
                          min={1}
                          value={s.quantity}
                          onChange={e => setQty(s.product.id, parseInt(e.target.value) || 1)}
                          className="h-6 w-12 px-1 text-xs"
                        />
                        <button onClick={() => toggleProduct(s.product)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </Badge>
                  ))}
                </div>
              )}

              <ScrollArea className="h-56 border border-border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredProducts.map(product => (
                    <label key={product.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                      <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleProduct(product)} />
                      <div className="relative h-8 w-8 rounded overflow-hidden bg-muted shrink-0">
                        {product.image_url && <Image src={product.image_url} alt={product.name} fill className="object-contain" unoptimized />}
                      </div>
                      <span className="flex-1 text-sm truncate">{product.name}</span>
                      <span className="text-xs text-muted-foreground">{formatPrice(product.price)} · stock {product.stock}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label>Precio fijo del combo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input type="number" className="pl-7" value={price} onChange={e => setPrice(e.target.value)} placeholder="3000" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Combo activo (visible en la tienda)</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={isSaving}>{editingCombo ? 'Guardar cambios' : 'Crear combo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar combo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a borrar "{comboToDelete?.name}". Los pedidos que ya se hicieron con este combo no se ven afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
