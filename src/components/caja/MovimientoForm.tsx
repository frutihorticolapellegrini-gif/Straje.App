import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Save, AlertCircle } from 'lucide-react'

interface MovimientoFormProps {
  onClose: () => void
  onSave: () => void
}

export const MovimientoForm: React.FC<MovimientoFormProps> = ({ onClose, onSave }) => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    tipo: 'egreso',
    monto: '', // Formateado visualmente
    concepto: '',
    metodo_pago: 'efectivo'
  })

  // Punto 4: Formateador de moneda en tiempo real
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, '')
    if (value) {
      value = parseInt(value).toLocaleString('es-AR')
    }
    setFormData({ ...formData, monto: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const montoNum = Number(formData.monto.replace(/\./g, ''))
    if (montoNum <= 0) {
      setError("El monto debe ser mayor a 0.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('caja')
        .insert({
          empresa_id: profile?.empresa_id,
          tipo: formData.tipo,
          monto: montoNum,
          concepto: formData.concepto,
          metodo_pago: formData.metodo_pago,
          usuario_id: profile?.id
        })

      if (insertError) throw insertError

      onSave()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(`Error al registrar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-brand-black px-6 py-4 border-b border-brand-gray/10 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Registrar Movimiento</h3>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6">
          <form id="mov-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-semi flex items-center gap-2 text-red-600 text-[10px] font-black uppercase">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setFormData({...formData, tipo: 'ingreso'})} className={`flex-1 py-3 rounded-semi border-2 font-black uppercase text-xs transition-all ${formData.tipo === 'ingreso' ? 'bg-green-50 border-green-500 text-green-700' : 'border-brand-gray/20 text-brand-gray hover:bg-brand-lightGray'}`}>
                Ingreso
              </button>
              <button type="button" onClick={() => setFormData({...formData, tipo: 'egreso'})} className={`flex-1 py-3 rounded-semi border-2 font-black uppercase text-xs transition-all ${formData.tipo === 'egreso' ? 'bg-red-50 border-red-500 text-red-700' : 'border-brand-gray/20 text-brand-gray hover:bg-brand-lightGray'}`}>
                Egreso
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Concepto / Descripción</label>
              <input type="text" required value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} placeholder="EJ. PAGO DE LUZ, LIMPIEZA..." className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none uppercase" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Monto (Punto 4)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-black font-black">$</span>
                  <input type="text" required value={formData.monto} onChange={handleCurrencyChange} className="w-full pl-8 pr-4 py-3 bg-brand-lightGray border-none rounded-semi font-black outline-none text-xl" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Método</label>
                <select value={formData.metodo_pago} onChange={e => setFormData({...formData, metodo_pago: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-black outline-none">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-brand-gray/10 bg-brand-lightGray/30 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 rounded-semi font-black text-brand-gray uppercase text-[10px]">Cancelar</button>
          <button form="mov-form" type="submit" disabled={loading} className="px-8 py-3 bg-brand-black text-white font-black rounded-semi shadow-xl hover:bg-brand-gray transition-all uppercase text-[10px] tracking-widest flex items-center gap-2">
            {loading ? 'GUARDANDO...' : <><Save size={18} /> Guardar Movimiento</>}
          </button>
        </div>
      </div>
    </div>
  )
}
