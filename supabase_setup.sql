-- ============================================================
-- Setup de "Despensa de la Luci — Fiados y Proveedores"
-- Corré este script UNA VEZ en Supabase > SQL Editor > New query
-- Usa la misma base de datos que la tienda, pero todas las tablas
-- tienen el prefijo "fiados_" para no chocar con nada de la tienda.
-- ============================================================

-- ---------- Tablas de login (las maneja better-auth) ----------
create table if not exists public.fiados_user (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  enabled boolean not null default false,
  role text not null default 'employee',
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists public.fiados_session (
  id text primary key,
  "expiresAt" timestamp not null,
  token text not null unique,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references public.fiados_user(id) on delete cascade
);

create table if not exists public.fiados_account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references public.fiados_user(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  scope text,
  password text,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists public.fiados_verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamp not null,
  "createdAt" timestamp default now(),
  "updatedAt" timestamp default now()
);

-- ---------- Clientes con fiado ----------
create table if not exists public.fiados_customers (
  id serial primary key,
  name text not null,
  phone text,
  email text,
  note text,
  "createdByUserId" text not null,
  "createdAt" timestamp not null default now()
);

create index if not exists fiados_customers_email_idx
  on public.fiados_customers (lower(email));

create table if not exists public.fiados_customer_purchases (
  id serial primary key,
  "customerId" integer not null references public.fiados_customers(id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null default 0,
  paid boolean not null default false,
  "paidAt" timestamp,
  "createdByUserId" text not null,
  "createdByName" text,
  "createdAt" timestamp not null default now()
);

-- ---------- Proveedores ----------
create table if not exists public.fiados_suppliers (
  id serial primary key,
  name text not null,
  phone text,
  note text,
  "createdByUserId" text not null,
  "createdAt" timestamp not null default now()
);

create table if not exists public.fiados_supplier_orders (
  id serial primary key,
  "supplierId" integer not null references public.fiados_suppliers(id) on delete cascade,
  items text not null,
  cost numeric(12, 2) not null default 0,
  "amountToPay" numeric(12, 2) not null default 0,
  status text not null default 'pendiente',
  paid boolean not null default false,
  "paidAt" timestamp,
  "createdByUserId" text not null,
  "createdByName" text,
  "createdAt" timestamp not null default now()
);

-- ============================================================
-- Funciones para que la TIENDA (Despensa Luci) pueda consultar
-- si un cliente tiene fiado habilitado, sin darle acceso directo
-- a la tabla de clientes. Solo exponen lo mínimo necesario.
-- ============================================================

create or replace function public.fiado_customer_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.fiados_customers
    where lower(email) = lower(p_email)
  );
$$;

create or replace function public.fiado_record_purchase(
  p_email text,
  p_description text,
  p_amount numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id integer;
begin
  select id into v_customer_id
  from public.fiados_customers
  where lower(email) = lower(p_email)
  limit 1;

  if v_customer_id is null then
    return false;
  end if;

  insert into public.fiados_customer_purchases
    ("customerId", description, amount, paid, "createdByUserId", "createdByName")
  values
    (v_customer_id, p_description, p_amount, false, 'tienda-online', 'Tienda online');

  return true;
end;
$$;

-- Cualquiera que esté logueado en la tienda puede preguntar "¿existe?"
-- (no expone datos, solo true/false) y anotar una compra a fiado.
grant execute on function public.fiado_customer_exists(text) to anon, authenticated;
grant execute on function public.fiado_record_purchase(text, text, numeric) to authenticated;
