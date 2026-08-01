import { redirect } from 'next/navigation'

// "Ofertas" se reemplazó por "Combos" (precio fijo por conjunto de
// productos). Dejamos este redirect por si queda algún link viejo guardado.
export default function OfertasRedirect() {
  redirect('/combos')
}
