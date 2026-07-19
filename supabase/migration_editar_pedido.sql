-- =========================================================================
-- Migración: permitir que el admin habilite la edición de un pedido y que
-- el cliente lo edite (sacar productos / bajar cantidades) cuando falta
-- stock de algo.
--
-- CÓMO CORRERLA:
--   1. Entrá a tu proyecto en supabase.com
--   2. Andá a "SQL Editor" (en el menú de la izquierda)
--   3. Pegá todo este archivo y tocá "Run"
--   4. Si algún "create policy" te tira error porque ya existe una
--      policy con ese nombre, es porque ya la tenés creada con otro
--      nombre — no pasa nada, podés ignorar esa parte puntual.
-- =========================================================================

-- 1) Columnas nuevas en `orders`
alter table public.orders
  add column if not exists edit_unlocked boolean not null default false,
  add column if not exists edit_note text,
  add column if not exists edited_by_customer_at timestamptz;

-- 2) Permitir que el CLIENTE (dueño del pedido) pueda actualizar y borrar
--    sus propios renglones (order_items), pero SOLO mientras el admin
--    haya habilitado la edición de ese pedido (edit_unlocked = true).
--    Esto es lo que hace que el cliente pueda sacar un producto o bajar
--    la cantidad desde su pantalla, sin darle permiso para tocar pedidos
--    que no son suyos ni pedidos que no están en modo edición.

drop policy if exists "cliente puede editar sus renglones si el pedido esta desbloqueado" on public.order_items;
create policy "cliente puede editar sus renglones si el pedido esta desbloqueado"
on public.order_items
for update
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
      and o.edit_unlocked = true
  )
);

drop policy if exists "cliente puede borrar sus renglones si el pedido esta desbloqueado" on public.order_items;
create policy "cliente puede borrar sus renglones si el pedido esta desbloqueado"
on public.order_items
for delete
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
      and o.edit_unlocked = true
  )
);

-- 3) Nota sobre `orders`: si ya podés cancelar un pedido o responder la
--    propuesta de "vuelto en productos" desde /dashboard, es porque ya
--    existe una policy que le permite al cliente actualizar su propio
--    pedido (`user_id = auth.uid()`). Esa misma policy alcanza para que
--    también pueda actualizar `total` y `edit_unlocked` — no hace falta
--    tocar nada ahí. Si en algún momento notás que el cliente NO puede
--    guardar los cambios (error de "row level security"), avisame para
--    revisar esa policy puntual.
