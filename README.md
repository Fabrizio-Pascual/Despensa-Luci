# Cambios: Modo claro/oscuro + Combos

## Cómo aplicar esto a tu repo

Estos archivos mantienen la misma ruta que en tu proyecto. Lo más simple:
copiá cada uno pisando el archivo existente en tu repo local, y agregá los
que son nuevos. Después `git add`, `git commit`, `git push` como siempre.

**Nuevos** (no existían antes):
- `supabase/migration_combos.sql`
- `components/theme-toggle.tsx`
- `app/(store)/combos/page.tsx`
- `app/admin/combos/page.tsx`

**Modificados** (pisan al archivo existente):
- `app/layout.tsx`
- `lib/types.ts`
- `components/cart-context.tsx`
- `components/cart-sheet.tsx`
- `components/header.tsx`
- `components/mobile-bottom-nav.tsx`
- `components/admin-sidebar-nav.tsx`
- `components/admin-mobile-nav.tsx`
- `components/admin-order-detail-page.tsx`
- `components/order-editor.tsx`
- `app/(store)/carrito/page.tsx`
- `app/(store)/checkout/page.tsx`
- `app/(store)/ofertas/page.tsx` (ahora es solo un redirect a `/combos`)
- `app/dashboard/pedidos/[id]/page.tsx`
- `app/admin/pedidos/[id]/page.tsx`
- `lib/receipt.ts`

## Paso 1 — Base de datos (hacé esto ANTES de subir el código)

Entrá a tu proyecto en supabase.com → **SQL Editor** → pegá todo el
contenido de `supabase/migration_combos.sql` → **Run**.

Esto crea las tablas `combos` y `combo_items`, los permisos (RLS), y
habilita que un ítem del carrito/pedido pueda ser un combo en vez de un
producto suelto.

## Paso 2 — Subir el código

Reemplazá/agregá los archivos de arriba y hacé el deploy como siempre
(push a la rama que tenga conectado Vercel).

## Qué quedó resuelto

### Modo claro/oscuro
El tema estaba forzado a oscuro (`forcedTheme="dark"` en el
`ThemeProvider` de `app/layout.tsx`) — por eso no existía ningún botón
para cambiarlo. Ya está sacado el forzado, y hay un botón sol/luna en:
- Header desktop (junto al ícono de favoritos)
- Menú "Más" en la barra de mobile

La elección se guarda sola (la maneja la librería `next-themes`).

### Combos
Reemplaza el concepto de "Ofertas" (descuento % sobre un producto) por
combos: un precio fijo por un conjunto de productos (ej: pebete + bajío
chico por $3000).

- **Admin → Combos** (nuevo, en el menú del panel): elegís nombre,
  productos + cantidad de cada uno, precio fijo, imagen opcional, y si
  está activo o no.
- **/combos** (nueva página pública, reemplaza a `/ofertas`, que ahora
  redirige ahí): muestra los combos activos, de qué se componen, precio,
  y un botón para agregarlo al carrito.
- El combo se agrega al carrito **como un solo ítem** (no como los
  productos sueltos), tal cual pediste.
- El stock del combo depende del stock de cada producto que lo compone:
  se calcula cuántos combos se pueden armar ahora mismo (el mínimo entre
  todos los componentes) y se usa para mostrar "quedan pocos" o
  deshabilitar el botón si no alcanza.
- Al confirmar un pedido con un combo, se descuenta stock de **cada
  producto componente** (multiplicado por la cantidad de combos
  pedidos) — no hay una columna de "stock del combo" en sí.
- En el detalle de pedido (admin y cliente) y en los recibos PDF, un
  combo se muestra como "🎁 Nombre del combo" en vez de aparecer en
  blanco.

## Una limitación a tener en cuenta

Si editás los productos de un combo después de que ya se vendió, los
pedidos viejos van a seguir mostrando bien el **nombre** del combo (se
guarda una copia al momento de la compra), pero si alguien quiere ver
"de qué productos se componía ese pedido puntual", va a ver la
composición **actual** del combo, no la de ese momento. Para lo que
usás la app (despensa de barrio) no debería ser un problema en la
práctica, pero si en algún momento te importa tener el historial exacto
avisame y lo puedo dejar resuelto con un snapshot completo.
