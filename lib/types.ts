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
  created_at: string
  updated_at: string
  profile?: Profile
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  product?: Product
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  product?: Product
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
