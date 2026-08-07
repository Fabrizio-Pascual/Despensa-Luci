import { MovedToFiadosNotice } from '@/components/moved-to-fiados-notice'

export default function AdminProductosPage() {
  return (
    <MovedToFiadosNotice
      title="Productos"
      description="La carga y edición de productos (precio, stock, código de barras, sabores/variantes) ahora se maneja desde la app de Fiados, con búsqueda por categoría y escaneo de código de barras."
    />
  )
}
