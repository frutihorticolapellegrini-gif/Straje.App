import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, CheckCircle, AlertCircle, Banknote, CreditCard, ArrowRightLeft } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'
import type { Alquiler } from '../../pages/dashboard/Alquileres'

interface DevolucionModalProps {
  alquiler: Alquiler
  onClose: () => void
  onSave: () => void
}

export const DevolucionModal: React.FC<DevolucionModalProps> = ({ alquiler, onClose, onSave }) => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo')
  const saldoPendiente = alquiler.monto_total - (alquiler.sena_pagada || 0)

  const handleConfirmar = async () => {
    setLoading(true)
    try {
      const { error: alqErr } = await supabase
        .from('alquileres')
        .update({ 
          estado: 'devuelto',
          sena_pagada: alquiler.monto_total
        })
        .eq('id', alquiler.id)
      
      if (alqErr) throw alqErr

      for (const det of (alquiler.detalles || [])) {
        const prendaId = (det as any).prenda_id || (det as any).prenda?.id
        if (prendaId) {
          await supabase.rpc('increment_disponibles', { prenda_id: prendaId })
          await supabase.from('historial_stock').insert({
            empresa_id: profile?.empresa_id,
            prenda_id: prendaId,
            tipo_movimiento: 'entrada',
            cantidad: 1,
            motivo: `Devolución Alquiler: ${alquiler.cliente_nombre}`,
            usuario_id: profile?.id
          })
        }
      }

      if (saldoPendiente > 0) {
        await supabase.from('caja').insert({
          empresa_id: profile?.empresa_id,
          usuario_id: profile?.id,
          tipo: 'ingreso',
          monto: saldoPendiente,
          concepto: `COBRO SALDO ALQUILER: ${alquiler.cliente_nombre.toUpperCase()}`,
          metodo_pago: metodoPago
        })
      }

      onSave()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 bg-brand-black text-white flex justify-between items-center">
          <h3 className="font-black uppercase italic flex items-center gap-2"><CheckCircle className="text-brand-blue" /> Finalizar Alquiler</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-[10px] font-black text-brand-gray uppercase">Cliente</p>
            <p className="text-2xl font-black text-brand-black uppercase italic">{alquiler.cliente_nombre}</p>
          </div>
          <div className="bg-brand-lightGray/50 p-6 rounded-semi text-center">
            {saldoPendiente > 0 ? (
              <>
                <div className="flex items-center justify-center gap-2 text-orange-600 mb-2 font-black uppercase text-xs"><AlertCircle size={16} /> Saldo Pendiente</div>
                <p className="text-4xl font-black text-brand-black">{formatMoney(saldoPendiente)}</p>
                <div className="pt-4 space-y-3 text-[10px] font-black uppercase text-brand-gray">
                  <p>Método de Cobro</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setMetodoPago('efectivo')} className={`p-2 rounded border-2 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-brand-gray/20 text-brand-gray'}`}><Banknote size={16} className="mx-auto" /> Efectivo</button>
                    <button onClick={() => setMetodoPago('transferencia')} className={`p-2 rounded border-2 transition-all ${metodoPago === 'transferencia' ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-brand-gray/20 text-brand-gray'}`}><ArrowRightLeft size={16} className="mx-auto" /> Transf.</button>
                    <button onClick={() => setMetodoPago('tarjeta')} className={`p-2 rounded border-2 transition-all ${metodoPago === 'tarjeta' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-brand-gray/20 text-brand-gray'}`}><CreditCard size={16} className="mx-auto" /> Tarjeta</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-4 text-green-600 font-black uppercase text-sm"><CheckCircle size={40} className="mx-auto mb-2" /> Pagado</div>
            )}
          </div>
          <button onClick={handleConfirmar} disabled={loading} className="w-full py-4 bg-brand-black text-white font-black rounded-semi uppercase text-xs tracking-widest">{loading ? 'PROCESANDO...' : 'Confirmar Devolución'}</button>
        </div>
      </div>
    </div>
  )
}
