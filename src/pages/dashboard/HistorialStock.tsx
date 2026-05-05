import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { History, Search, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export const HistorialStock = () => {
  const { profile } = useAuth()
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchHistorial()
  }, [])

  const fetchHistorial = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('historial_stock')
        .select(`
          *,
          prenda:prenda_id(codigo, tipo),
          usuario:usuario_id(nombre)
        `)
        .eq('empresa_id', profile?.empresa_id)
        .order('creado_en', { ascending: false })

      if (error) throw error
      setMovimientos(data || [])
    } catch (err) {
      console.error("Error auditoría:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredMovimientos = movimientos.filter(m => {
    const code = m.prenda?.codigo?.toLowerCase() || ''
    const type = m.prenda?.tipo?.toLowerCase() || ''
    const term = searchTerm.toLowerCase()
    return code.includes(term) || type.includes(term)
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-2 uppercase tracking-tighter italic">
            <History className="text-brand-blue" size={32} /> Auditoría de Stock
          </h2>
          <p className="text-brand-gray font-bold text-[10px] uppercase tracking-[0.2em]">Movimientos reales de prendas y ventas.</p>
        </div>
        <button 
          onClick={fetchHistorial} 
          className="flex items-center gap-2 px-6 py-3 bg-brand-black text-white rounded-semi font-black text-[10px] uppercase hover:bg-brand-gray transition-all shadow-xl"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </header>

      <div className="bg-white p-4 rounded-semi shadow-2xl border border-brand-gray/10 relative overflow-hidden group">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />
          <input 
            type="text"
            placeholder="BUSCAR POR CÓDIGO O TIPO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-brand-lightGray border-none rounded-semi font-black outline-none focus:ring-2 focus:ring-brand-blue uppercase shadow-inner"
          />
        </div>
      </div>

      <div className="bg-white rounded-semi shadow-2xl border border-brand-gray/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-brand-black text-white text-[10px] uppercase tracking-widest font-bold">
                <th className="p-4 w-44">Fecha / Hora</th>
                <th className="p-4 w-32">Cód.</th>
                <th className="p-4">Motivo / Operación</th>
                <th className="p-4 text-center w-24">Cant.</th>
                <th className="p-4">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10">
              {loading ? (
                <tr><td colSpan={5} className="p-16 text-center text-brand-gray animate-pulse font-black uppercase text-xs italic">Sincronizando movimientos...</td></tr>
              ) : filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-brand-gray space-y-2">
                    <p className="font-black uppercase text-sm italic">No hay registros aún</p>
                    <p className="text-[10px] uppercase opacity-50">Asegúrate de haber creado la tabla historial_stock en Supabase.</p>
                  </td>
                </tr>
              ) : (
                filteredMovimientos.map(mov => (
                  <tr key={mov.id} className="hover:bg-brand-lightGray/30 transition-all">
                    <td className="p-4">
                      <p className="text-[10px] font-black text-brand-black">{new Date(mov.creado_en).toLocaleDateString()}</p>
                      <p className="text-[9px] text-brand-gray font-bold">{new Date(mov.creado_en).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs</p>
                    </td>
                    <td className="p-4">
                      <span className="font-black text-brand-blue text-xs uppercase bg-brand-blue/5 px-2 py-1 rounded">
                        {mov.prenda?.codigo || '---'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${
                          mov.tipo_movimiento === 'entrada' || mov.tipo_movimiento === 'ajuste_positivo' ? 'bg-green-100 text-green-600' : 
                          'bg-red-100 text-red-600'
                        }`}>
                          {mov.cantidad > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        </div>
                        <div>
                          <p className="font-black text-brand-dark uppercase text-[11px]">{mov.motivo}</p>
                          <p className="text-[8px] font-bold text-brand-gray uppercase tracking-tighter">{mov.tipo_movimiento} de {mov.prenda?.tipo || 'prenda'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-base font-black ${mov.cantidad > 0 ? 'text-brand-black' : 'text-red-500'}`}>
                        {mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-[9px] font-black text-brand-black uppercase">{mov.usuario?.nombre || 'SISTEMA'}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
