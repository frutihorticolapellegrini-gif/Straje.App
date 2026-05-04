import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Lock, AlertCircle, CheckCircle } from 'lucide-react'

interface CierreCajaModalProps {
  onClose: () => void
  onSave: () => void
  movimientosDia: any[]
}

export const CierreCajaModal: React.FC<CierreCajaModalProps> = ({ onClose, onSave, movimientosDia }) => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cálculos del día
  const ingresos = (movimientosDia || []).filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0)
  const egresos = (movimientosDia || []).filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0)
  const neto = ingresos - egresos
  
  // Extraer cantidad de ventas y alquileres por el concepto
  const cantidadVentas = (movimientosDia || []).filter(m => m.concepto?.toLowerCase().includes('venta')).length
  const cantidadAlquileres = (movimientosDia || []).filter(m => m.concepto?.toLowerCase().includes('alquiler')).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Guardar en cierres_diarios
      const { error: cierreError } = await supabase
        .from('cierres_diarios')
        .insert({
          empresa_id: profile?.empresa_id,
          total_ingresos: ingresos,
          total_egresos: egresos,
          saldo_neto: neto,
          cantidad_ventas: cantidadVentas,
          cantidad_alquileres: cantidadAlquileres,
          usuario_id: profile?.id
        })

      if (cierreError) throw cierreError

      // 2. Éxito
      setSuccess(true)
      setTimeout(() => {
        onSave()
        onClose()
      }, 2000)

    } catch (err: any) {
      console.error(err)
      setError(`Error al cerrar caja: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-black text-brand-dark mb-2">Día Terminado</h2>
          <p className="text-brand-gray text-sm">El cierre de caja se ha guardado exitosamente en el historial.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
        <div className="bg-brand-black px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Lock size={20} /> Cerrar Caja Diaria</h3>
          <button onClick={onClose} className="p-2 text-brand-gray hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-brand-gray mb-4 text-center">
              Revisa el resumen de hoy. Al confirmar, este día quedará sellado en el historial de cierres.
            </p>
            
            <div className="bg-brand-lightGray/50 p-4 rounded-semi border border-brand-gray/20 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-brand-gray uppercase">Total Ingresos</span>
                <span className="font-bold text-green-600">${ingresos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-brand-gray uppercase">Total Egresos</span>
                <span className="font-bold text-red-500">-${egresos.toLocaleString()}</span>
              </div>
              <div className="h-px bg-brand-gray/20 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-brand-dark uppercase">Saldo Final (Efectivo/Digital)</span>
                <span className="text-xl font-black text-brand-black">${neto.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-blue-50 p-3 rounded-semi border border-blue-100 text-center">
                <p className="text-2xl font-black text-blue-600">{cantidadVentas}</p>
                <p className="text-[10px] font-bold text-blue-800 uppercase">Ventas de Hoy</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-semi border border-purple-100 text-center">
                <p className="text-2xl font-black text-purple-600">{cantidadAlquileres}</p>
                <p className="text-[10px] font-bold text-purple-800 uppercase">Alquileres de Hoy</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-semi flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-semi flex items-center justify-center gap-2 transition-colors">
            {loading ? 'Sellando...' : <><Lock size={18} /> Confirmar Cierre Definitivo</>}
          </button>
        </div>

      </div>
    </div>
  )
}
