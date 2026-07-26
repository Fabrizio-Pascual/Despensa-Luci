-- =========================================================================
-- Migración: tablas para las funcionalidades nuevas
--   - Favoritos
--   - Programa de puntos (loyalty, solo acumulación por ahora)
--   - Notificaciones de "avisame cuando haya stock"
--   - Flash sales / ofertas por tiempo limitado
--   - Vista de productos más buscados/vendidos (para "Recomendados")
--
-- CÓMO CORRERLA:
--   1. Entrá a tu proyecto en supabase.com
--   2. Andá a "SQL Editor" (menú de la izquierda)
--   3. Pegá todo este archivo y tocá "Run"
--   4. Si algún "create policy" tira error porque ya existe una policy
--      con ese nombre, no pasa nada — es porque ya la tenés creada.
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1) FAVORITOS
-- ---------------------------------------------------------------------
create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.user_favorites enable row level security;

drop policy if exists "favoritos: el usuario ve los suyos" on public.user_favorites;
create policy "favoritos: el usuario ve los suyos"
on public.user_favorites for select
using (user_id = auth.uid());

drop policy if exists "favoritos: el usuario agrega los suyos" on public.user_favorites;
create policy "favoritos: el usuario agrega los suyos"
on public.user_favorites for insert
with check (user_id = auth.uid());

drop policy if exists "favoritos: el usuario borra los suyos" on public.user_favorites;
create policy "favoritos: el usuario borra los suyos"
on public.user_favorites for delete
using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2) PUNTOS DE FIDELIDAD (loyalty) — solo acumulación por ahora, sin
--    canje ni catálogo de premios (eso lo sumamos más adelante).
-- ---------------------------------------------------------------------
create table if not exists public.user_loyalty_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  points_balance integer not null default 0,
  total_points_earned integer not null default 0,
  total_points_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_loyalty_points enable row level security;

drop policy if exists "loyalty: el usuario ve los suyos" on public.user_loyalty_points;
create policy "loyalty: el usuario ve los suyos"
on public.user_loyalty_points for select
using (user_id = auth.uid());

drop policy if exists "loyalty: el usuario crea el suyo" on public.user_loyalty_points;
create policy "loyalty: el usuario crea el suyo"
on public.user_loyalty_points for insert
with check (user_id = auth.uid());

drop policy if exists "loyalty: el usuario actualiza el suyo" on public.user_loyalty_points;
create policy "loyalty: el usuario actualiza el suyo"
on public.user_loyalty_points for update
using (user_id = auth.uid());

-- Función + trigger: cada vez que un pedido pasa a "completed", le sumamos
-- 1 punto cada $100 gastados (redondeado para abajo) al cliente dueño del
-- pedido. Es un cálculo simple a propósito — cuando definas premios/canje
-- más adelante, esta es la función que hay que tocar.
create or replace function public.otorgar_puntos_por_pedido_completado()
returns trigger as $$
declare
  puntos_a_sumar integer;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    puntos_a_sumar := floor(new.total / 100);
    if puntos_a_sumar > 0 then
      insert into public.user_loyalty_points (user_id, points_balance, total_points_earned)
      values (new.user_id, puntos_a_sumar, puntos_a_sumar)
      on conflict (user_id) do update
        set points_balance = public.user_loyalty_points.points_balance + puntos_a_sumar,
            total_points_earned = public.user_loyalty_points.total_points_earned + puntos_a_sumar,
            updated_at = now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_otorgar_puntos_pedido on public.orders;
create trigger trigger_otorgar_puntos_pedido
after update on public.orders
for each row
execute function public.otorgar_puntos_por_pedido_completado();

-- ---------------------------------------------------------------------
-- 3) NOTIFICACIONES DE STOCK ("avisame cuando llegue")
-- ---------------------------------------------------------------------
create table if not exists public.stock_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  notified boolean not null default false,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.stock_notifications enable row level security;

drop policy if exists "stock notif: el usuario ve las suyas" on public.stock_notifications;
create policy "stock notif: el usuario ve las suyas"
on public.stock_notifications for select
using (user_id = auth.uid());

drop policy if exists "stock notif: el usuario crea las suyas" on public.stock_notifications;
create policy "stock notif: el usuario crea las suyas"
on public.stock_notifications for insert
with check (user_id = auth.uid());

drop policy if exists "stock notif: el usuario borra las suyas" on public.stock_notifications;
create policy "stock notif: el usuario borra las suyas"
on public.stock_notifications for delete
using (user_id = auth.uid());

-- El admin necesita poder LEER todas las notificaciones pendientes para
-- saber a quién avisarle cuando reponés stock de un producto (esto todavía
-- no tiene una pantalla en /admin, pero la tabla ya queda lista para eso).
drop policy if exists "stock notif: el admin ve todas" on public.stock_notifications;
create policy "stock notif: el admin ve todas"
on public.stock_notifications for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

-- ---------------------------------------------------------------------
-- 4) FLASH SALES / OFERTAS POR TIEMPO LIMITADO
-- ---------------------------------------------------------------------
create table if not exists public.flash_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  discount_percent integer not null check (discount_percent > 0 and discount_percent <= 90),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.flash_sales enable row level security;

-- Cualquiera (incluso sin login, modo catálogo) puede ver las ofertas
-- activas — son públicas por naturaleza.
drop policy if exists "flash sales: lectura publica" on public.flash_sales;
create policy "flash sales: lectura publica"
on public.flash_sales for select
using (true);

-- Solo el admin puede crear/editar/borrar ofertas.
drop policy if exists "flash sales: el admin administra" on public.flash_sales;
create policy "flash sales: el admin administra"
on public.flash_sales for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

-- Vista de solo las ofertas vigentes AHORA MISMO (lo que usa /ofertas).
create or replace view public.active_flash_sales_view as
select
  fs.id,
  fs.product_id,
  fs.discount_percent,
  fs.starts_at,
  fs.ends_at
from public.flash_sales fs
where fs.is_active = true
  and fs.starts_at <= now()
  and fs.ends_at >= now();

-- ---------------------------------------------------------------------
-- 5) VISTA DE PRODUCTOS DESTACADOS (para "Recomendados" en la home):
--    cuenta favoritos y unidades vendidas (en pedidos completados) por
--    producto, para poder ordenar por "tendencia" o "más vendidos" sin
--    tener que calcularlo en el cliente.
-- ---------------------------------------------------------------------
create or replace view public.top_products_view as
select
  p.*,
  coalesce(fav.favorite_count, 0) as favorite_count,
  coalesce(sales.sales_count, 0) as sales_count
from public.products p
left join (
  select product_id, count(*) as favorite_count
  from public.user_favorites
  group by product_id
) fav on fav.product_id = p.id
left join (
  select oi.product_id, sum(oi.quantity) as sales_count
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status = 'completed'
  group by oi.product_id
) sales on sales.product_id = p.id
where p.is_active = true;
