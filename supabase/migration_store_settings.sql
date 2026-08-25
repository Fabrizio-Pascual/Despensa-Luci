-- ---------------------------------------------------------------------
-- STORE SETTINGS: estado manual de la tienda (abierta/cerrada)
-- ---------------------------------------------------------------------
-- El admin decide desde el panel si la tienda está "abierta" o
-- "cerrada" para tomar pedidos. Esto NO se calcula por horario: es
-- una bandera manual, así el dueño puede cerrarla cuando se va del
-- local, se queda sin stock, etc., sin depender de un horario fijo.
--
-- Usamos una sola fila (id fijo) como "singleton" de configuración.

create table if not exists public.store_settings (
  id boolean primary key default true,
  is_open boolean not null default true,
  closed_message text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint store_settings_singleton check (id)
);

insert into public.store_settings (id, is_open)
values (true, true)
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

-- Lectura pública: cualquiera (logueado o no) necesita saber si la
-- tienda está abierta para decidir si puede pedir.
drop policy if exists "store settings: lectura publica" on public.store_settings;
create policy "store settings: lectura publica"
on public.store_settings for select
using (true);

-- Solo el admin puede cambiar el estado.
drop policy if exists "store settings: solo admin actualiza" on public.store_settings;
create policy "store settings: solo admin actualiza"
on public.store_settings for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);
