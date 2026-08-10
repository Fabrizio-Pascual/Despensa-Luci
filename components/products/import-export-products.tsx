"use client"

import { useState, useRef, useMemo } from "react"
import * as XLSX from "xlsx"
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { importProducts, exportProducts, type ImportRow as ServerImportRow } from "@/app/actions/import-export"
import type { CategoryRow } from "@/app/actions/products"
import { toast } from "sonner"

type Row = {
  id?: string
  nombre: string
  categoria: string
  precio: number
  stock: number
  unidad: string
  descripcion: string
  imagen_url: string
  status: "ok" | "error"
  error?: string
}

const VALID_UNITS = ["unidad", "kg", "g", "litro", "pack"]

export function ImportExportProducts({
  open,
  onOpenChange,
  categories,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: CategoryRow[]
  onDone: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState("")
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState({ created: 0, updated: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((c) => (map[c.name.toLowerCase().trim()] = c.id))
    return map
  }, [categories])

  const validRows = rows.filter((r) => r.status === "ok")
  const errorRows = rows.filter((r) => r.status === "error")

  function handleFile(file: File) {
    setFileName(file.name)
    setDone(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" })

        const parsed: Row[] = json.map((raw) => {
          const nombre = String(raw.nombre || "").trim()
          const categoria = String(raw.categoria || "").trim()
          const precio = parseFloat(raw.precio)
          const stock = parseInt(raw.stock) || 0
          const unidad = String(raw.unidad || "unidad").trim().toLowerCase()
          const descripcion = String(raw.descripcion || "").trim()
          const imagen_url = String(raw.imagen_url || "").trim()
          const id = raw.id ? String(raw.id).trim() : undefined

          let error: string | undefined
          if (!nombre) error = "Falta el nombre"
          else if (!categoria) error = "Falta la categoría"
          else if (!categoryMap[categoria.toLowerCase()]) error = `Categoría "${categoria}" no existe`
          else if (isNaN(precio) || precio <= 0) error = "Precio inválido"
          else if (!VALID_UNITS.includes(unidad)) error = `Unidad "${unidad}" inválida`

          return { id, nombre, categoria, precio, stock, unidad, descripcion, imagen_url, status: error ? "error" : "ok", error }
        })

        setRows(parsed)
        if (parsed.length === 0) toast.error("El archivo no tiene filas de datos")
      } catch {
        toast.error("No se pudo leer el archivo. Verificá que sea un .xlsx válido")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true)
    const payload: ServerImportRow[] = validRows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      categoria_id: categoryMap[r.categoria.toLowerCase()],
      precio: r.precio,
      stock: r.stock,
      unidad: r.unidad,
      descripcion: r.descripcion,
      imagen_url: r.imagen_url,
    }))
    try {
      const result = await importProducts(payload)
      setStats({ created: result.created, updated: result.updated })
      if (result.errors.length === 0) {
        toast.success(`${result.created} nuevo(s), ${result.updated} actualizado(s)`)
      } else {
        toast.warning(`${result.created + result.updated} OK, ${result.errors.length} con error`)
      }
      setDone(true)
      onDone()
    } catch {
      toast.error("No se pudo importar.")
    } finally {
      setImporting(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const data = await exportProducts()
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Productos")
      XLSX.writeFile(wb, `productos-despensa-luci-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch {
      toast.error("No se pudo exportar.")
    } finally {
      setExporting(false)
    }
  }

  function downloadTemplate() {
    const template = [
      {
        id: "(opcional — dejalo vacío para crear nuevo)",
        nombre: "Ejemplo: Pan integral",
        categoria: categories[0]?.name || "Panadería",
        precio: "150.00",
        stock: "50",
        unidad: "unidad",
        descripcion: "Pan recién horneado",
        imagen_url: "https://...",
      },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Productos")
    XLSX.writeFile(wb, "plantilla_productos.xlsx")
  }

  function handleClose(o: boolean) {
    if (!o) {
      setRows([])
      setFileName("")
      setDone(false)
    }
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar / Exportar catálogo
          </DialogTitle>
          <DialogDescription>
            Cargá muchos productos de una — con columna "id" actualiza, sin ella crea nuevo.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                <Download className="h-4 w-4" />
                {exporting ? "Exportando..." : "Exportar catálogo actual"}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Descargar plantilla vacía
              </Button>
            </div>

            <div
              className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center premium-transition hover:border-primary hover:bg-primary/10"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
            >
              <Upload className="mx-auto mb-3 h-9 w-9 text-primary" />
              <p className="font-medium text-foreground">Hacé clic o arrastrá tu Excel acá</p>
              <p className="mt-1 text-sm text-muted-foreground">Formato .xlsx — primera fila con encabezados</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <FileSpreadsheet className="h-4 w-4" />
                {fileName}
              </span>
              <div className="flex gap-2">
                <Badge variant="outline" className="gap-1 border-success/40 bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3" />
                  {validRows.length} OK
                </Badge>
                {errorRows.length > 0 && (
                  <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/10 text-destructive">
                    <XCircle className="h-3 w-3" />
                    {errorRows.length} con error
                  </Badge>
                )}
              </div>
            </div>

            {errorRows.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-1 flex items-center gap-1 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Filas con problemas (no se importan)
                </p>
                <div className="max-h-28 overflow-y-auto">
                  {errorRows.map((r, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium">{r.nombre || "(sin nombre)"}</span>: {r.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="p-2 text-left font-medium">Acción</th>
                    <th className="p-2 text-left font-medium">Producto</th>
                    <th className="p-2 text-right font-medium">Precio</th>
                    <th className="p-2 text-right font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map((r, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="p-2">
                        {r.id ? (
                          <Badge variant="secondary" className="text-xs">actualizar</Badge>
                        ) : (
                          <Badge className="text-xs">crear</Badge>
                        )}
                      </td>
                      <td className="p-2">{r.nombre}</td>
                      <td className="p-2 text-right">{r.precio.toLocaleString("es-AR")}</td>
                      <td className="p-2 text-right">{r.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {done && (
              <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-success">
                <CheckCircle className="h-5 w-5" />
                <p className="text-sm font-medium">
                  Listo: {stats.created} creado(s), {stats.updated} actualizado(s)
                </p>
              </div>
            )}

            <Button variant="ghost" size="sm" className="self-start" onClick={() => { setRows([]); setFileName(""); setDone(false) }}>
              Elegir otro archivo
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {done ? "Cerrar" : "Cancelar"}
          </Button>
          {rows.length > 0 && !done && (
            <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
              {importing ? "Importando..." : `Importar ${validRows.length} producto(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
