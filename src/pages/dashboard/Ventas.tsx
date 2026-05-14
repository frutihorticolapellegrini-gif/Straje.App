import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ShoppingBag, Plus, Search, XCircle, MessageSquare, X } from 'lucide-react'
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
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState('')

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
            prenda:prenda_id(id, codigo, tipo)
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
    setSelectedVenta(venta);
    setShowConfirmCancel(true);
    setMotivoCancel('');
  }

  const confirmAnular = async () => {
    if (!selectedVenta) return;
    const venta = selectedVenta;
    const motivo = motivoCancel || "ANULACIÓN MANUAL";
    
    setShowConfirmCancel(false);
    console.log("PROCEDIENDO A ANULAR VENTA:", venta.id);

    try {
      console.log("1. ENVIANDO UPDATE A VENTAS...");
      const { error: vError } = await supabase.from('ventas').update({ 
        estado: 'cancelada', 
        motivo_cancelacion: motivo 
      }).eq('id', venta.id)
      
      if (vError) {
        console.error("ERROR EN UPDATE VENTAS:", vError);
        throw vError;
      }
      console.log("2. UPDATE VENTAS OK. RESTAURANDO STOCK...");

      // Restaurar Stock
      if (venta.detalles) {
        for (const det of venta.detalles) {
          const pId = (det as any).prenda?.id || (det as any).prenda_id;
          if (pId) {
             const { data: s } = await supabase.from('stock').select('disponibles').eq('id', pId).single();
             if (s) await supabase.from('stock').update({ disponibles: s.disponibles + 1 }).eq('id', pId);
          }
        }
      }

      // 3. Revertir Caja y Cta Cte
      try {
        const montoRevertir = Number(venta.precio_total) || 0;
        console.log("3. REGISTRANDO EGRESO EN CAJA DE:", montoRevertir);
        
        // Registrar Egreso
        const { error: cError } = await supabase.from('caja').insert({
          empresa_id: profile?.empresa_id,
          usuario_id: profile?.id,
          tipo: 'egreso',
          monto: montoRevertir,
          concepto: `ANULACIÓN VENTA: ${venta.cliente_nombre || 'S/N'} - MOTIVO: ${motivo.toUpperCase()}`,
          metodo_pago: venta.metodo_pago
        });

        if (cError) console.error("ERROR EN CAJA:", cError);
        else console.log("4. CAJA OK. ACTUALIZANDO CTA CTE...");

        // Saldar Cta Cte si existe
        const { error: ccError } = await supabase.from('cuentas_corrientes')
          .update({ estado: 'saldado', monto_pendiente: 0 })
          .eq('venta_id', venta.id);
          
        if (ccError) console.error("ERROR EN CTA CTE:", ccError);
        else console.log("5. CTA CTE OK.");
          
      } catch (contableErr) {
        console.error("Error contable al anular:", contableErr);
      }

      console.log("6. FINALIZANDO Y REFRESCANDO...");
      await fetchVentas();
      alert("VENTA ANULADA CON ÉXITO.");
    } catch (e: any) {
      console.error("Error al anular venta:", e);
      alert("ERROR AL ANULAR: " + (e.message || "Error desconocido"));
    }
  }

  const filteredVentas = ventas.filter(v => {
    const term = searchTerm.toLowerCase()
    const codesString = v.detalles?.map(d => d.prenda?.codigo).join(' ') || ''
    
    // Parsear fecha para comparar con el filtro de YYYY-MM-DD
    const vDate = new Date(v.creado_en).toLocaleDateString('sv-SE') // Formato YYYY-MM-DD en zona local
    const matchesDate = filterDate ? vDate === filterDate : true

    const matchesSearch = 
      (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(term)) ||
      codesString.toLowerCase().includes(term)

    return matchesDate && matchesSearch
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

      <div className="bg-white p-4 rounded-semi shadow-xl border border-brand-gray/10 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={20} />
          <input 
            type="text" 
            placeholder="BUSCAR VENTA POR CLIENTE O CÓDIGO DE PRENDA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-brand-lightGray border-none rounded-semi font-black outline-none focus:ring-2 focus:ring-brand-blue uppercase tracking-tighter"
          />
        </div>
        <div className="w-full md:w-auto">
          <input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full md:w-auto px-4 py-3 bg-brand-lightGray border-none rounded-semi font-black outline-none focus:ring-2 focus:ring-brand-blue text-brand-black cursor-pointer"
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
                      <button 
                        onClick={() => {
                          setSelectedVenta(venta)
                          setShowDetails(true)
                        }}
                        className={`px-2 py-1 rounded-semi text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-110 ${
                        venta.estado === 'cancelada' ? 'bg-red-50 text-red-600 border-red-200' : 
                        venta.estado === 'pendiente_pago' ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-md cursor-pointer' :
                        'bg-green-50 text-green-600 border-green-200'
                      }`}>
                        {venta.estado === 'pendiente_pago' ? 'FALTA PAGAR' : venta.estado === 'cancelada' ? 'ANULADA' : 'PAGADO'}
                      </button>
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

      {showDetails && selectedVenta && (
        <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
             <div className="p-6 bg-brand-black text-white flex justify-between items-center">
                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">Detalle de Venta</h3>
                <button onClick={() => setShowDetails(false)} className="text-white/50 hover:text-white uppercase font-black text-xs">Cerrar</button>
             </div>
             <div className="p-8 space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Cliente</p>
                    <p className="text-lg font-black uppercase text-brand-black tracking-tighter">{selectedVenta.cliente_nombre || 'Consumidor Final'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Fecha</p>
                    <p className="font-bold text-xs">{new Date(selectedVenta.creado_en).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Artículos</p>
                   <div className="space-y-2">
                      {selectedVenta.detalles?.map((d, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-brand-lightGray rounded-semi border border-brand-gray/5">
                           <span className="font-black text-xs text-brand-black uppercase italic tracking-tighter">{d.prenda?.tipo}</span>
                           <span className="px-2 py-0.5 bg-brand-black text-white font-mono text-[9px] font-black rounded uppercase">{d.prenda?.codigo}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-brand-blue/5 p-4 rounded-semi border border-brand-blue/20">
                   <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Total de la Operación</p>
                      <p className="text-2xl font-black text-brand-blue italic tracking-tighter">{formatMoney(selectedVenta.precio_total)}</p>
                   </div>
                   <div className="flex justify-between items-center mt-2 opacity-70">
                      <p className="text-[9px] font-bold text-brand-gray uppercase tracking-widest">Método de Pago</p>
                      <p className="text-xs font-black text-brand-black uppercase italic tracking-tighter">{selectedVenta.metodo_pago}</p>
                   </div>
                   {selectedVenta.estado === 'pendiente_pago' && (
                     <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-semi flex items-center gap-2">
                        <MessageSquare size={16} className="text-orange-600" />
                        <p className="text-[10px] font-black text-orange-700 uppercase leading-tight italic">ESTA VENTA TIENE UN SALDO PENDIENTE EN CUENTA CORRIENTE</p>
                     </div>
                   )}
                </div>

                <button onClick={() => setShowDetails(false)} className="w-full py-4 bg-brand-black text-white font-black rounded-semi uppercase text-xs tracking-widest hover:bg-brand-gray transition-all shadow-xl">Entendido</button>
             </div>
          </div>
        </div>
      )}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-brand-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 bg-red-600 text-white flex justify-between items-center">
              <h4 className="font-black uppercase italic flex items-center gap-2 tracking-tighter">
                <XCircle size={20} /> Confirmar Anulación
              </h4>
              <button onClick={() => setShowConfirmCancel(false)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm font-bold text-brand-gray uppercase text-center tracking-tight">
                ¿Estás seguro de anular esta venta? <br/> El stock será restaurado y se generará un egreso en caja.
              </p>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-gray uppercase tracking-widest block">Motivo de Cancelación (Opcional)</label>
                <textarea 
                  value={motivoCancel}
                  onChange={(e) => setMotivoCancel(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-lightGray rounded-semi font-bold text-xs outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none uppercase"
                  placeholder="EJ: ERROR EN PRECIO, CAMBIO DE PRODUCTO..."
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmCancel(false)}
                  className="flex-1 py-4 bg-brand-lightGray text-brand-gray font-black rounded-semi uppercase text-xs tracking-widest hover:bg-brand-gray/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmAnular}
                  className="flex-1 py-4 bg-red-600 text-white font-black rounded-semi uppercase text-xs tracking-widest shadow-xl hover:bg-red-700 transition-all"
                >
                  Anular Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
