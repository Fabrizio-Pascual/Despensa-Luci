-- ============================================================
-- Actualización 3: agrega código de barras a los productos, para
-- poder buscarlos escaneando desde la app de fiados.
-- Corré esto en Supabase > SQL Editor.
-- ============================================================

alter table public.products
  add column if not exists barcode text;

create index if not exists products_barcode_idx
  on public.products (barcode)
  where barcode is not null;
