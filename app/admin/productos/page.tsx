'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Package, Search, FileSpreadsheet, Layers, Trash, EyeOff, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImportProductsSheet } from '@/components/import-products-sheet'
import { VariantsSheet } from '@/components/admin-variants-sheet'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Product, Category } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<(Product & { category: Category })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false) // NUEVO
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false) // NUEVO
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isBulkWorking, setIsBulkWorking] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [unit, setUnit] = useState('unidad')
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isActive, setIsActive] = useState(true)

  const supabase = useMemo(() => createClient(), [])

  const loadData = useCallback(async () => {
    const { data: categoriesData } = await supabase.from('categories').select('*').order('display_order')
    setCategories(categoriesData || [])

    // Supabase/PostgREST limita cada consulta a 1000 filas por defecto.
    // Traemos en tandas de 1000 hasta que no queden más, para no perder productos.
    const PAGE_SIZE = 1000
    let allProducts: any[] = []
    let from = 0
    while (true) {
      let query = supabase.from('products').select('*, category:categories(*)').order('name').range(from, from + PAGE_SIZE - 1)
      if (filterCategory !== 'all') query = query.eq('category_id', filterCategory)
      const { data: pageData } = await query
      if (!pageData || pageData.length === 0) break
      allProducts = allProducts.concat(pageData)
      if (pageData.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    setProducts(allProducts)
    setIsLoading(false)
  }, [supabase, filterCategory])

  useEffect(() => { loadData() }, [loadData])

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Agrupamos por categoría para no mostrar todo en una lista gigante.
  // Si hay búsqueda activa, abrimos todas las categorías con resultados
  // para que no haya que ir abriendo una por una para encontrar algo.
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, { name: string; items: typeof filteredProducts }>()
    for (const p of filteredProducts) {
      const key = p.category?.id || 'sin-categoria'
      const name = p.category?.name || 'Sin categoría'
      if (!groups.has(key)) groups.set(key, { name, items: [] })
      groups.get(key)!.items.push(p)
    }
    return Array.from(groups.entries())
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredProducts])

  const accordionDefaultValue = searchQuery.trim()
    ? groupedProducts.map(g => g.id)
    : undefined

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map(p => p.id))
    )
  }

  const handleBulkDelete = async () => {
    setIsBulkWorking(true)
    try {
      const { error } = await supabase.from('products').delete().in('id', Array.from(selectedIds))
      if (error) throw error
      toast.success(`${selectedIds.size} producto(s) eliminado(s)`)
      setSelectedIds(new Set()); setIsBulkDeleteOpen(false); loadData()
    } catch { toast.error('Error al eliminar los seleccionados') }
    finally { setIsBulkWorking(false) }
  }

  const handleBulkToggleActive = async (active: boolean) => {
    setIsBulkWorking(true)
    try {
      const { error } = await supabase.from('products').update({ is_active: active }).in('id', Array.from(selectedIds))
      if (error) throw error
      toast.success(`${selectedIds.size} producto(s) ${active ? 'activado(s)' : 'desactivado(s)'}`)
      setSelectedIds(new Set()); loadData()
    } catch { toast.error('Error al actualizar los seleccionados') }
    finally { setIsBulkWorking(false) }
  }

  const resetForm = () => {
    setName(''); setDescription(''); setPrice(''); setStock('')
    setUnit('unidad'); setCategoryId(''); setImageUrl(''); setIsActive(true)
    setEditingProduct(null)
  }

  const openEditDialog = (product: any) => {
    setEditingProduct(product)
    setName(product.name); setDescription(product.description || '')
    setPrice(product.price.toString()); setStock(product.stock.toString())
    setUnit(product.unit); setCategoryId(product.category_id)
    setImageUrl(product.image_url || ''); setIsActive(product.is_active)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name || !price || !categoryId) { toast.error('Completá los campos obligatorios'); return }
    setIsSaving(true)
    try {
      const productData = {
        name, description: description || null, price: parseFloat(price),
        stock: parseInt(stock) || 0, unit, category_id: categoryId,
        image_url: imageUrl || null, is_active: isActive,
        updated_at: new Date().toISOString()
      }
      if (editingProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id)
        if (error) throw error
        toast.success('Producto actualizado')
      } else {
        const { error } = await supabase.from('products').insert(productData)
        if (error) throw error
        toast.success('Producto creado')
      }
      setIsDialogOpen(false); resetForm(); loadData()
    } catch (error) {
      toast.error('Error al guardar producto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!productToDelete) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', productToDelete.id)
      if (error) throw error
      toast.success('Producto eliminado')
      setIsDeleteDialogOpen(false); setProductToDelete(null); loadData()
    } catch { toast.error('Error al eliminar') }
  }

  // NUEVO: Función para borrar TODOS los productos
  const handleDeleteAll = async () => {
    setIsDeletingAll(true)
    try {
      const { error } = await supabase.from('products').delete().not('id', 'is', null)
      if (error) throw error
      toast.success(`Todos los productos fueron eliminados`)
      setIsDeleteAllDialogOpen(false)
      loadData()
    } catch (error) {
      toast.error('Error al eliminar productos')
    } finally {
      setIsDeletingAll(false)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">Gestioná el catálogo de productos ({products.length})</p>
        </div>
        <div className="flex gap-2">
          {/* NUEVO: Botón Borrar todo */}
          {products.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteAllDialogOpen(true)}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Borrar todo
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />Importar/Actualizar Excel
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />Nuevo producto
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar productos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.size} seleccionado(s)</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" disabled={isBulkWorking} onClick={() => handleBulkToggleActive(true)} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />Activar
          </Button>
          <Button size="sm" variant="outline" disabled={isBulkWorking} onClick={() => handleBulkToggleActive(false)} className="gap-1.5">
            <EyeOff className="h-3.5 w-3.5" />Desactivar
          </Button>
          <Button size="sm" variant="destructive" disabled={isBulkWorking} onClick={() => setIsBulkDeleteOpen(true)} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />Eliminar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <Card className="py-8 text-center text-muted-foreground">No hay productos</Card>
      ) : (
        <Accordion type="multiple" defaultValue={accordionDefaultValue} className="space-y-3">
          {groupedProducts.map((group) => (
            <AccordionItem key={group.id} value={group.id} className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{group.name}</span>
                  <Badge variant="secondary">{group.items.length}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={group.items.every(p => selectedIds.has(p.id))}
                          onCheckedChange={() => {
                            setSelectedIds(prev => {
                              const next = new Set(prev)
                              const allSelected = group.items.every(p => next.has(p.id))
                              group.items.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id))
                              return next
                            })
                          }}
                          aria-label={`Seleccionar todos en ${group.name}`}
                        />
                      </TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((product) => (
                      <TableRow key={product.id} data-state={selectedIds.has(product.id) ? 'selected' : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleSelected(product.id)}
                            aria-label={`Seleccionar ${product.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {product.image_url
                                ? <Image src={product.image_url} alt={product.name} width={40} height={40} className="object-cover" />
                                : <Package className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.unit}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatPrice(product.price)}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock > 10 ? 'outline' : product.stock > 0 ? 'secondary' : 'destructive'}>
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setVariantsProduct(product)}
                            title="Gestionar sabores/variantes"
                          >
                            <Layers className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setProductToDelete(product); setIsDeleteDialogOpen(true) }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Dialog crear/editar producto */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>{editingProduct ? 'Modificá los datos' : 'Completá los datos del nuevo producto'}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4 pb-2">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="g">Gramo (g) — precio por 100g</SelectItem>
                    <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio *</Label>
                  <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>URL de imagen</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                {imageUrl && (
                  <div className="relative h-24 rounded-lg overflow-hidden bg-muted mt-2">
                    <Image src={imageUrl} alt="preview" fill className="object-cover" unoptimized />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Label>Producto activo</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              {editingProduct && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground mb-2">¿Este producto tiene sabores o variantes?</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => { setIsDialogOpen(false); setVariantsProduct(editingProduct) }}
                  >
                    <Layers className="h-4 w-4" />
                    Gestionar sabores/variantes
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog individual */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>¿Seguro que querés eliminar "{productToDelete?.name}"? No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NUEVO: Delete all dialog */}
      <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Borrar TODOS los productos</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 mt-4">
              <p>¿Seguro que querés eliminar los {products.length} productos?</p>
              <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-sm">
                <p className="font-semibold text-destructive mb-1">⚠️ Esta acción NO se puede deshacer</p>
                <p className="text-destructive/80">Se borrarán todos los productos de la base de datos.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="bg-destructive text-destructive-foreground">
              {isDeletingAll ? 'Borrando...' : 'Sí, borrar TODOS'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog para seleccionados */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedIds.size} producto(s)</AlertDialogTitle>
            <AlertDialogDescription>¿Seguro que querés eliminar los {selectedIds.size} productos seleccionados? No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkWorking} className="bg-destructive text-destructive-foreground">
              {isBulkWorking ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variants/Sabores Sheet */}
      <VariantsSheet
        productId={variantsProduct?.id || null}
        productName={variantsProduct?.name || ''}
        open={!!variantsProduct}
        onClose={() => setVariantsProduct(null)}
      />

      <ImportProductsSheet
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        categories={categories}
        onImported={loadData}
      />
    </div>
  )
}