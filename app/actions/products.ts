"use server"

import { pool } from "@/lib/db"
import { requireEnabledUser } from "@/lib/session"

export type ProductVariantRow = {
  id: string
  name: string
  stock: number
  price_modifier: number
  image_url: string | null
}

export type ProductRow = {
  id: string
  name: string
  price: number
  stock: number
  unit: string
  barcode: string | null
  image_url: string | null
  description: string | null
  category_id: string | null
  category_name: string | null
  is_active: boolean
  variants: ProductVariantRow[]
}

export type CategoryRow = {
  id: string
  name: string
}

export async function getCategories(): Promise<CategoryRow[]> {
  await requireEnabledUser()
  const { rows } = await pool.query(
    `select id, name from public.categories order by display_order asc, name asc`,
  )
  return rows
}

async function attachVariants(products: ProductRow[]): Promise<ProductRow[]> {
  if (products.length === 0) return products
  const ids = products.map((p) => p.id)
  const { rows } = await pool.query(
    `select id, product_id, name, stock, price_modifier, image_url
     from public.product_variants
     where product_id = any($1::uuid[])
     order by name asc`,
    [ids],
  )
  const byProduct = new Map<string, ProductVariantRow[]>()
  for (const r of rows) {
    const list = byProduct.get(r.product_id) ?? []
    list.push({ id: r.id, name: r.name, stock: r.stock, price_modifier: Number(r.price_modifier), image_url: r.image_url })
    byProduct.set(r.product_id, list)
  }
  return products.map((p) => ({ ...p, variants: byProduct.get(p.id) ?? [] }))
}

// Busca por nombre (texto libre) o por código de barras exacto.
export async function searchProducts(query: string): Promise<ProductRow[]> {
  await requireEnabledUser()
  const q = query.trim()
  if (!q) return []

  const { rows } = await pool.query(
    `select p.id, p.name, p.price, p.stock, p.unit, p.barcode, p.image_url, p.description, p.category_id, p.is_active,
            c.name as category_name
     from public.products p
     left join public.categories c on c.id = p.category_id
     where p.barcode = $1
        or p.name ilike '%' || $1 || '%'
     order by (p.barcode = $1) desc, p.name asc
     limit 25`,
    [q],
  )

  return attachVariants(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      stock: r.stock,
      unit: r.unit,
      barcode: r.barcode,
      image_url: r.image_url,
      description: r.description,
      category_id: r.category_id,
      category_name: r.category_name,
      is_active: r.is_active,
      variants: [],
    })),
  )
}

// Lista todos los productos de una categoría (para cuando no sabés
// el nombre ni el código, pero sí en qué sección está).
export async function listProductsByCategory(categoryId: string): Promise<ProductRow[]> {
  await requireEnabledUser()
  const { rows } = await pool.query(
    `select p.id, p.name, p.price, p.stock, p.unit, p.barcode, p.image_url, p.description, p.category_id, p.is_active,
            c.name as category_name
     from public.products p
     left join public.categories c on c.id = p.category_id
     where p.category_id = $1
     order by p.name asc
     limit 100`,
    [categoryId],
  )

  return attachVariants(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      stock: r.stock,
      unit: r.unit,
      barcode: r.barcode,
      image_url: r.image_url,
      description: r.description,
      category_id: r.category_id,
      category_name: r.category_name,
      is_active: r.is_active,
      variants: [],
    })),
  )
}

export async function updateProductField(
  id: string,
  field: "stock" | "price" | "barcode" | "image_url",
  value: string | number,
) {
  await requireEnabledUser()
  const columns = { stock: "stock", price: "price", barcode: "barcode", image_url: "image_url" } as const
  const column = columns[field]
  await pool.query(`update public.products set "${column}" = $2, updated_at = now() where id = $1`, [
    id,
    value,
  ])
}

