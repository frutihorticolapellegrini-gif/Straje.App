import React from 'react'
import { X, DollarSign, Package, TrendingUp, Briefcase } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'
import type { Prenda } from '../../pages/dashboard/Stock'

interface StockTotalsModalProps {
  prendas: Prenda[]
  onClose: () => void
}

export const StockTotalsModal: React.FC<StockTotalsModalProps> = ({ prendas, onClose }) => {
  // Cálculos Financieros (Punto 14)
  const totalArticulos = prendas.reduce((acc, p) => acc + (p.unidades || 0), 0)
  const valorCostoTotal = prendas.reduce((acc, p) => acc + ((p.costo || 0) * (p.unidades || 0)), 0)
  const valorVentaTotal = prendas.reduce((acc, p) => acc + ((p.precio_venta || 0) * (p.unidades || 0)), 0)
  const valorAlquilerTotal = prendas.reduce((acc, p) => acc + ((p.precio_alquiler || 0) * (p.unidades || 0)), 0)
  
  // Margen Promedio
  const gananciaPotencial = valorVentaTotal - valorCostoTotal
  const margenPromedio = valorCostoTotal > 0 ? (gananciaPotencial / valorCostoTotal) * 100 : 0

  return (
    <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-brand-black p-6 flex justify-between items-center text-white border-b-4 border-brand-blue">
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              <TrendingUp className="text-brand-blue" /> Balance de Mercadería
            </h3>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Resumen Financiero del Inventario</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-brand-lightGray/50 p-6 rounded-semi border border-brand-gray/10 flex flex-col justify-center items-center text-center">
            <Package className="text-brand-gray mb-2" size={24} />
            <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Total Prendas</p>
            <p className="text-4xl font-black text-brand-black">{totalArticulos}</p>
            <p className="text-[9px] font-bold text-brand-blue mt-1 uppercase">Unidades Físicas</p>
          </div>

          <div className="bg-brand-blue/5 p-6 rounded-semi border border-brand-blue/20 flex flex-col justify-center items-center text-center">
            <DollarSign className="text-brand-blue mb-2" size={24} />
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1">Inversión a Costo</p>
            <p className="text-3xl font-black text-brand-black">{formatMoney(valorCostoTotal)}</p>
            <p className="text-[9px] font-bold text-brand-gray mt-1 uppercase">Capital Invertido</p>
          </div>

          <div className="bg-green-50 p-6 rounded-semi border border-green-200 flex flex-col justify-center items-center text-center">
            <Briefcase className="text-green-600 mb-2" size={24} />
            <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Potencial de Venta</p>
            <p className="text-3xl font-black text-green-600">{formatMoney(valorVentaTotal)}</p>
            <p className="text-[9px] font-bold text-green-800/50 mt-1 uppercase">Valorización Total</p>
          </div>

          <div className="bg-purple-50 p-6 rounded-semi border border-purple-200 flex flex-col justify-center items-center text-center">
            <TrendingUp className="text-purple-600 mb-2" size={24} />
            <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1">Renta por Alquiler</p>
            <p className="text-3xl font-black text-purple-600">{formatMoney(valorAlquilerTotal)}</p>
            <p className="text-[9px] font-bold text-purple-800/50 mt-1 uppercase">Si se alquilara todo 1 vez</p>
          </div>
        </div>

        <div className="px-8 pb-8">
          <div className="bg-brand-black p-4 rounded-semi flex justify-between items-center shadow-lg">
            <p className="text-xs font-black text-white/50 uppercase tracking-widest italic">Margen Promedio de Ganancia</p>
            <div className="text-right">
              <p className="text-3xl font-black text-brand-blue">{margenPromedio.toFixed(1)}%</p>
              <p className="text-[9px] font-bold text-green-500 uppercase tracking-tighter">Sobre Costo Neto</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
