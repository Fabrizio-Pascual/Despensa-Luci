-- =========================================================================
-- Migración: Avatares de usuario (galería + foto propia) y soporte para
-- que el trigger que crea el perfil también funcione con Google Login.
--
-- CÓMO CORRERLA:
--   1. Entrá a tu proyecto en supabase.com
--   2. Andá a "SQL Editor" (menú de la izquierda)
--   3. Pegá todo este archivo y tocá "Run"
--   4. Si algún "create policy" tira error porque ya existe una policy
--      con ese nombre, no pasa nada — es porque ya la tenés creada.
-- =========================================================================

-- 1) Columna avatar_url por si no existiera todavía (en tu proyecto ya
--    existe según lib/types.ts, esto es solo un resguardo).
alter table public.profiles
  add column if not exists avatar_url text;

-- 2) Bucket público de Storage donde se guardan las fotos que suben los
--    usuarios. Público de LECTURA (para que se vea en el navbar y en el
--    panel de admin sin firmar URLs), pero solo el dueño puede escribir
--    en su propia carpeta.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lectura pública de todos los avatares (necesario para mostrarlos en
-- el navbar de cualquier visitante y en el panel de admin).
drop policy if exists "avatars: lectura publica" on storage.objects;
create policy "avatars: lectura publica"
on storage.objects for select
using (bucket_id = 'avatars');

-- Cada usuario solo puede subir/actualizar/borrar archivos dentro de una
-- carpeta con su propio user id como nombre (ej: "{user_id}/foto.jpg").
-- Así nadie puede pisar o borrar la foto de otro usuario.
drop policy if exists "avatars: subir propia carpeta" on storage.objects;
create policy "avatars: subir propia carpeta"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars: actualizar propia carpeta" on storage.objects;
create policy "avatars: actualizar propia carpeta"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars: borrar propia carpeta" on storage.objects;
create policy "avatars: borrar propia carpeta"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) Trigger que crea (o completa) el perfil cuando alguien se registra,
--    ya sea con email/contraseña o con Google. Google manda el nombre y
--    la foto en el "user_metadata" del usuario (full_name/name y
--    avatar_url/picture) — este trigger los aprovecha para dejar el
--    perfil ya precargado con esos datos, sin pisar nada si el perfil
--    ya existía y ya tenía nombre/foto propios.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- PASO MANUAL QUE FALTA (no se puede hacer por SQL): habilitar Google
-- como proveedor de login.
--   1. En supabase.com > tu proyecto > Authentication > Sign In / Providers > Google
--   2. Necesitás un Client ID y Client Secret de Google. Se generan en
--      https://console.cloud.google.com/apis/credentials
--      - Crear credenciales > "ID de cliente de OAuth" > tipo "Aplicación web"
--      - En "URI de redireccionamiento autorizados" pegá la URL que te
--        muestra la propia pantalla de Supabase (algo como
--        https://TU-PROYECTO.supabase.co/auth/v1/callback)
--   3. Pegá el Client ID y Client Secret en la pantalla de Supabase y
--      guardá. Con eso el botón "Continuar con Google" de la app ya
--      funciona solo.
-- =========================================================================
