-- ---------------------------------------------------------------------
-- CATEGORÍAS VISIBLES: poder ocultar una categoría en la tienda
-- ---------------------------------------------------------------------
-- La tienda ya filtra por categories.is_visible. Sin esta columna las
-- consultas fallan y no aparecen ni productos ni categorías.
-- Se maneja desde la app de Fiados (misma base de Supabase).
-- Ejecutar UNA vez en el SQL Editor de Supabase.

alter table public.categories
  add column if not exists is_visible boolean not null default true;

-- Las categorías existentes quedan visibles.
update public.categories set is_visible = true where is_visible is null;
