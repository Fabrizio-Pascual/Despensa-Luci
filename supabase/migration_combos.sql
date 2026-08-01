-- =========================================================================
-- Migración: COMBOS (reemplaza el concepto de "ofertas" por combos con
-- precio fijo, ej: "Pebete calentito + Bajío chico — $3000")
--
-- CÓMO CORRERLA:
--   1. Entrá a tu proyecto en supabase.com
--   2. Andá a "SQL Editor" (menú de la izquierda)
--   3. Pegá todo este archivo y tocá "Run"
--   4. Si algún "create policy" tira error porque ya existe una policy
--      con ese nombre, no pasa nada — es porque ya la tenés creada.
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1) COMBOS y sus productos
-- ---------------------------------------------------------------------
create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.combos(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  unique (combo_id, product_id)
);

alter table public.combos enable row level security;
alter table public.combo_items enable row level security;

-- Cualquiera puede ver los combos activos y sus productos (catálogo público)
drop policy if exists "combos: lectura publica" on public.combos;
create policy "combos: lectura publica"
on public.combos for select
using (true);

drop policy if exists "combo items: lectura publica" on public.combo_items;
create policy "combo items: lectura publica"
on public.combo_items for select
using (true);

-- Solo el admin puede crear/editar/borrar combos y sus productos
drop policy if exists "combos: el admin administra" on public.combos;
create policy "combos: el admin administra"
on public.combos for all
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

drop policy if exists "combo items: el admin administra" on public.combo_items;
create policy "combo items: el admin administra"
on public.combo_items for all
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- Vista: cuántos combos se pueden armar ahora mismo según el stock de cada
-- producto que lo compone (el mínimo entre todos). La usa /combos para
-- mostrar "quedan X" y desactivar el botón cuando ya no alcanza el stock.
create or replace view public.combo_availability_view as
select
  c.id as combo_id,
  coalesce(min(floor(p.stock / ci.quantity)), 0)::integer as available_qty
from public.combos c
join public.combo_items ci on ci.combo_id = c.id
join public.products p on p.id = ci.product_id
group by c.id;

-- ---------------------------------------------------------------------
-- 2) CARRITO Y PEDIDOS: permitir un ítem que sea un combo en vez de un
--    producto suelto. product_id pasa a ser opcional porque una fila de
--    combo no apunta a un producto individual.
-- ---------------------------------------------------------------------
alter table public.cart_items alter column product_id drop not null;
alter table public.cart_items add column if not exists combo_id uuid references public.combos(id) on delete cascade;
alter table public.cart_items add constraint cart_items_producto_o_combo
  check (
    (product_id is not null and combo_id is null) or
    (product_id is null and combo_id is not null)
  );

alter table public.order_items alter column product_id drop not null;
alter table public.order_items add column if not exists combo_id uuid references public.combos(id) on delete set null;
-- Guardamos nombre y precio del combo al momento de la compra: si más
-- adelante editás o borrás el combo, el pedido viejo sigue mostrando bien
-- qué fue lo que se compró.
alter table public.order_items add column if not exists combo_name text;
