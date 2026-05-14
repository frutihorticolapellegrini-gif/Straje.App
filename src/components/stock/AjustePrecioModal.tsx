import React, { useState, useMemo } from 'react'
import { X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Prenda } from '../../pages/dashboard/Stock'

interface Props {
  prendas: Prenda[]
  empresaId: string
  onClose: () => void
  onSuccess: () => void
}

export const AjustePrecioModal: React.FC<Props> = ({ prendas, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [porcentaje, setPorcentaje] = useState(5)
  const [selectedTipo, setSelectedTipo] = useState('TODOS')
  const [selectedMarca, setSelectedMarca] = useState('TODAS')
  const [ajustarAlquiler, setAjustarAlquiler] = useState(true)
  const [ajustarVenta, setAjustarVenta] = useState(true)

  const tipos = useMemo(() => ['TODOS', ...Array.from(new Set(prendas.map(p => p.tipo))).sort()], [prendas])
  const marcas = useMemo(() => ['TODAS', ...Array.from(new Set(prendas.map(p => p.marca).filter(Boolean))).sort()], [prendas])

  const handleAplicarAjuste = async () => {
    const confirmMsg = `¿Estás seguro de que deseas ${porcentaje >= 0 ? 'AUMENTAR' : 'DISMINUIR'} los precios un ${Math.abs(porcentaje)}%? Esta acción no se puede deshacer.`
    if (!window.confirm(confirmMsg)) return

    setLoading(true)
    try {
      // 1. Filtrar prendas a modificar
      const targetPrendas = prendas.filter(p => {
        const matchTipo = selectedTipo === 'TODOS' || p.tipo === selectedTipo
        const matchMarca = selectedMarca === 'TODAS' || p.marca === selectedMarca
        return matchTipo && matchMarca
      })

      if (targetPrendas.length === 0) {
        alert('No hay productos que coincidan con los filtros seleccionados.')
        setLoading(false)
        return
      }

      // 2. Realizar actualizaciones (Batch)
      // Nota: Lo ideal sería un RPC, pero lo haremos via cliente para mayor compatibilidad inmediata
      const factor = 1 + porcentaje / 100

      const updates = targetPrendas.map(p => {
        const newAlquiler = ajustarAlquiler ? Math.ceil(Number(p.precio_alquiler) * factor) : p.precio_alquiler
        const newVenta = (ajustarVenta && p.precio_venta) ? Math.ceil(Number(p.precio_venta) * factor) : p.precio_venta

        return supabase.from('stock').update({
          precio_alquiler: newAlquiler,
          precio_venta: newVenta
        }).eq('id', p.id)
      })

      await Promise.all(updates)
      
      alert(`Éxito: Se actualizaron ${targetPrendas.length} productos correctamente con redondeo hacia arriba.`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Error al actualizar los precios.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-semi shadow-2xl max-w-md w-full overflow-hidden border-t-8 border-brand-blue">
        <div className="p-6 border-b border-brand-gray/10 flex justify-between items-center bg-brand-lightGray/50">
          <h3 className="text-xl font-black text-brand-black uppercase italic flex items-center gap-2">
            <TrendingUp className="text-brand-blue" /> Ajuste Masivo de Precios
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-brand-gray/10 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex bg-brand-lightGray p-1 rounded-semi">
            <button 
              onClick={() => setPorcentaje(Math.abs(porcentaje))}
              className={`flex-1 py-2 rounded-semi text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${porcentaje >= 0 ? 'bg-brand-black text-white shadow-lg' : 'text-brand-gray'}`}
            >
              <TrendingUp size={14} /> Aumento
            </button>
            <button 
              onClick={() => setPorcentaje(-Math.abs(porcentaje))}
              className={`flex-1 py-2 rounded-semi text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${porcentaje < 0 ? 'bg-brand-black text-white shadow-lg' : 'text-brand-gray'}`}
            >
              <TrendingDown size={14} /> Disminución
            </button>
          </div>

          <div className="bg-brand-blue/5 p-4 rounded-semi border border-brand-blue/10">
            <label className="block text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2">Porcentaje de Variación (%)</label>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={Math.abs(porcentaje)}
                onChange={(e) => setPorcentaje(porcentaje >= 0 ? Number(e.target.value) : -Number(e.target.value))}
                className="w-full px-4 py-2 bg-white border border-brand-gray/20 rounded-semi font-black text-xl text-center outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <span className="text-2xl font-black text-brand-blue">%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-brand-gray uppercase tracking-widest mb-2">Filtrar por Tipo</label>
              <select 
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="w-full px-4 py-3 bg-brand-lightGray rounded-semi font-bold text-xs uppercase outline-none"
              >
                {tipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-brand-gray uppercase tracking-widest mb-2">Filtrar por Marca</label>
              <select 
                value={selectedMarca}
                onChange={(e) => setSelectedMarca(e.target.value)}
                className="w-full px-4 py-3 bg-brand-lightGray rounded-semi font-bold text-xs uppercase outline-none"
              >
                {marcas.map(m => <option key={m || ''} value={m || ''}>{m || 'SIN MARCA'}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest border-b border-brand-gray/10 pb-1">¿Qué precios ajustar?</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={ajustarAlquiler}
                  onChange={(e) => setAjustarAlquiler(e.target.checked)}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${ajustarAlquiler ? 'bg-brand-black border-brand-black' : 'border-brand-gray/30'}`}>
                  {ajustarAlquiler && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <span className="text-xs font-bold text-brand-black uppercase">Alquiler</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={ajustarVenta}
                  onChange={(e) => setAjustarVenta(e.target.checked)}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${ajustarVenta ? 'bg-brand-black border-brand-black' : 'border-brand-gray/30'}`}>
                  {ajustarVenta && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <span className="text-xs font-bold text-brand-black uppercase">Venta</span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-semi flex gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={18} />
            <p className="text-[9px] text-amber-800 font-bold uppercase leading-tight">
              Los precios se redondearán siempre hacia arriba al peso más cercano. 
              Ej: $233,5 + 5% = $245,17 {"->"} Redondeado a $246.
            </p>
          </div>
        </div>

        <div className="p-6 bg-brand-lightGray/50 border-t border-brand-gray/10 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 font-black text-xs text-brand-gray uppercase tracking-widest hover:text-brand-black transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleAplicarAjuste}
            disabled={loading}
            className="flex-1 bg-brand-black text-white py-4 rounded-semi font-black text-xs uppercase tracking-widest hover:bg-brand-gray shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Aplicar Ajuste'}
          </button>
        </div>
      </div>
    </div>
  )
}
