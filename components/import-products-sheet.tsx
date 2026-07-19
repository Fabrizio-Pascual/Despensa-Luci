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
  id?: string // NUEVO: campo opcional para matching
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
  const [importStats, setImportStats] = useState({ created: 0, updated: 0 }) // NUEVO
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
          const id = raw.id ? String(raw.id).trim() : undefined // NUEVO: extraer ID si existe

          let error: string | undefined
          if (!nombre) error = 'Falta el nombre'
          else if (!categoria) error = 'Falta la categoría'
          else if (!categoryMap[categoria.toLowerCase()]) error = `Categoría "${categoria}" no existe`
          else if (isNaN(precio) || precio <= 0) error = 'Precio inválido'
          else if (!VALID_UNITS.includes(unidad)) error = `Unidad "${unidad}" inválida`

          return {
            id,
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
    let createdCount = 0
    let updatedCount = 0
    const errors: string[] = []

    try {
      for (const r of validRows) {
        const productData = {
          name: r.nombre,
          category_id: categoryMap[r.categoria.toLowerCase()],
          price: r.precio,
          stock: r.stock,
          unit: r.unidad,
          description: r.descripcion || null,
          image_url: r.imagen_url || null,
          is_active: true,
        }

        // NUEVO: Si tiene ID, intentar actualizar primero (UPSERT)
        if (r.id) {
          const { error: updateError } = await supabase
            .from('products')
            .update(productData)
            .eq('id', r.id)

          if (updateError) {
            errors.push(`${r.nombre}: No se pudo actualizar`)
          } else {
            updatedCount++
          }
        } else {
          // Si no tiene ID, crear nuevo (INSERT)
          const { error: insertError } = await supabase
            .from('products')
            .insert([productData])

          if (insertError) {
            errors.push(`${r.nombre}: No se pudo crear`)
          } else {
            createdCount++
          }
        }
      }

      setImportStats({ created: createdCount, updated: updatedCount })

      if (errors.length === 0) {
        const message = `✅ ${createdCount} nuevo(s) producto(s), ${updatedCount} actualizado(s)`
        toast.success(message)
      } else {
        toast.warning(
          `✅ ${createdCount} + ${updatedCount} OK | ⚠️ ${errors.length} con error`
        )
      }

      setImported(true)
      onImported()
    } catch (error) {
      toast.error('Error durante la importación')
      console.error(error)
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setRows([])
    setFileName('')
    setImported(false)
    setImportStats({ created: 0, updated: 0 })
    onClose()
  }

  // NUEVO: Función para descargar template
  const downloadTemplate = () => {
    const template = [
      {
        id: '(opcional - ID del producto a actualizar)',
        nombre: 'Ejemplo: Pan integral',
        categoria: 'Panadería',
        precio: '150.00',
        stock: '50',
        unidad: 'unidad',
        descripcion: 'Pan recién horneado',
        imagen_url: 'https://...'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla_productos.xlsx')
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar/Actualizar productos desde Excel
          </SheetTitle>
          <SheetDescription>
            📌 <strong>NUEVO:</strong> Agregar columna "id" para actualizar productos existentes. Sin "id" = crear nuevo.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Zona de carga */}
          {rows.length === 0 && (
            <div className="space-y-4">
              {/* Información de uso */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">📋 Estructura del Excel:</p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                  <li>• <strong>id</strong> (opcional): ID único del producto. Si existe → actualiza; si no → crea nuevo</li>
                  <li>• <strong>nombre</strong> (obligatorio): Nombre del producto</li>
                  <li>• <strong>categoria</strong> (obligatorio): Debe existir en el sistema</li>
                  <li>• <strong>precio</strong> (obligatorio): Número con punto decimal (ej: 150.50)</li>
                  <li>• <strong>stock</strong>: Cantidad disponible</li>
                  <li>• <strong>unidad</strong>: unidad, kg, g, litro o pack</li>
                  <li>• <strong>descripcion</strong>: Descripción del producto</li>
                  <li>• <strong>imagen_url</strong>: URL de la imagen</li>
                </ul>
              </div>

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

              {/* Botón para descargar template */}
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar plantilla
                </Button>
              </div>
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
                        <th className="text-left p-2 font-medium">Acción</th>
                        <th className="text-left p-2 font-medium">Producto</th>
                        <th className="text-left p-2 font-medium">Categoría</th>
                        <th className="text-right p-2 font-medium">Precio</th>
                        <th className="text-right p-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">
                            {r.id ? (
                              <Badge variant="secondary" className="text-xs">actualizar</Badge>
                            ) : (
                              <Badge className="text-xs">crear</Badge>
                            )}
                          </td>
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">Importación completada</p>
                      <p className="text-xs">✅ {importStats.created} creado(s), 🔄 {importStats.updated} actualizado(s)</p>
                    </div>
                  </div>
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