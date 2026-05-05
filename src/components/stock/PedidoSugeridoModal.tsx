import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, ShoppingCart, Calendar, AlertTriangle, ArrowRight, Printer } from 'lucide-react'
import type { Prenda } from '../../pages/dashboard/Stock'

interface PedidoSugeridoModalProps {
  prendas: Prenda[]
  onClose: () => void
}

export const PedidoSugeridoModal: React.FC<PedidoSugeridoModalProps> = ({ prendas, onClose }) => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'vendido' | 'faltante' | 'mas_vendido'>('faltante')
  const [rangoDias, setRangoDias] = useState<7 | 15 | 30>(7)
  const [ventasData, setVentasData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'vendido' || activeTab === 'mas_vendido') {
      fetchVentas()
    }
  }, [activeTab, rangoDias])

  const fetchVentas = async () => {
    setLoading(true)
    try {
      const date = new Date()
      date.setDate(date.getDate() - rangoDias)
      
      const { data, error } = await supabase
        .from('historial_stock')
        .select('prenda_id, cantidad')
        .eq('empresa_id', profile?.empresa_id)
        .eq('tipo_movimiento', 'venta')
        .gte('creado_en', date.toISOString())
      
      if (error) throw error
      
      // Agrupar por prenda
      const agrupado: Record<string, number> = {}
      data.forEach((d: any) => {
        if (!agrupado[d.prenda_id]) agrupado[d.prenda_id] = 0
        agrupado[d.prenda_id] += Math.abs(d.cantidad) // cantidad is negative for sales
      })
      
      const result = Object.keys(agrupado).map(id => ({
        prenda: prendas.find(p => p.id === id),
        cantidad: agrupado[id]
      })).filter(x => x.prenda)
      
      if (activeTab === 'mas_vendido') {
        result.sort((a, b) => b.cantidad - a.cantidad)
      }
      
      setVentasData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const faltantes = prendas.filter(p => p.unidades > (p.disponibles || 0) && p.precio_alquiler === 0).map(p => ({
    prenda: p,
    faltante: p.unidades - (p.disponibles || 0)
  }))

  const handlePrint = (title: string, list: any[]) => {
    const html = `<html><head><title>PEDIDO - ${title}</title><style>body { font-family: 'Inter', sans-serif; font-size: 12px; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 15px; } th { text-align: left; border-bottom: 2px solid #000; padding: 8px; } td { padding: 8px; border-bottom: 1px solid #ddd; }</style></head><body><h2>${title}</h2><table><thead><tr><th>CÓDIGO</th><th>TIPO/MARCA</th><th>TALLE/COLOR</th><th>CANTIDAD SUGERIDA</th></tr></thead><tbody>${list.map(item => `<tr><td>${item.prenda.codigo}</td><td>${item.prenda.tipo} ${item.prenda.marca||''}</td><td>T${item.prenda.talle} ${item.prenda.color||''}</td><td style="text-align:center; font-weight:bold">${item.cantidad || item.faltante}</td></tr>`).join('')}</tbody></table></body></html>`
    const win = window.open('', '', 'width=800,height=600'); win?.document.write(html); win?.document.close(); win?.focus(); setTimeout(() => { win?.print(); }, 500)
  }

  return (
    <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col">
        <div className="bg-brand-blue p-6 flex justify-between items-center text-white border-b-4 border-blue-800 shrink-0">
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              <ShoppingCart className="text-white" size={28} /> Armar Pedido Sugerido
            </h3>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">Automatización de reposición de stock</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="p-4 bg-brand-lightGray border-b border-brand-gray/10 flex flex-wrap gap-2 shrink-0">
          <button onClick={() => setActiveTab('faltante')} className={`px-4 py-2 rounded font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'faltante' ? 'bg-brand-black text-white' : 'bg-white text-brand-gray border border-brand-gray/20'}`}>
            Lo que falta (Stock Inicial)
          </button>
          <button onClick={() => setActiveTab('vendido')} className={`px-4 py-2 rounded font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'vendido' ? 'bg-brand-black text-white' : 'bg-white text-brand-gray border border-brand-gray/20'}`}>
            Total Vendido
          </button>
          <button onClick={() => setActiveTab('mas_vendido')} className={`px-4 py-2 rounded font-black text-xs uppercase tracking-widest transition-all shadow-md ${activeTab === 'mas_vendido' ? 'bg-[#009EE3] text-white' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
            Más Vendidos (Automático)
          </button>
        </div>

        {(activeTab === 'vendido' || activeTab === 'mas_vendido') && (
          <div className="p-4 bg-white border-b border-brand-gray/10 flex gap-4 items-center shrink-0">
            <Calendar className="text-brand-gray" size={18} />
            <span className="text-xs font-black uppercase text-brand-gray">Rango de tiempo:</span>
            <div className="flex gap-2">
              {[7, 15, 30].map(d => (
                <button key={d} onClick={() => setRangoDias(d as any)} className={`px-3 py-1 rounded text-[10px] font-black uppercase ${rangoDias === d ? 'bg-brand-blue text-white' : 'bg-brand-lightGray text-brand-gray'}`}>
                  {d} Días
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeTab === 'faltante' && (
            <div>
              <div className="flex items-center gap-2 mb-4 text-orange-600 bg-orange-50 p-3 rounded-semi border border-orange-200">
                <AlertTriangle size={20} />
                <p className="text-xs font-bold uppercase">Calcula la diferencia entre tu stock inicial y el actual. (Solo prendas de venta)</p>
              </div>
              <table className="w-full text-left">
                <thead className="bg-brand-lightGray text-[10px] uppercase text-brand-gray font-black">
                  <tr><th className="p-3">Prenda</th><th className="p-3 text-center">Inicial</th><th className="p-3 text-center">Actual</th><th className="p-3 text-center text-orange-600">A Pedir</th></tr>
                </thead>
                <tbody className="divide-y divide-brand-gray/10 text-xs">
                  {faltantes.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-brand-gray font-bold italic">No hay faltantes. Tienes el stock completo.</td></tr> : faltantes.map((f, i) => (
                    <tr key={i} className="hover:bg-brand-lightGray/30">
                      <td className="p-3 font-bold uppercase">{f.prenda.codigo} - {f.prenda.tipo} <span className="text-[9px] text-brand-gray block">{f.prenda.marca} - T{f.prenda.talle}</span></td>
                      <td className="p-3 text-center font-bold">{f.prenda.unidades}</td>
                      <td className="p-3 text-center font-bold">{f.prenda.disponibles}</td>
                      <td className="p-3 text-center font-black text-orange-600 text-lg">{f.faltante}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'vendido' && (
            <div>
              {loading ? <p className="text-center p-8 animate-pulse text-brand-gray font-bold">Cargando...</p> : (
                <>
                  <table className="w-full text-left">
                    <thead className="bg-brand-lightGray text-[10px] uppercase text-brand-gray font-black">
                      <tr><th className="p-3">Prenda</th><th className="p-3 text-center">Cantidad Vendida</th></tr>
                    </thead>
                    <tbody className="divide-y divide-brand-gray/10 text-xs">
                      {ventasData.length === 0 ? <tr><td colSpan={2} className="p-8 text-center text-brand-gray font-bold italic">No hay ventas registradas en este periodo.</td></tr> : ventasData.map((v, i) => (
                        <tr key={i} className="hover:bg-brand-lightGray/30">
                          <td className="p-3 font-bold uppercase">{v.prenda?.codigo} - {v.prenda?.tipo} <span className="text-[9px] text-brand-gray block">{v.prenda?.marca} - T{v.prenda?.talle}</span></td>
                          <td className="p-3 text-center font-black text-brand-blue text-lg">{v.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {activeTab === 'mas_vendido' && (
            <div>
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-semi border border-blue-200 mb-6">
                <div>
                  <h4 className="font-black text-blue-800 uppercase">Armado Automático de Pedido</h4>
                  <p className="text-xs text-blue-600/80 font-bold mt-1">Genera un pedido exacto basado en el top de productos más vendidos.</p>
                </div>
                <ArrowRight size={32} className="text-blue-300" />
              </div>
              {loading ? <p className="text-center p-8 animate-pulse text-brand-gray font-bold">Calculando tendencia...</p> : (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {ventasData.slice(0, 10).map((v, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-white border border-brand-gray/10 rounded-semi shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-brand-black text-white flex items-center justify-center font-black text-xs">#{i+1}</div>
                          <div>
                            <p className="font-black text-sm uppercase">{v.prenda?.codigo} - {v.prenda?.tipo}</p>
                            <p className="text-[10px] text-brand-gray font-bold uppercase">{v.prenda?.marca} - T{v.prenda?.talle}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-brand-gray font-black">Sugerido</p>
                          <p className="text-2xl font-black text-[#009EE3]">{v.cantidad}</p>
                        </div>
                      </div>
                    ))}
                    {ventasData.length === 0 && <p className="text-center p-8 text-brand-gray font-bold italic">No hay suficientes datos de venta para calcular sugerencias.</p>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-gray/10 bg-brand-white shrink-0 flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => {
              if (activeTab === 'faltante') handlePrint('PEDIDO - FALTANTES PARA STOCK INICIAL', faltantes);
              else if (activeTab === 'vendido') handlePrint(`PEDIDO - TOTAL VENDIDO (${rangoDias} DIAS)`, ventasData);
              else handlePrint(`PEDIDO AUTOMATICO - MAS VENDIDOS (${rangoDias} DIAS)`, ventasData.slice(0, 10));
            }}
            disabled={(activeTab === 'faltante' && faltantes.length === 0) || (activeTab !== 'faltante' && ventasData.length === 0)}
            className="w-full md:w-auto px-8 py-4 bg-[#009EE3] hover:bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-semi shadow-xl disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
          >
            <Printer size={20} /> Confirmar e Imprimir Pedido
          </button>
        </div>
      </div>
    </div>
  )
}
