import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ShoppingBag, Plus, Search, XCircle, MessageSquare } from 'lucide-react'
import { VentaForm } from '../../components/ventas/VentaForm'
import { formatMoney } from '../../utils/formatters'

export interface Venta {
  id: string
  prenda_id: string
  cliente_nombre: string | null
  cliente_telefono: string | null
  precio_total: number
  metodo_pago: string
  estado: string
  motivo_cancelacion?: string
  creado_en: string
  detalles?: {
    prenda?: {
      codigo: string
      tipo: string
    }
  }[]
}

export const Ventas = () => {
  const { profile } = useAuth()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    fetchVentas()
  }, [])

  const fetchVentas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          detalles:venta_detalles(
            prenda:prenda_id(codigo, tipo)
          )
        `)
        .eq('empresa_id', profile?.empresa_id)
        .order('creado_en', { ascending: false })

      if (error) throw error
      setVentas(data as any[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelarVenta = async (venta: Venta) => {
    const motivo = window.prompt("MOTIVO DE CANCELACIÓN (OBLIGATORIO):");
    if (!motivo || motivo.trim().length < 5) {
      alert("Debes ingresar un motivo válido (mínimo 5 letras).");
      return;
    }

    if (!window.confirm("¿Estás seguro de cancelar esta venta? El dinero se restará de la caja.")) return;

    try {
      const { error: vError } = await supabase.from('ventas').update({ 
        estado: 'cancelada', 
        motivo_cancelacion: motivo 
      }).eq('id', venta.id)
      
      if (vError) throw vError

      for (const det of (venta.detalles || [])) {
        const prendaId = (det as any).prenda?.id || (det as any).prenda_id;
        if (prendaId) {
          await supabase.rpc('increment_disponibles', { prenda_id: prendaId });
        }
      }

      await supabase.from('caja').insert({
        empresa_id: profile?.empresa_id,
        usuario_id: profile?.id,
        tipo: 'egreso',
        monto: venta.precio_total,
        concepto: `DEVOLUCIÓN/CANCELACIÓN VENTA: ${motivo.toUpperCase()}`,
        metodo_pago: venta.metodo_pago
      })

      fetchVentas()
      alert("Venta cancelada y stock restaurado.");
    } catch (e: any) {
      alert("Error: " + e.message)
    }
  }

  const filteredVentas = ventas.filter(v => {
    const term = searchTerm.toLowerCase()
    const codesString = v.detalles?.map(d => d.prenda?.codigo).join(' ') || ''
    return (
      (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(term)) ||
      codesString.toLowerCase().includes(term)
    )
  })

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-2 uppercase tracking-tighter italic">
            <ShoppingBag className="text-brand-blue" size={32} /> Ventas Realizadas
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-widest">Historial de salidas directas y facturación.</p>
        </div>
        
        <button 
          onClick={() => setIsFormOpen(true)}
          className="w-full md:w-auto px-8 py-4 bg-brand-blue text-white font-black rounded-semi shadow-xl shadow-brand-blue/30 hover:bg-blue-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Nueva Venta
        </button>
      </header>

      <div className="bg-white p-4 rounded-semi shadow-xl border border-brand-gray/10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={20} />
          <input 
            type="text" 
            placeholder="BUSCAR VENTA POR CLIENTE O CÓDIGO DE PRENDA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-brand-lightGray border-none rounded-semi font-black outline-none focus:ring-2 focus:ring-brand-blue uppercase tracking-tighter"
          />
        </div>
      </div>

      <div className="bg-white rounded-semi shadow-2xl border border-brand-gray/10 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-brand-black text-white text-[10px] uppercase tracking-widest font-bold">
                <th className="p-4">Fecha/Hora</th>
                <th className="p-4">Prendas Vendidas</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Total Cobrado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-brand-gray animate-pulse font-black uppercase text-xs">Cargando Ventas...</td></tr>
              ) : filteredVentas.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-brand-gray font-black uppercase text-xs italic">No hay ventas registradas</td></tr>
              ) : (
                filteredVentas.map(venta => (
                  <tr key={venta.id} className="hover:bg-brand-lightGray/30 transition-all group">
                    <td className="p-4">
                      <p className="text-[10px] font-black text-brand-black">{new Date(venta.creado_en).toLocaleDateString()}</p>
                      <p className="text-[9px] text-brand-gray font-bold uppercase">{new Date(venta.creado_en).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {venta.detalles?.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 bg-brand-lightGray text-brand-black font-mono text-[10px] font-black rounded border border-brand-gray/10 uppercase">
                            {d.prenda?.codigo}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-brand-gray font-black uppercase mt-1 italic">{venta.detalles?.length} Artículos</p>
                    </td>
                    <td className="p-4">
                      <p className="font-black text-brand-dark uppercase text-[11px]">{venta.cliente_nombre || 'Consumidor Final'}</p>
                      <p className="text-[10px] text-brand-gray font-bold">{venta.metodo_pago.toUpperCase()}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-semi text-[9px] font-black uppercase tracking-widest border ${
                        venta.estado === 'cancelada' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
                      }`}>
                        {venta.estado}
                      </span>
                      {venta.motivo_cancelacion && (
                        <div className="flex items-center justify-center gap-1 mt-1 text-red-400 group-hover:text-red-600">
                          <MessageSquare size={10} />
                          <span className="text-[8px] font-bold uppercase truncate max-w-[80px]">{venta.motivo_cancelacion}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <p className={`text-lg font-black tracking-tighter ${venta.estado === 'cancelada' ? 'text-brand-gray line-through opacity-50' : 'text-brand-blue'}`}>
                        {formatMoney(venta.precio_total)}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      {venta.estado !== 'cancelada' && (
                        <button 
                          onClick={() => handleCancelarVenta(venta)}
                          className="p-2 text-brand-gray hover:text-red-600 hover:bg-red-50 rounded-semi transition-all flex items-center gap-1 mx-auto"
                          title="Cancelar Venta"
                        >
                          <XCircle size={18} />
                          <span className="text-[9px] font-black uppercase">Anular</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <VentaForm onClose={() => setIsFormOpen(false)} onSave={fetchVentas} />
      )}
    </div>
  )
}
