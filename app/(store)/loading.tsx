import { Skeleton } from '@/components/ui/skeleton'

/**
 * Se muestra automáticamente (Next.js App Router) mientras carga
 * cualquier página de la tienda que tarde en traer datos del server
 * (ej: la homepage esperando productos/categorías de Supabase).
 * La forma respeta aproximadamente la estructura real: hero,
 * categorías, grilla de productos — así no "salta" el layout cuando
 * el contenido real reemplaza al skeleton.
 */
export default function StoreLoading() {
  return (
    <div className="pb-16">
      <div className="mesh-bg" />

      {/* Hero */}
      <section className="pt-10 pb-16 md:pt-16 md:pb-24 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <Skeleton className="h-7 w-56 rounded-full mb-8" />
            <Skeleton className="h-10 w-full max-w-md mb-3" />
            <Skeleton className="h-10 w-3/4 max-w-sm mb-6" />
            <Skeleton className="h-5 w-full max-w-lg mb-2" />
            <Skeleton className="h-5 w-2/3 max-w-md mb-10" />
            <div className="flex gap-4">
              <Skeleton className="h-14 w-40 rounded-xl" />
              <Skeleton className="h-14 w-32 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-[320px] md:h-[500px] rounded-[40px]" />
        </div>
      </section>

      {/* Categorías */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-24 md:h-28 md:w-28 rounded-2xl shrink-0" />
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      <section className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-56 mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[24px] border border-border/40 p-4">
              <Skeleton className="h-48 rounded-2xl mb-4" />
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3 mb-3" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
