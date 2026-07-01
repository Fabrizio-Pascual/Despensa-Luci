'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [displayOrder, setDisplayOrder] = useState('')

  const supabase = useMemo(() => createClient(), [])

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('display_order')
    setCategories(data || [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { loadCategories() }, [loadCategories])

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const resetForm = () => {
    setName(''); setDescription(''); setSlug(''); setImageUrl(''); setDisplayOrder('')
    setEditingCategory(null)
  }

  const openEdit = (cat: Category) => {
    setEditingCategory(cat)
    setName(cat.name)
    setDescription(cat.description || '')
    setSlug(cat.slug)
    setImageUrl(cat.image_url || '')
    setDisplayOrder(cat.display_order?.toString() || '')
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name) { toast.error('El nombre es obligatorio'); return }
    setIsSaving(true)
    try {
      const data = {
        name,
        description: description || null,
        slug: slug || generateSlug(name),
        image_url: imageUrl || null,
        display_order: parseInt(displayOrder) || 0,
        updated_at: new Date().toISOString()
      }
      if (editingCategory) {
        const { error } = await supabase.from('categories').update(data).eq('id', editingCategory.id)
        if (error) throw error
        toast.success('Categoría actualizada')
      } else {
        const { error } = await supabase.from('categories').insert(data)
        if (error) throw error
        toast.success('Categoría creada')
      }
      setIsDialogOpen(false)
      resetForm()
      loadCategories()
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    try {
      const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id)
      if (error) throw error
      toast.success('Categoría eliminada')
      setIsDeleteDialogOpen(false)
      setCategoryToDelete(null)
      loadCategories()
    } catch {
      toast.error('Error al eliminar')
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
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">Gestioná las categorías de productos</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva categoría
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="overflow-hidden">
            <div className="relative h-32 bg-muted">
              {cat.image_url ? (
                <Image src={cat.image_url} alt={cat.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-2 left-3 text-white font-semibold text-sm">{cat.name}</p>
            </div>
            <CardContent className="p-3 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Orden: {cat.display_order}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCategoryToDelete(cat); setIsDeleteDialogOpen(true) }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>Completá los datos de la categoría</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (!editingCategory) setSlug(generateSlug(e.target.value)) }} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="gaseosas-y-bebidas" />
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
            <div className="space-y-2">
              <Label>Orden de display</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} placeholder="1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará "{categoryToDelete?.name}". Los productos de esta categoría quedarán sin categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}