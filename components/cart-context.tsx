'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, Product } from '@/lib/types'
import { toast } from 'sonner'

interface CartContextType {
  items: (CartItem & { product: Product })[]
  isLoading: boolean
  itemCount: number
  total: number
  addToCart: (productId: string, quantity?: number) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<(CartItem & { product: Product })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const refreshCart = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setItems([])
        setIsLoading(false)
        return
      }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshCart()
    })

    return () => subscription.unsubscribe()
  }, [supabase, refreshCart])

  const addToCart = async (productId: string, quantity = 1) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Debes iniciar sesion para agregar productos')
        return
      }

      const existingItem = items.find(item => item.product_id === productId)

      if (existingItem) {
        await updateQuantity(productId, existingItem.quantity + quantity)
      } else {
        const { error } = await supabase
          .from('cart_items')
          .upsert(
            { user_id: user.id, product_id: productId, quantity },
            { onConflict: 'user_id,product_id' }
          )

        if (error) throw error
        await refreshCart()
        toast.success('Producto agregado al carrito')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Error al agregar producto')
    }
  }

  const removeFromCart = async (productId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)

      if (error) throw error
      await refreshCart()
      toast.success('Producto eliminado del carrito')
    } catch (error) {
      console.error('Error removing from cart:', error)
      toast.error('Error al eliminar producto')
    }
  }

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (quantity <= 0) {
        await removeFromCart(productId)
        return
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', productId)

      if (error) throw error
      await refreshCart()
    } catch (error) {
      console.error('Error updating quantity:', error)
      toast.error('Error al actualizar cantidad')
    }
  }

  const clearCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

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
    <CartContext.Provider value={{
      items,
      isLoading,
      itemCount,
      total,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      refreshCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}