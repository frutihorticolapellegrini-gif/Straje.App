import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, CheckCircle, AlertCircle, Banknote, CreditCard, ArrowRightLeft, Waves } from 'lucide-react'
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

  const handleConfirmar = async (destino: 'listo' | 'lavanderia') => {
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
          if (destino === 'listo') {
            await supabase.rpc('increment_disponibles', { prenda_id: prendaId })
            await supabase.from('stock').update({ estado: 'disponible' }).eq('id', prendaId)
          } else {
            // Si va a lavandería, el estado cambia pero no se incrementa disponibles todavía
            await supabase.from('stock').update({ estado: 'lavanderia' }).eq('id', prendaId)
          }

          await supabase.from('historial_stock').insert({
            empresa_id: profile?.empresa_id,
            prenda_id: prendaId,
            tipo_movimiento: 'entrada',
            cantidad: destino === 'listo' ? 1 : 0,
            motivo: `Devolución Alquiler (${destino}): ${alquiler.cliente_nombre}`,
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

      // NOVEDAD PUNTO 3: Sincronizar con Cuenta Corriente si existe
      // Esto evita que siga figurando como deuda si ya se cobró en la devolución
      const { data: cC } = await supabase.from('cuentas_corrientes')
        .select('id, monto_pendiente')
        .eq('alquiler_id', alquiler.id)
        .maybeSingle()
        
      if (cC && cC.monto_pendiente > 0) {
        await supabase.from('cuentas_corrientes')
          .update({ estado: 'saldado', monto_pendiente: 0 })
          .eq('id', cC.id)
          
        if (saldoPendiente > 0) {
          await supabase.from('pagos_cuenta_corriente').insert({
            cuenta_corriente_id: cC.id,
            monto: saldoPendiente,
            metodo_pago: metodoPago,
            usuario_id: profile?.id
          })
        }
      }

      onSave()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Error al procesar devolución")
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
                <div className="flex items-center justify-center gap-2 text-orange-600 mb-2 font-black uppercase text-xs">
                  <AlertCircle size={16} /> Saldo a Cobrar
                </div>
                <p className="text-4xl font-black text-brand-black tracking-tighter">{formatMoney(saldoPendiente)}</p>
                <div className="pt-4 space-y-3 text-[10px] font-black uppercase text-brand-gray">
                  <p>Seleccionar Medio de Pago</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setMetodoPago('efectivo')} className={`p-2 rounded border-2 transition-all flex flex-col items-center gap-1 ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700 shadow-md' : 'border-brand-gray/20 text-brand-gray'}`}>
                      <Banknote size={18} /> <span>Efectivo</span>
                    </button>
                    <button onClick={() => setMetodoPago('transferencia')} className={`p-2 rounded border-2 transition-all flex flex-col items-center gap-1 ${metodoPago === 'transferencia' ? 'border-brand-blue bg-blue-50 text-brand-blue shadow-md' : 'border-brand-gray/20 text-brand-gray'}`}>
                      <ArrowRightLeft size={18} /> <span>Transf.</span>
                    </button>
                    <button onClick={() => setMetodoPago('tarjeta')} className={`p-2 rounded border-2 transition-all flex flex-col items-center gap-1 ${metodoPago === 'tarjeta' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' : 'border-brand-gray/20 text-brand-gray'}`}>
                      <CreditCard size={18} /> <span>Tarjeta</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-2 text-green-600 font-black uppercase text-sm flex flex-col items-center gap-2">
                <CheckCircle size={32} />
                <span>Todo Pago - Solo Devolución</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleConfirmar('listo')} 
              disabled={loading} 
              className={`flex flex-col items-center gap-2 p-4 border-2 rounded-semi font-black uppercase text-[10px] transition-all shadow-md ${
                saldoPendiente > 0 
                  ? 'bg-brand-black text-white border-brand-black hover:bg-brand-gray' 
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              }`}
            >
              <CheckCircle size={24} />
              {saldoPendiente > 0 ? 'Cobrar y Finalizar' : 'Listo p/ Alquilar'}
            </button>
            <button 
              onClick={() => handleConfirmar('lavanderia')} 
              disabled={loading} 
              className="flex flex-col items-center gap-2 p-4 bg-brand-blue/10 text-brand-blue border-2 border-brand-blue/20 rounded-semi font-black uppercase text-[10px] hover:bg-brand-blue/20 transition-all shadow-md"
            >
              <Waves size={24} />
              {saldoPendiente > 0 ? 'Cobrar e Ir a Lavado' : 'Enviar a Lavado'}
            </button>
          </div>
          <p className="text-[9px] text-center text-brand-gray font-medium italic">* Esta acción cerrará el alquiler y actualizará el stock/caja según corresponda.</p>
        </div>
      </div>
    </div>
  )
}
