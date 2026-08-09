"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Traduce los errores típicos de getUserMedia a algo entendible, y para los
// que no reconocemos mostramos el nombre técnico igual, así se puede
// diagnosticar sin tener que abrir la consola del navegador.
function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : (err as any)?.name
  const message = err instanceof Error ? err.message : String(err)

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "El navegador tiene la cámara bloqueada para este sitio (permiso denegado). Entrá a la configuración del sitio (ícono al lado de la URL) y poné Cámara en 'Permitir', después recargá la página."
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No se encontró ninguna cámara disponible. Si estás en Brave, puede ser el bloqueo de huellas digitales (Shields) simulando que no hay cámaras: bajá los Shields para este sitio y recargá."
    case "NotReadableError":
    case "TrackStartError":
      return "La cámara está siendo usada por otra app o pestaña (o el sistema operativo se la bloqueó). Cerrá otras apps que puedan estar usándola e intentá de nuevo."
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "No hay ninguna cámara que cumpla lo pedido (cámara trasera). Puede ser un dispositivo sin cámara trasera, como una notebook."
    case "SecurityError":
      return "El navegador bloqueó el acceso a la cámara por seguridad. Revisá que el sitio esté en https:// (no funciona en http:// salvo localhost)."
    case "AbortError":
      return "Se interrumpió el acceso a la cámara antes de poder usarla. Probá de nuevo."
    default:
      return `No se pudo acceder a la cámara${name ? ` (${name})` : ""}${message ? `: ${message}` : ""}.`
  }
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}) {
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRafRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)

  // El parche de "dibujar el video en un canvas" es específico de un bug de
  // compositing de WebKit/iOS. En Android (sobre todo Brave, por sus
  // protecciones anti-fingerprinting que interfieren con canvas) ese mismo
  // parche puede terminar tapando la imagen. Por eso solo lo usamos en iOS;
  // en el resto mostramos el <video> real directamente.
  const [useCanvasPatch] = useState(() => {
    if (typeof navigator === "undefined") return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  })

  // Callback ref: nos avisa exactamente cuando el <video> queda montado en
  // el DOM (el modal anima su apertura, así que puede no existir todavía en
  // el primer render donde open pasa a true).
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null)
  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    setVideoNode(node)
  }, [])

  // Dibuja a mano los frames del <video> en un <canvas>. Esto es necesario
  // porque en los navegadores de iOS (Brave, Chrome, Firefox: todos corren
  // sobre el motor WebKit que exige Apple) el elemento <video> con un stream
  // de cámara puede quedar en negro aunque el stream esté activo. Pintando
  // los frames a mano en un canvas evitamos ese bug de compositing.
  useEffect(() => {
    if (!useCanvasPatch) return
    if (starting || error) return
    const video = videoNode
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let active = true
    function draw() {
      if (!active || !video || !canvas || !ctx) return
      if (video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      }
      drawRafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      active = false
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current)
      drawRafRef.current = null
    }
  }, [starting, error, videoNode])

  useEffect(() => {
    if (!open || !videoNode) return
    const video = videoNode
    let cancelled = false
    setError(null)
    setStarting(true)

    ;(async () => {
      try {
        if (typeof window === "undefined" || !window.isSecureContext) {
          throw Object.assign(new Error("Contexto no seguro"), { name: "SecurityError" })
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error("getUserMedia no disponible"), { name: "NotFoundError" })
        }

        video.muted = true
        video.playsInline = true
        // @ts-ignore -- propiedad no estándar que usa Safari/iOS viejo
        video.setAttribute("webkit-playsinline", "true")

        // Pedimos la cámara nosotros mismos (en vez de dejar que lo haga la
        // librería de lectura) para poder capturar el error real que tira
        // el navegador y mostrarlo tal cual, en vez de un mensaje genérico.
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          })
        } catch {
          // Si falló por pedir específicamente la trasera, reintentamos sin
          // esa restricción (algunas notebooks/webcams no tienen "environment").
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        const reader = new BrowserMultiFormatReader()

        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result && !cancelled) {
            onDetected(result.getText())
            controls.stop()
            onOpenChange(false)
          }
        })

        if (cancelled) {
          controls.stop()
          return
        }

        try {
          await video.play()
        } catch {
          // puede rechazar si ya está reproduciendo, no es un error real
        }

        controlsRef.current = controls
        setStarting(false)
      } catch (err) {
        console.error("[barcode-scanner]", err)
        if (!cancelled) {
          setError(describeCameraError(err))
          setStarting(false)
        }
      }
    })()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open, videoNode, onDetected, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Escanear código de barras</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square bg-black">
          {/* El <video> real queda invisible (pero sigue "vivo" en el DOM,
              lo necesita la librería para decodificar). Lo que ve la
              persona es el <canvas>, que se pinta a mano frame a frame. */}
          <video
            ref={videoRefCallback}
            autoPlay
            muted
            playsInline
            className={`absolute inset-0 h-full w-full object-cover ${useCanvasPatch ? "opacity-0" : ""}`}
          />
          {useCanvasPatch && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />}
          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!starting && !error && (
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-primary/80" />
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center text-sm text-white">
              <p>{error}</p>
              <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
        <p className="p-4 text-center text-xs text-muted-foreground">
          Apuntá con la cámara al código de barras del producto
        </p>
      </DialogContent>
    </Dialog>
  )
}
