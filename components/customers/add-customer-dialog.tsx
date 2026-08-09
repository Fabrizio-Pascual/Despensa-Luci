"use client"

import type React from "react"
import { useState } from "react"
import { addCustomer } from "@/app/actions/customers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function AddCustomerDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [note, setNote] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await addCustomer({ name, phone, email, note })
      toast.success("Cliente agregado.")
      setName("")
      setPhone("")
      setEmail("")
      setNote("")
      setOpen(false)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Anotá a la persona que va a sacar fiado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-name">Nombre *</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: María González"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-phone">Teléfono (opcional)</Label>
            <Input
              id="c-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 11 2345 6789"
              inputMode="tel"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-email">Email de la tienda online (opcional)</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej: maria@gmail.com"
              inputMode="email"
            />
            <p className="text-xs text-muted-foreground">
              Si compra online con este mismo email, le va a aparecer la opción de pagar con Fiado.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-note">Nota (opcional)</Label>
            <Input
              id="c-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: vecina de la esquina"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
