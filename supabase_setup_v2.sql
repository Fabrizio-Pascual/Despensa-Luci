-- ============================================================
-- Actualización 2: vincula cada anotación de fiado con el pedido
-- online que la generó, para poder borrarla sola si se cancela.
-- Corré esto en Supabase > SQL Editor (además del supabase_setup.sql
-- que ya corriste antes — este es un agregado, no lo reemplaza).
-- ============================================================

alter table public.fiados_customer_purchases
  add column if not exists "storeOrderId" text;

alter table public.fiados_supplier_orders
  add column if not exists urgent boolean not null default false;

create or replace function public.fiado_record_purchase(
  p_email text,
  p_description text,
  p_amount numeric,
  p_order_id text default null
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
    ("customerId", description, amount, paid, "createdByUserId", "createdByName", "storeOrderId")
  values
    (v_customer_id, p_description, p_amount, false, 'tienda-online', 'Tienda online', p_order_id);

  return true;
end;
$$;

grant execute on function public.fiado_record_purchase(text, text, numeric, text) to authenticated;
