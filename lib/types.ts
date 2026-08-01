export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  address: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  display_order: number
  created_at: string
}

export interface Product {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  stock: number
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface Order {
  id: string
  user_id: string
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  payment_method: 'efectivo' | 'debito' | 'boucher' | null
  total: number
  notes: string | null
  order_code?: string | null
  cambio_propuesta?: string | null
  cambio_monto?: number | null
  cambio_respuesta?: 'aceptado' | 'rechazado' | null
  /** true mientras el admin habilitó que el cliente edite este pedido (falta un producto, etc.) */
  edit_unlocked?: boolean
  /** motivo que dejó el admin al habilitar la edición (ej: "Tomate perita") */
  edit_note?: string | null
  edited_by_customer_at?: string | null
  created_at: string
  updated_at: string
  profile?: Profile
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  quantity: number
  unit_price: number
  subtotal: number
  product?: Product
  /** Si esta línea del pedido es un combo, referencia al combo (puede ser null si el combo fue borrado) */
  combo_id?: string | null
  /** Nombre del combo al momento de la compra (se guarda aparte por si el combo cambia o se borra después) */
  combo_name?: string | null
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string | null
  quantity: number
  created_at: string
  product?: Product
  combo_id?: string | null
  combo?: Combo
}

export interface Debt {
  id: string
  user_id: string
  order_id: string | null
  amount: number
  paid_amount: number
  is_paid: boolean
  notes: string | null
  created_at: string
  paid_at: string | null
  profile?: Profile
  order?: Order
}

export interface Favorite {
  id: string
  user_id: string
  product_id: string
  created_at: string
  product?: Product
}

export interface LoyaltyPoints {
  id: string
  user_id: string
  points_balance: number
  total_points_earned: number
  total_points_used: number
  created_at: string
  updated_at: string
}

export interface StockNotification {
  id: string
  user_id: string
  product_id: string
  notified: boolean
  created_at: string
  notified_at: string | null
  product?: Product
}

export interface FlashSale {
  id: string
  product_id: string
  discount_percent: number
  starts_at: string
  ends_at: string
  is_active: boolean
  created_at: string
  product?: Product
}

export interface ComboItem {
  id: string
  combo_id: string
  product_id: string
  quantity: number
  product?: Product
}

export interface Combo {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  combo_items?: ComboItem[]
  /** viene de combo_availability_view: cuántos combos se pueden armar ahora con el stock actual */
  available_qty?: number
}