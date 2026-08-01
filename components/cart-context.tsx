'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import type { CartItem, Product, Combo } from '@/lib/types'
import { toast } from 'sonner'

interface CartItemExtended extends CartItem {
  product: Product
  variant_id?: string | null
  variant_name?: string | null
}

interface CartContextType {
  items: CartItemExtended[]
  isLoading: boolean
  itemCount: number
  total: number
  addToCart: (productId: string, quantity?: number, variantId?: string | null, variantName?: string | null) => Promise<void>
  removeFromCart: (productId: string, variantId?: string | null) => Promise<void>
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => Promise<void>
  addCombo: (comboId: string, quantity?: number) => Promise<void>
  removeCombo: (comboId: string) => Promise<void>
  updateComboQuantity: (comboId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Selecciona el combo con sus productos (para poder mostrar de qué se
// compone y calcular cuántos quedan disponibles según el stock).
const CART_SELECT = '*, product:products(*), combo:combos(*, combo_items(*, product:products(*)))'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemExtended[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()

  const refreshCart = useCallback(async () => {
    try {
      if (!user) { setItems([]); setIsLoading(false); return }

      const { data, error } = await supabase
        .from('cart_items')
        .select(CART_SELECT)
        .eq('user_id', user.id)

      if (error) throw error
      setItems((data || []) as unknown as CartItemExtended[])
    } catch (error) {
      // Error silencioso: el usuario ya ve el carrito vacío/isLoading en la UI
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    // Esperamos a que el AuthProvider termine de resolver la sesión
    // antes de pedir el carrito, para no disparar una consulta de más.
    if (authLoading) return
    refreshCart()
  }, [authLoading, refreshCart])

  const addToCart = async (productId: string, quantity = 1, variantId: string | null = null, variantName: string | null = null) => {
    try {
      if (!user) { toast.error('Iniciá sesión para agregar productos'); return }

      // Buscar si ya existe el mismo producto+variante
      const existing = items.find(i => i.product_id === productId && (i.variant_id || null) === variantId)

      if (existing) {
        await updateQuantity(productId, existing.quantity + quantity, variantId)
        return
      }

      const { data, error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, quantity, variant_id: variantId, variant_name: variantName })
        .select(CART_SELECT)
        .single()

      if (error) throw error

      // Actualizar estado inmediatamente sin refreshCart
      setItems(prev => [...prev, data as unknown as CartItemExtended])
      toast.success(`${variantName ? variantName + ' agregado' : 'Producto agregado'} al carrito`)
    } catch (error) {
      toast.error('Error al agregar producto')
    }
  }

  const removeFromCart = async (productId: string, variantId: string | null = null) => {
    try {
      if (!user) return

      let query = supabase.from('cart_items').delete().eq('user_id', user.id).eq('product_id', productId)
      if (variantId) query = query.eq('variant_id', variantId)
      else query = query.is('variant_id', null)

      const { error } = await query
      if (error) throw error

      // Actualizar estado inmediatamente
      setItems(prev => prev.filter(i => !(i.product_id === productId && (i.variant_id || null) === variantId)))
      toast.success('Producto eliminado del carrito')
    } catch (error) {
      toast.error('Error al eliminar producto')
    }
  }

  const updateQuantity = async (productId: string, quantity: number, variantId: string | null = null) => {
    try {
      if (!user) return

      if (quantity <= 0) { await removeFromCart(productId, variantId); return }

      let query = supabase.from('cart_items').update({ quantity }).eq('user_id', user.id).eq('product_id', productId)
      if (variantId) query = query.eq('variant_id', variantId)
      else query = query.is('variant_id', null)

      const { error } = await query
      if (error) throw error

      // Actualizar estado inmediatamente
      setItems(prev => prev.map(i =>
        i.product_id === productId && (i.variant_id || null) === variantId
          ? { ...i, quantity }
          : i
      ))
    } catch (error) {
      toast.error('Error al actualizar cantidad')
    }
  }

  // --- Combos: se agregan como un único ítem en el carrito (no como los
  // productos sueltos que lo componen) ---

  const addCombo = async (comboId: string, quantity = 1) => {
    try {
      if (!user) { toast.error('Iniciá sesión para agregar productos'); return }

      const existing = items.find(i => i.combo_id === comboId)
      if (existing) {
        await updateComboQuantity(comboId, existing.quantity + quantity)
        return
      }

      const { data, error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, combo_id: comboId, quantity })
        .select(CART_SELECT)
        .single()

      if (error) throw error

      setItems(prev => [...prev, data as unknown as CartItemExtended])
      toast.success('Combo agregado al carrito')
    } catch (error) {
      toast.error('Error al agregar el combo')
    }
  }

  const removeCombo = async (comboId: string) => {
    try {
      if (!user) return
      const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id).eq('combo_id', comboId)
      if (error) throw error
      setItems(prev => prev.filter(i => i.combo_id !== comboId))
      toast.success('Combo eliminado del carrito')
    } catch (error) {
      toast.error('Error al eliminar el combo')
    }
  }

  const updateComboQuantity = async (comboId: string, quantity: number) => {
    try {
      if (!user) return
      if (quantity <= 0) { await removeCombo(comboId); return }

      const { error } = await supabase.from('cart_items').update({ quantity }).eq('user_id', user.id).eq('combo_id', comboId)
      if (error) throw error

      setItems(prev => prev.map(i => i.combo_id === comboId ? { ...i, quantity } : i))
    } catch (error) {
      toast.error('Error al actualizar cantidad')
    }
  }

  const clearCart = async () => {
    try {
      if (!user) return
      const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id)
      if (error) throw error
      setItems([])
    } catch (error) {
      toast.error('Error al vaciar carrito')
    }
  }

  const priceOf = (item: CartItemExtended) => item.combo_id ? (item.combo?.price || 0) : item.product.price

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + (priceOf(item) * item.quantity), 0)

  return (
    <CartContext.Provider value={{ items, isLoading, itemCount, total, addToCart, removeFromCart, updateQuantity, addCombo, removeCombo, updateComboQuantity, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) throw new Error('useCart must be used within a CartProvider')
  return context
}
