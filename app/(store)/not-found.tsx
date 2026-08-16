import Link from 'next/link'
import { PackageSearch, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StoreNotFound() {
  return (
    <div className="pb-16">
      <div className="mesh-bg" />
      <div className="container mx-auto px-4 py-24 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <PackageSearch className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-display-lg text-foreground mb-3">No encontramos esto</h1>
        <p className="text-muted-foreground mb-8">
          El producto o la página que buscás no existe, o ya no está disponible.
        </p>
        <Button asChild className="rounded-xl">
          <Link href="/"><Home className="mr-2 h-4 w-4" /> Ver el catálogo</Link>
        </Button>
      </div>
    </div>
  )
}