// Actualiza el producto completo de una sola vez (usado por el diálogo "Editar producto"
// con botón Guardar). Permite modificar también la URL de la imagen.
export async function updateProduct(
  id: string,
  data: {
    name: string
    category_id: string
    price: number
    stock: number
    unit: string
    description?: string
    image_url?: string
    barcode?: string
  },
) {
  await requireEnabledUser()
  if (!data.name.trim()) throw new Error("Ponele un nombre al producto.")
  if (!data.category_id) throw new Error("Elegí una categoría.")
  if (!data.price || data.price <= 0) throw new Error("Poné un precio válido.")

  await pool.query(
    `update public.products
        set name = $2,
            category_id = $3,
            price = $4,
            stock = $5,
            unit = $6,
            description = $7,
            image_url = $8,
            barcode = $9,
            updated_at = now()
      where id = $1`,
    [
      id,
      data.name.trim(),
      data.category_id,
      data.price,
      data.stock || 0,
      data.unit || "unidad",
      data.description?.trim() || null,
      data.image_url?.trim() || null,
      data.barcode?.trim() || null,
    ],
  )
}

export async function updateVariantField(id: string, field: "name" | "stock" | "price_modifier" | "image_url", value: number | string | null) {
  await requireEnabledUser()
  if (field === "name" && (typeof value !== "string" || !value.trim())) {
    throw new Error("Ponele un nombre al sabor.")
  }
  const columns = { name: "name", stock: "stock", price_modifier: "price_modifier", image_url: "image_url" } as const
  const column = columns[field]
  await pool.query(`update public.product_variants set "${column}" = $2 where id = $1`, [id, value])
}

export async function createVariant(
  productId: string,
  data: { name: string; stock: number; price_modifier: number; image_url?: string },
) {
  await requireEnabledUser()
  if (!data.name.trim()) throw new Error("Ponele un nombre al sabor/variante.")
  await pool.query(
    `insert into public.product_variants (product_id, name, stock, price_modifier, image_url, is_active)
     values ($1, $2, $3, $4, $5, true)`,
    [productId, data.name.trim(), data.stock || 0, data.price_modifier || 0, data.image_url?.trim() || null],
  )
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await requireEnabledUser()
  await pool.query(`update public.products set is_active = $2, updated_at = now() where id = $1`, [
    id,
    isActive,
  ])
}

export async function deleteVariant(id: string) {
  await requireEnabledUser()
  await pool.query(`delete from public.product_variants where id = $1`, [id])
}

export async function deleteProduct(id: string) {
  await requireEnabledUser()
  await pool.query(`delete from public.products where id = $1`, [id])
}

export async function createProduct(data: {
  name: string
  category_id: string
  price: number
  stock: number
  unit: string
  description?: string
  image_url?: string
  barcode?: string
}) {
  await requireEnabledUser()
  if (!data.name.trim()) throw new Error("Ponele un nombre al producto.")
  if (!data.category_id) throw new Error("Elegí una categoría.")
  if (!data.price || data.price <= 0) throw new Error("Poné un precio válido.")

  const { rows } = await pool.query(
    `insert into public.products
       (name, category_id, price, stock, unit, description, image_url, barcode, is_active)
     values ($1, $2, $3, $4, $5, $6, $7, $8, true)
     returning id`,
    [
      data.name.trim(),
      data.category_id,
      data.price,
      data.stock || 0,
      data.unit || "unidad",
      data.description?.trim() || null,
      data.image_url?.trim() || null,
      data.barcode?.trim() || null,
    ],
  )
  return rows[0].id as string
}

export async function createCategory(data: { name: string; image_url?: string }) {
  await requireEnabledUser()
  if (!data.name.trim()) throw new Error("Ponele un nombre a la categoría.")
  const slug = data.name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  const { rows: countRows } = await pool.query(
    `select coalesce(max(display_order), 0) + 1 as next from public.categories`,
  )
  await pool.query(
    `insert into public.categories (name, slug, image_url, display_order)
     values ($1, $2, $3, $4)`,
    [data.name.trim(), slug, data.image_url?.trim() || null, countRows[0].next],
  )
}

export async function updateCategory(id: string, data: { name: string; image_url?: string }) {
  await requireEnabledUser()
  if (!data.name.trim()) throw new Error("Ponele un nombre a la categoría.")
  await pool.query(
    `update public.categories set name = $2, image_url = $3 where id = $1`,
    [id, data.name.trim(), data.image_url?.trim() || null],
  )
}

export async function deleteCategory(id: string) {
  await requireEnabledUser()
  const { rows } = await pool.query(
    `select count(*)::int as count from public.products where category_id = $1`,
    [id],
  )
  if (rows[0].count > 0) {
    throw new Error(`No se puede borrar: hay ${rows[0].count} producto(s) en esta categoría.`)
  }
  await pool.query(`delete from public.categories where id = $1`, [id])
}