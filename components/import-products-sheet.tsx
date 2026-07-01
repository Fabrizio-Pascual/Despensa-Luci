'use client'

import { useState, useRef, useMemo } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'

interface ImportRow {
  nombre: string
  categoria: string
  precio: number
  stock: number
  unidad: string
  descripcion: string
  imagen_url: string
  status: 'ok' | 'error'
  error?: string
}

interface ImportProductsSheetProps {
  open: boolean
  onClose: () => void
  categories: Category[]
  onImported: () => void
}

const VALID_UNITS = ['unidad', 'kg', 'g', 'litro', 'pack']

export function ImportProductsSheet({ open, onClose, categories, onImported }: ImportProductsSheetProps) {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach(c => { map[c.name.toLowerCase().trim()] = c.id })
    return map
  }, [categories])

  const validRows = rows.filter(r => r.status === 'ok')
  const errorRows = rows.filter(r => r.status === 'error')

  const handleFile = (file: File) => {
    setFileName(file.name)
    setImported(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })

        const parsed: ImportRow[] = json.map((raw) => {
          const nombre = String(raw.nombre || '').trim()
          const categoria = String(raw.categoria || '').trim()
          const precio = parseFloat(raw.precio)
          const stock = parseInt(raw.stock) || 0
          const unidad = String(raw.unidad || 'unidad').trim().toLowerCase()
          const descripcion = String(raw.descripcion || '').trim()
          const imagen_url = String(raw.imagen_url || '').trim()

          let error: string | undefined
          if (!nombre) error = 'Falta el nombre'
          else if (!categoria) error = 'Falta la categoría'
          else if (!categoryMap[categoria.toLowerCase()]) error = `Categoría "${categoria}" no existe`
          else if (isNaN(precio) || precio <= 0) error = 'Precio inválido'
          else if (!VALID_UNITS.includes(unidad)) error = `Unidad "${unidad}" inválida`

          return {
            nombre, categoria, precio, stock, unidad, descripcion, imagen_url,
            status: error ? 'error' : 'ok',
            error,
          }
        })

        setRows(parsed)
        if (parsed.length === 0) toast.error('El archivo no tiene filas de datos')
      } catch (err) {
        toast.error('No se pudo leer el archivo. Verificá que sea un .xlsx válido')
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (validRows.length === 0) return
    setIsImporting(true)

    const productsToInsert = validRows.map(r => ({
      name: r.nombre,
      category_id: categoryMap[r.categoria.toLowerCase()],
      price: r.precio,
      stock: r.stock,
      unit: r.unidad,
      description: r.descripcion || null,
      image_url: r.imagen_url || null,
      is_active: true,
    }))

    const { error } = await supabase.from('products').insert(productsToInsert)

    if (error) {
      toast.error('Error al importar productos')
      console.error(error)
    } else {
      toast.success(`${validRows.length} producto(s) importado(s) correctamente`)
      setImported(true)
      onImported()
    }
    setIsImporting(false)
  }

  const handleClose = () => {
    setRows([])
    setFileName('')
    setImported(false)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar productos desde Excel
          </SheetTitle>
          <SheetDescription>
            Subí un archivo .xlsx con tus productos: nombre, categoría, precio, stock, unidad, descripción e imagen
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Zona de carga */}
          {rows.length === 0 && (
            <div
              className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Hacé clic o arrastrá tu archivo Excel acá</p>
              <p className="text-sm text-muted-foreground mt-1">Formato .xlsx — primera fila con encabezados</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          )}

          {/* Resumen */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{fileName}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
                    <CheckCircle className="h-3 w-3" />
                    {validRows.length} OK
                  </Badge>
                  {errorRows.length > 0 && (
                    <Badge variant="outline" className="gap-1 text-destructive border-destructive/30 bg-destructive/5">
                      <XCircle className="h-3 w-3" />
                      {errorRows.length} con error
                    </Badge>
                  )}
                </div>
              </div>

              {/* Errores */}
              {errorRows.length > 0 && (
                <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Filas con problemas (no se importarán)
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {errorRows.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium">{r.nombre || '(sin nombre)'}</span>: {r.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview de productos válidos */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Producto</th>
                        <th className="text-left p-2 font-medium">Categoría</th>
                        <th className="text-right p-2 font-medium">Precio</th>
                        <th className="text-right p-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{r.nombre}</td>
                          <td className="p-2 text-muted-foreground">{r.categoria}</td>
                          <td className="p-2 text-right">${r.precio.toLocaleString('es-AR')}</td>
                          <td className="p-2 text-right">{r.stock} {r.unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {imported && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">Productos importados correctamente</p>
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFileName(''); setImported(false) }}>
                Elegir otro archivo
              </Button>
            </>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>{imported ? 'Cerrar' : 'Cancelar'}</Button>
          {!imported && (
            <Button onClick={handleImport} disabled={validRows.length === 0 || isImporting}>
              {isImporting ? 'Importando...' : `Importar ${validRows.length} producto(s)`}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}