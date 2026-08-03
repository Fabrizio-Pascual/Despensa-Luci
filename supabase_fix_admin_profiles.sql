-- ============================================================
-- Arregla el toggle "Habilitar fiado" (y "Banear"/"Hacer admin")
-- que se guarda pero no queda.
--
-- Causa: la tabla "profiles" en Supabase probablemente tiene una regla
-- de seguridad (RLS) que solo deja a cada usuario editar SU PROPIO
-- perfil. Por eso cuando vos, como admin, intentás cambiar el perfil
-- de otro cliente, Supabase no tira error, pero tampoco cambia nada.
--
-- Corré esto UNA VEZ en Supabase > SQL Editor > New query.
-- ============================================================

-- Función que chequea si un usuario es admin, sin quedar atrapada
-- en las mismas reglas de seguridad que estamos por arreglar.
create or replace function public.is_store_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('admin', 'superadmin')
  );
$$;

-- Permite que un admin actualice el perfil de cualquier cliente
-- (habilitar fiado, banear, hacer admin, etc.)
drop policy if exists "Admins pueden editar cualquier perfil" on public.profiles;
create policy "Admins pueden editar cualquier perfil"
on public.profiles
for update
using (public.is_store_admin(auth.uid()))
with check (public.is_store_admin(auth.uid()));

-- ============================================================
-- Si el cliente (o el admin) cancela un pedido que se había hecho
-- con Fiado, esto borra la deuda asociada a ese pedido automáticamente.
-- No toca la función que ya tenías para CREAR la deuda: esto es
-- aparte, solo actúa cuando el pedido pasa a "cancelled".
-- ============================================================

create or replace function public.handle_order_cancelled_fiado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    delete from public.debts where order_id = new.id and is_paid = false;
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_cancelled_remove_fiado on public.orders;
create trigger on_order_cancelled_remove_fiado
  after update on public.orders
  for each row
  execute function public.handle_order_cancelled_fiado();
