import Image from "next/image"
import { Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { SignOutButton } from "@/components/sign-out-button"

export function PendingApproval({ name }: { name: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Image
        src="/logo-despensa.png"
        alt="Logo de la Despensa de la Luci"
        width={72}
        height={72}
        className="h-16 w-16 object-contain"
        priority
      />
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Clock className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-xl font-semibold text-foreground">
              ¡Hola, {name}!
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              Tu cuenta fue creada correctamente, pero todavía no está habilitada.
              El administrador tiene que darte acceso antes de que puedas ver los
              clientes y proveedores.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Avisale a la dueña para que te habilite. Después volvé a entrar.
          </p>
          <SignOutButton variant="outline" />
        </CardContent>
      </Card>
    </div>
  )
}
