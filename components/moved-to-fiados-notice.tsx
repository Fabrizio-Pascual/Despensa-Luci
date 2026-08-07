import Link from 'next/link'
import { ExternalLink, ArrowRight } from 'lucide-react'

export function MovedToFiadosNotice({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-[24px] border border-border/40 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ArrowRight className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-headline-sm mb-2 text-foreground">{title} se mudó</h1>
        <p className="mb-6 text-sm text-muted-foreground">{description}</p>
        <Link
          href="https://despensalucifiados.vercel.app/sign-in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground premium-transition hover:opacity-90"
        >
          Abrir app de Fiados
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
