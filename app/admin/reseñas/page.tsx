
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Star, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminResenasPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const loadReviews = useCallback(async () => {
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false })
    if (filter === 'pending') query = query.eq('is_approved', false)
    if (filter === 'approved') query = query.eq('is_approved', true)
    const { data } = await query
    setReviews(data || [])
    setIsLoading(false)
  }, [supabase, filter])

  useEffect(() => { loadReviews() }, [loadReviews])

  const approve = async (id: string) => {
    await supabase.from('reviews').update({ is_approved: true }).eq('id', id)
    toast.success('Reseña aprobada y publicada')
    loadReviews()
  }

  const reject = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id)
    toast.success('Reseña eliminada')
    loadReviews()
  }

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from('reviews').update({ is_featured: !current }).eq('id', id)
    loadReviews()
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reseñas</h1>
        <p className="text-muted-foreground">Moderá los comentarios de tus clientes</p>
      </div>

      <div className="flex gap-2">
        <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
          Pendientes
        </Button>
        <Button variant={filter === 'approved' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('approved')}>
          Publicadas
        </Button>
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          Todas
        </Button>
      </div>

      {reviews.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No hay reseñas en esta vista</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{r.author_name}</p>
                      {r.is_approved && <Badge variant="outline" className="text-xs">Publicada</Badge>}
                      {r.is_featured && <Badge className="text-xs">Destacada</Badge>}
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{r.comment}"</p>
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(r.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!r.is_approved ? (
                      <>
                        <Button size="sm" onClick={() => approve(r.id)} className="gap-1">
                          <CheckCircle className="h-4 w-4" />Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => reject(r.id)}>
                          <XCircle className="h-4 w-4" />Rechazar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleFeatured(r.id, r.is_featured)}>
                          {r.is_featured ? 'Quitar destacada' : 'Destacar'}
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => reject(r.id)}>
                          <Trash2 className="h-4 w-4" />Eliminar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}