"use server"

import { pool } from "@/lib/db"
import { requireEnabledUser } from "@/lib/session"

export type ImportRow = {
  id?: string
  nombre: string
  categoria_id: string
  precio: number
  stock: number
  unidad: string
  descripcion: string
  imagen_url: string
}

export async function importProducts(rows: ImportRow[]) {
  await requireEnabledUser()
  let created = 0
  let updated = 0
  const errors: string[] = []

  for (const r of rows) {
    try {
      if (r.id) {
        await pool.query(
          `update public.products
           set name = $2, category_id = $3, price = $4, stock = $5, unit = $6,
               description = $7, image_url = $8, updated_at = now()
           where id = $1`,
          [r.id, r.nombre, r.categoria_id, r.precio, r.stock, r.unidad, r.descripcion || null, r.imagen_url || null],
        )
        updated++
      } else {
        await pool.query(
          `insert into public.products
             (name, category_id, price, stock, unit, description, image_url, is_active)
           values ($1, $2, $3, $4, $5, $6, $7, true)`,
          [r.nombre, r.categoria_id, r.precio, r.stock, r.unidad, r.descripcion || null, r.imagen_url || null],
        )
        created++
      }
    } catch (err) {
      errors.push(`${r.nombre}: ${err instanceof Error ? err.message : "error desconocido"}`)
    }
  }

  return { created, updated, errors }
}

export async function exportProducts() {
  await requireEnabledUser()
  const { rows } = await pool.query(
    `select p.id, p.name as nombre, c.name as categoria, p.price as precio,
            p.stock, p.unit as unidad, p.description as descripcion,
            p.image_url as imagen_url, p.barcode
     from public.products p
     left join public.categories c on c.id = p.category_id
     order by c.display_order asc nulls last, p.name asc`,
  )
  return rows
}
