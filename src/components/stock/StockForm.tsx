import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Save, AlertCircle, PlusCircle } from 'lucide-react'
import type { Prenda } from '../../pages/dashboard/Stock'
import { toTitleCase } from '../../utils/formatters'

interface StockFormProps {
  prenda?: Prenda | null
  categoriasExistentes: string[]
  onClose: () => void
  onSave: () => void
}

export const StockForm: React.FC<StockFormProps> = ({ prenda, categoriasExistentes, onClose, onSave }) => {
  const { profile } = useAuth()
  const isEditing = !!prenda

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmAdd, setShowConfirmAdd] = useState<{added: number} | null>(null)

  const formatInitialCurrency = (val?: number | string | null) => {
    if (!val) return ''
    const parts = val.toString().split('.')
    let intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    let decPart = parts.length > 1 ? ',' + parts[1].padEnd(2, '0').substring(0,2) : ''
    return intPart + decPart
  }

  const [formData, setFormData] = useState({
    codigo: prenda?.codigo || '',
    tipo: prenda?.tipo || '',
    marca: prenda?.marca || '',
    talle: prenda?.talle || '',
    color: prenda?.color || '',
    precio_alquiler: formatInitialCurrency(prenda?.precio_alquiler === 0 ? '' : prenda?.precio_alquiler),
    costo: formatInitialCurrency(prenda?.costo),
    precio_venta: formatInitialCurrency(prenda?.precio_venta),
    estado: prenda?.estado || 'disponible'
  })

  const [margen, setMargen] = useState('')
  const [isSoloVenta, setIsSoloVenta] = useState(prenda ? prenda.precio_alquiler === 0 : false)
  // En edición, cantidad representa el nuevo TOTAL deseado (Punto 3)
  const [unidadesTotal, setUnidadesTotal] = useState(prenda?.unidades || 1)
  const [stockMinimo, setStockMinimo] = useState(prenda?.atributos_extra?.stock_minimo || 2)

  const defaultCategorias = ['Traje', 'Vestido', 'Remera', 'Pantalón', 'Camisa', 'Zapatos', 'Zapatillas']
  const allCategorias = Array.from(new Set([...defaultCategorias, ...categoriasExistentes])).sort()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let raw = value.replace(/[^\d,]/g, '')
    let parts = raw.split(',')
    let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    let decimalPart = parts.length > 1 ? ',' + parts[1].substring(0, 2) : ''
    setFormData({ ...formData, [name]: integerPart + decimalPart })
  }

  const handleMargenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMargen = e.target.value.replace(/[^\d]/g, '')
    setMargen(newMargen)
    if (newMargen && formData.costo) {
      const costoNum = Number(formData.costo.toString().replace(/\./g, '').replace(',', '.'))
      const marginNum = Number(newMargen)
      const ventaCalculada = costoNum + (costoNum * marginNum / 100)
      let integerPart = Math.floor(ventaCalculada).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      let decimalPart = (ventaCalculada % 1).toFixed(2).substring(1).replace('.', ',')
      if (decimalPart === ',00') decimalPart = ''
      setFormData(prev => ({ ...prev, precio_venta: integerPart + decimalPart }))
    }
  }

  const parseToNumber = (val: string | number) => {
    if (!val) return 0
    return Number(val.toString().replace(/\./g, '').replace(',', '.'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let finalCode = formData.codigo.trim()
      if (!finalCode) {
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        finalCode = `${formData.tipo.substring(0,2).toUpperCase()}-${randomNum}`
      }

      const payload: any = {
        empresa_id: profile?.empresa_id,
        codigo: finalCode.toUpperCase(),
        tipo: toTitleCase(formData.tipo) || 'General',
        marca: toTitleCase(formData.marca),
        talle: formData.talle.toUpperCase(),
        color: toTitleCase(formData.color),
        precio_alquiler: isSoloVenta ? 0 : parseToNumber(formData.precio_alquiler),
        costo: parseToNumber(formData.costo),
        precio_venta: formData.precio_venta ? parseToNumber(formData.precio_venta) : null,
        estado: formData.estado,
        unidades: unidadesTotal,
        disponibles: isEditing ? (prenda.disponibles + (unidadesTotal - prenda.unidades)) : unidadesTotal,
        atributos_extra: { ...(prenda?.atributos_extra || {}), stock_minimo: stockMinimo }
      }

      let prendaId = prenda?.id;

      if (isEditing) {
        const diff = unidadesTotal - (prenda?.unidades || 0);
        const { error } = await supabase.from('stock').update(payload).eq('id', prenda.id)
        if (error) throw error
        
        if (diff > 0) {
          await supabase.from('historial_stock').insert({
            empresa_id: profile?.empresa_id,
            prenda_id: prenda.id,
            tipo_movimiento: 'entrada',
            cantidad: diff,
            motivo: `Agregado manual: ${diff} unidades`,
            usuario_id: profile?.id
          })
          setShowConfirmAdd({ added: diff })
          setTimeout(() => { onSave(); onClose(); }, 2000);
          return;
        }
      } else {
        const { data, error } = await supabase.from('stock').insert(payload).select().single()
        if (error) throw error
        prendaId = data.id;

        await supabase.from('historial_stock').insert({
          empresa_id: profile?.empresa_id,
          prenda_id: prendaId,
          tipo_movimiento: 'lote_nuevo',
          cantidad: unidadesTotal,
          motivo: 'Carga inicial de inventario',
          usuario_id: profile?.id
        })
      }

      onSave()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(`Error al guardar: ${err.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  if (showConfirmAdd) {
    return (
      <div className="fixed inset-0 bg-brand-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
        <div className="bg-white p-8 rounded-semi shadow-2xl text-center max-w-sm border-t-8 border-green-500 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusCircle size={48} />
          </div>
          <h2 className="text-2xl font-black text-brand-black mb-2">¡STOCK ACTUALIZADO!</h2>
          <p className="text-brand-gray font-medium">Se han agregado correctamente <strong>{showConfirmAdd.added}</strong> unidades nuevas al inventario.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-brand-white px-6 py-4 border-b border-brand-gray/10 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-brand-black">
            {isEditing ? 'Editar Prenda' : 'Añadir Nueva Prenda'}
          </h3>
          <button onClick={onClose} className="p-2 text-brand-gray hover:text-red-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-semi flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Código</label>
              <div className="flex gap-2">
                <input type="text" name="codigo" value={formData.codigo} onChange={handleChange} placeholder="AUTO"
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:border-brand-blue outline-none uppercase" />
                <div className="w-24 shrink-0">
                  <input 
                    type="number" 
                    min="1"
                    value={unidadesTotal}
                    onChange={e => setUnidadesTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-brand-blue/50 bg-brand-blue/5 rounded-semi focus:outline-none focus:border-brand-blue text-center font-bold text-brand-blue text-sm"
                  />
                  <p className="text-[8px] text-center text-brand-blue font-bold uppercase mt-1">Total</p>
                </div>
                <div className="w-24 shrink-0">
                  <input 
                    type="number" 
                    min="0"
                    value={stockMinimo}
                    onChange={e => setStockMinimo(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-orange-300 bg-orange-50 rounded-semi focus:outline-none focus:border-orange-500 text-center font-bold text-orange-600 text-sm"
                  />
                  <p className="text-[8px] text-center text-orange-600 font-bold uppercase mt-1">Mínimo</p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Categoría *</label>
              <input type="text" name="tipo" required value={formData.tipo} onChange={handleChange} list="tipos-list"
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:border-brand-blue outline-none" />
              <datalist id="tipos-list">
                {allCategorias.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Marca</label>
              <input type="text" name="marca" value={formData.marca} onChange={handleChange}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:border-brand-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Talle *</label>
              <input type="text" name="talle" required value={formData.talle} onChange={handleChange}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:border-brand-blue outline-none uppercase" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Color</label>
              <input type="text" name="color" value={formData.color} onChange={handleChange}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:border-brand-blue outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-brand-lightGray/30 p-4 rounded-semi border border-brand-gray/10 items-end">
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Costo *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray font-bold">$</span>
                <input type="text" name="costo" required value={formData.costo} onChange={handleCurrencyChange}
                  className="w-full pl-8 pr-3 py-2 border border-brand-gray/30 rounded-semi focus:border-brand-blue outline-none font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider text-green-700">Margen %</label>
              <div className="relative">
                <input type="text" value={margen} onChange={handleMargenChange}
                  className="w-full pl-3 pr-8 py-2 border border-green-200 bg-green-50 rounded-semi focus:border-green-500 outline-none font-mono text-green-800 font-bold" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">P. Venta</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray font-bold">$</span>
                <input type="text" name="precio_venta" value={formData.precio_venta} onChange={handleCurrencyChange}
                  className="w-full pl-8 pr-3 py-2 border border-brand-gray/30 rounded-semi focus:border-brand-blue outline-none font-mono" />
              </div>
            </div>
            <div className={`${isSoloVenta ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">P. Alquiler *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue font-bold">$</span>
                <input type="text" name="precio_alquiler" required={!isSoloVenta} value={formData.precio_alquiler} onChange={handleCurrencyChange}
                  className="w-full pl-8 pr-3 py-2 border border-brand-blue/30 rounded-semi focus:border-brand-blue outline-none font-mono text-brand-blue font-bold" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-brand-lightGray/50 p-3 rounded-semi border border-brand-gray/20">
            <input type="checkbox" id="soloVenta" checked={isSoloVenta} onChange={(e) => setIsSoloVenta(e.target.checked)}
              className="w-4 h-4 text-brand-blue rounded focus:ring-brand-blue" />
            <label htmlFor="soloVenta" className="text-sm font-bold text-brand-dark cursor-pointer select-none">Solo Venta (No alquiler)</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-gray/10">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-semi font-bold text-brand-gray hover:bg-brand-lightGray transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? 'Guardando...' : <><Save size={18} /> Guardar Prenda</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
