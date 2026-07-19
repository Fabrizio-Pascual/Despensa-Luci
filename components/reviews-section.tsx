'use client'

import { useState, useEffect, useMemo } from 'react'
import { Star, ChevronDown, Send } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'

interface Review {
  id: string
  author_name: string
  rating: number
  comment: string
  created_at: string
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [hoverRating, setHoverRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { user, profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const SHOWN = 3

  useEffect(() => {
    const load = async () => {
      const { data, count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('is_approved', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })

      setReviews(data || [])
      setTotal(count || 0)
    }
    load()
  }, [supabase])

  const displayed = showAll ? reviews : reviews.slice(0, SHOWN)

  const handleSubmit = async () => {
    if (!comment.trim()) { toast.error('Escribí tu comentario'); return }
    if (!user) { toast.error('Tenés que iniciar sesión para dejar una reseña'); return }
    setSubmitting(true)
    try {
      const insertPromise = supabase.from('reviews').insert({
        user_id: user.id,
        author_name: profile?.full_name || user.email,
        rating,
        comment: comment.trim(),
        is_approved: false,
      })
      const { error } = await Promise.race([
        insertPromise,
        new Promise<{ error: Error }>((resolve) =>
          setTimeout(() => resolve({ error: new Error('timeout') }), 10000)
        ),
      ])
      if (error) throw error
      toast.success('¡Gracias! Tu reseña será revisada antes de publicarse')
      setDialogOpen(false)
      setComment('')
      setRating(5)
    } catch (error) {
      console.error('Error al enviar reseña:', error)
      toast.error('Error al enviar la reseña')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="container mx-auto px-4 pb-14">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Lo que dicen</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Opiniones de clientes</h2>
        </div>
        <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2 rounded-full">
          <Send className="h-4 w-4" />
          Dejar reseña
        </Button>
      </div>

      {reviews.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-3">⭐</p>
            <p>Sé el primero en dejar una reseña</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayed.map((r) => (
              <Card key={r.id} className="rounded-2xl shadow-warm border border-border/60">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{r.comment}"</p>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm font-semibold text-foreground">{r.author_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {total > SHOWN && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => setShowAll(!showAll)} className="rounded-full gap-2">
                <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? 'Ver menos' : `Ver las ${total - SHOWN} reseñas restantes`}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog para dejar reseña */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dejá tu reseña</DialogTitle>
            <DialogDescription>Tu opinión nos ayuda a mejorar. Se publicará después de ser revisada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Estrellas */}
            <div>
              <p className="text-sm font-medium mb-2">Calificación</p>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    onMouseEnter={() => setHoverRating(i + 1)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(i + 1)}
                  >
                    <Star className={`h-8 w-8 transition-colors ${i < (hoverRating || rating) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Tu comentario</p>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Contanos tu experiencia..."
                rows={4}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/300</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar reseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}