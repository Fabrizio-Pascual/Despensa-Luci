'use client'

import { useRef, useState } from 'react'
import { Camera, Check, Loader2, Upload } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { PRESET_AVATARS } from '@/lib/avatars'
import { toast } from 'sonner'

interface AvatarPickerProps {
  userId: string
  fullName?: string | null
  avatarUrl?: string | null
  /** Se llama con la nueva URL apenas se guarda, para que el resto de la
   * pantalla (y el AuthProvider) se actualice sin esperar un refresh. */
  onChange?: (url: string) => void
  size?: 'md' | 'lg'
}

export function AvatarPicker({ userId, fullName, avatarUrl, onChange, size = 'lg' }: AvatarPickerProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const initials = (fullName || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const saveAvatar = async (url: string) => {
    setSaving(url)
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', userId)
      if (error) throw error
      onChange?.(url)
      toast.success('¡Avatar actualizado!')
      setOpen(false)
    } catch (e) {
      console.error('Error guardando avatar:', e)
      toast.error('No se pudo guardar el avatar. Probá de nuevo.')
    } finally {
      setSaving(null)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Elegí un archivo de imagen')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('La imagen no puede pesar más de 4MB')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/avatar-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
      })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await saveAvatar(data.publicUrl)
    } catch (err) {
      console.error('Error subiendo avatar:', err)
      toast.error('No se pudo subir la foto. Probá de nuevo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const avatarSize = size === 'lg' ? 'size-20' : 'size-10'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative inline-flex items-center justify-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          title="Cambiar avatar"
        >
          <Avatar className={`${avatarSize} border-2 border-primary/20 shadow-sm`}>
            <AvatarImage src={avatarUrl || undefined} alt={fullName || 'Avatar'} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-transform group-hover:scale-110">
            <Camera className="size-3.5" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Elegí tu avatar</DialogTitle>
          <DialogDescription>Subí una foto propia o elegí uno de la galería.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-dashed"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? 'Subiendo...' : 'Subir mi foto'}
          </Button>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">O elegí de la galería</p>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = avatarUrl === preset.url
                const isSaving = saving === preset.url
                return (
                  <button
                    key={preset.seed}
                    type="button"
                    disabled={!!saving}
                    onClick={() => saveAvatar(preset.url)}
                    className="group relative flex items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-60"
                    title={preset.seed}
                  >
                    <Avatar className={`size-14 ring-2 transition-colors ${isSelected ? 'ring-primary' : 'ring-transparent group-hover:ring-primary/40'}`}>
                      <AvatarImage src={preset.url} alt={preset.seed} />
                      <AvatarFallback>{preset.seed[0]}</AvatarFallback>
                    </Avatar>
                    {isSaving && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                        <Loader2 className="size-4 animate-spin text-primary" />
                      </span>
                    )}
                    {isSelected && !isSaving && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
