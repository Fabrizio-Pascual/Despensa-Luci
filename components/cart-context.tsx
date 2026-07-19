'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserSafe } from '@/lib/supabase/get-user-safe'
import type { CartItem, Product } from '@/lib/types'
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
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemExtended[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const refreshCart = useCallback(async () => {
    try {
      const user = await getUserSafe(supabase)
      if (!user) { setItems([]); setIsLoading(false); return }

      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', user.id)

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    refreshCart()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { refreshCart() })
    return () => subscription.unsubscribe()
  }, [supabase, refreshCart])

  const addToCart = async (productId: string, quantity = 1, variantId: string | null = null, variantName: string | null = null) => {
    try {
      const user = await getUserSafe(supabase)
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
        .select('*, product:products(*)')
        .single()

      if (error) throw error

      // Actualizar estado inmediatamente sin refreshCart
      setItems(prev => [...prev, data])
      toast.success(`${variantName ? variantName + ' agregado' : 'Producto agregado'} al carrito`)
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Error al agregar producto')
    }
  }

  const removeFromCart = async (productId: string, variantId: string | null = null) => {
    try {
      const user = await getUserSafe(supabase)
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
      console.error('Error removing from cart:', error)
      toast.error('Error al eliminar producto')
    }
  }

  const updateQuantity = async (productId: string, quantity: number, variantId: string | null = null) => {
    try {
      const user = await getUserSafe(supabase)
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
      console.error('Error updating quantity:', error)
      toast.error('Error al actualizar cantidad')
    }
  }

  const clearCart = async () => {
    try {
      const user = await getUserSafe(supabase)
      if (!user) return
      const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id)
      if (error) throw error
      setItems([])
    } catch (error) {
      console.error('Error clearing cart:', error)
      toast.error('Error al vaciar carrito')
    }
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)

  return (
    <CartContext.Provider value={{ items, isLoading, itemCount, total, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) throw new Error('useCart must be used within a CartProvider')
  return context
}