import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Package, CheckCircle, Search, Scissors, ChevronRight } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'

import { toPng } from 'html-to-image'

interface Pedido {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  fecha_retiro: string
  fecha_devolucion: string
  estado: string
  preparacion_estado: 'pendiente' | 'listo' | 'retirado'
  monto_total: number
  sena_pagada: number
  creado_en: string
  numero_azar: string // Asegurarnos de traer el numero azar si existe
  detalles: {
    prenda: {
      id: string
      codigo: string
      tipo: string
      color: string
      marca: string
    }
  }[]
}

export const PedidosPreparar = () => {
  const { profile, empresa } = useAuth()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState<'pendientes' | 'retirados'>('pendientes')

  useEffect(() => {
    fetchPedidos()
  }, [view])

  const fetchPedidos = async () => {
    setLoading(true)
    try {
      // Intentamos traer también troqueles asociados para sacar el numero_azar
      let query = supabase
        .from('alquileres')
        .select(`
          *,
          detalles:alquiler_detalles(
            prenda:prenda_id(id, codigo, tipo, color, marca)
          )
        `)
        .eq('empresa_id', profile?.empresa_id)
        .order('fecha_retiro', { ascending: true })

      if (view === 'pendientes') {
        query = query.neq('preparacion_estado', 'retirado')
      } else {
        query = query.eq('preparacion_estado', 'retirado')
      }

      const { data, error } = await query
      if (error) throw error
      
      // Mapear numero_azar si no viene directo (depende de cómo guardamos el alquiler_id en troqueles)
      // Por simplicidad, si no viene, generaremos uno o buscaremos en la tabla troqueles
      setPedidos(data as any[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarcarListo = async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from('alquileres')
        .update({ 
          preparacion_estado: 'listo',
          fecha_preparacion: new Date().toISOString()
        })
        .eq('id', pedidoId)
      
      if (error) throw error
      fetchPedidos()
    } catch (err) {
      console.error(err)
      alert("Error al actualizar pedido")
    }
  }

  const handleMarcarRetirado = async (pedidoId: string) => {
    if (!confirm("¿Confirmar que el pedido fue RETIRADO por el cliente?")) return
    try {
      const { error } = await supabase
        .from('alquileres')
        .update({ 
          preparacion_estado: 'retirado',
          fecha_entrega: new Date().toISOString()
        })
        .eq('id', pedidoId)
      
      if (error) throw error
      fetchPedidos()
    } catch (err) {
      console.error(err)
      alert("Error al marcar como retirado")
    }
  }

  const handleGenerarTroquelImagen = async (pedido: Pedido) => {
    const el = document.getElementById(`troquel-capture-${pedido.id}`);
    if (!el) return;
    
    try {
      const dataUrl = await toPng(el, { quality: 0.95, backgroundColor: '#fff' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `troquel-${pedido.cliente_nombre}.png`, { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Troquel de Retiro',
          text: `Hola ${pedido.cliente_nombre}, aquí tienes tu comprobante de retiro para el ${new Date(pedido.fecha_retiro).toLocaleDateString()}.`
        });
      } else {
        // Fallback: descargar imagen
        const link = document.createElement('a');
        link.download = `troquel-${pedido.cliente_nombre}.png`;
        link.href = dataUrl;
        link.click();
        alert("Imagen descargada. Por favor, adjúntala en WhatsApp.");
      }
    } catch (err) {
      console.error("Error al generar imagen:", err);
      alert("No se pudo generar la imagen.");
    }
  }

  const isAtrasado = (fecha: string) => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const retiro = new Date(fecha);
    retiro.setHours(0,0,0,0);
    
    const diffTime = retiro.getTime() - hoy.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    // Nueva Lógica Fin de Semana (Punto Solicitado)
    const diaSemanaRetiro = retiro.getDay(); // 0: Dom, 1: Lun, 6: Sab
    if (diaSemanaRetiro === 6 || diaSemanaRetiro === 0 || diaSemanaRetiro === 1) {
      // Si el retiro es Sábado, Domingo o Lunes, avisar desde el Jueves (4 días antes del lunes es jueves)
      // diffDays <= 4 asegura que si hoy es Jueves y el retiro es Lunes (4 días), ya esté en rojo.
      return diffDays <= 4;
    }

    return diffDays <= 1; // Estándar: Hoy o Mañana
  }

  const filtered = pedidos.filter(p => 
    p.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.detalles.some(d => d.prenda.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-3 uppercase tracking-tighter italic">
            <Package className="text-brand-blue" size={32} /> Pedidos a Preparar
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-widest">Agenda de separación y entrega de prendas.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-semi shadow-md border border-brand-gray/10">
          <button 
            onClick={() => setView('pendientes')}
            className={`px-6 py-2 rounded-semi font-black text-[10px] uppercase tracking-widest transition-all ${view === 'pendientes' ? 'bg-brand-black text-white' : 'text-brand-gray hover:text-brand-black'}`}
          >
            Pendientes
          </button>
          <button 
            onClick={() => setView('retirados')}
            className={`px-6 py-2 rounded-semi font-black text-[10px] uppercase tracking-widest transition-all ${view === 'retirados' ? 'bg-brand-black text-white' : 'text-brand-gray hover:text-brand-black'}`}
          >
            Retirados
          </button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-semi shadow-xl border border-brand-gray/10 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={20} />
          <input 
            type="text" 
            placeholder="BUSCAR POR CLIENTE O CÓDIGO DE PRENDA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {loading ? (
          <div className="col-span-full py-20 text-center animate-pulse">
            <Package size={48} className="mx-auto mb-4 text-brand-gray/20" />
            <p className="font-black text-brand-gray uppercase tracking-widest text-xs">Cargando pedidos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-semi border-2 border-dashed border-brand-gray/10 opacity-50">
            <CheckCircle size={48} className="mx-auto mb-4 text-brand-gray" />
            <p className="font-black text-brand-gray uppercase tracking-widest text-xs italic">No hay pedidos en esta sección</p>
          </div>
        ) : (
          filtered.map(pedido => {
            const atrasado = view === 'pendientes' && isAtrasado(pedido.fecha_retiro);
            const listo = pedido.preparacion_estado === 'listo';
            
            return (
              <div key={pedido.id} className={`bg-white rounded-semi shadow-xl border-2 transition-all overflow-hidden flex flex-col ${atrasado && !listo ? 'border-red-500 bg-red-50/30 shadow-red-100' : 'border-brand-gray/5 hover:border-brand-blue/30'}`}>
                <div className={`p-4 flex justify-between items-start ${atrasado && !listo ? 'bg-red-500 text-white' : 'bg-brand-black text-white'}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Retiro Programado</p>
                    <p className="text-xl font-black italic uppercase">{new Date(pedido.fecha_retiro).toLocaleDateString()}</p>
                  </div>
                  {atrasado && !listo && <div className="px-2 py-1 bg-white text-red-600 rounded font-black text-[9px] uppercase animate-pulse">¡URGENTE!</div>}
                  {listo && <div className="px-2 py-1 bg-green-500 text-white rounded font-black text-[9px] uppercase">LISTO</div>}
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div>
                    <h4 className="text-lg font-black text-brand-black uppercase tracking-tighter truncate">{pedido.cliente_nombre}</h4>
                    <p className="text-[10px] font-bold text-brand-gray">{pedido.cliente_telefono || 'S/N'}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-brand-gray uppercase tracking-widest border-b border-brand-gray/10 pb-1">Prendas a Separar</p>
                    {pedido.detalles.map((d, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="font-black text-brand-black truncate pr-2">{d.prenda.tipo} <span className="text-[9px] text-brand-gray font-bold italic">{d.prenda.color}</span></span>
                        <span className="px-2 py-0.5 bg-brand-lightGray text-brand-black font-mono font-bold rounded">{d.prenda.codigo}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-brand-lightGray/30 p-3 rounded flex justify-between items-center mt-auto">
                    <div>
                      <p className="text-[8px] font-black text-brand-gray uppercase">Saldo Pendiente</p>
                      <p className={`font-black ${pedido.monto_total - pedido.sena_pagada > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatMoney(pedido.monto_total - pedido.sena_pagada)}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleGenerarTroquelImagen(pedido)}
                      className="p-2 bg-white text-brand-blue border border-brand-blue/20 rounded-full hover:bg-brand-blue hover:text-white transition-all shadow-sm flex items-center gap-2 px-3"
                      title="Compartir Imagen de Troquel"
                    >
                      <Scissors size={18} /> <span className="text-[9px] font-black uppercase">Compartir Imagen</span>
                    </button>
                  </div>
                </div>

                {/* TROQUEL OCULTO PARA CAPTURA (Fuera de la vista pero en el DOM) */}
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                  <div id={`troquel-capture-${pedido.id}`} className="w-[400px] bg-white p-8 border-[10px] border-brand-black" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-black uppercase tracking-tighter italic border-b-4 border-brand-blue pb-2">{empresa?.nombre}</h2>
                      
                      <div>
                        <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Cliente</p>
                        <p className="text-3xl font-black text-brand-black uppercase leading-tight">{pedido.cliente_nombre}</p>
                        <p className="text-sm font-bold text-brand-gray">{pedido.cliente_telefono}</p>
                      </div>

                      <div className="bg-brand-lightGray p-4 rounded-semi border-2 border-brand-black">
                        <p className="text-xs font-black uppercase text-brand-gray">Fecha de Retiro</p>
                        <p className="text-4xl font-black text-brand-black italic">{new Date(pedido.fecha_retiro).toLocaleDateString()}</p>
                      </div>

                      <div className="bg-brand-black text-white p-6 rounded-semi">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Código de Retiro</p>
                        <p className="text-6xl font-black tracking-[10px]">{pedido.id.slice(0,3).toUpperCase()}</p>
                      </div>

                      <div className="text-left border-t-2 border-brand-gray/20 pt-4">
                        <p className="text-xs font-black uppercase text-brand-gray mb-2">Prendas a Retirar:</p>
                        <ul className="space-y-1">
                          {pedido.detalles.map((d, i) => (
                            <li key={i} className="text-sm font-black text-brand-black flex justify-between">
                              <span>{d.prenda.tipo} {d.prenda.color}</span>
                              <span className="bg-brand-lightGray px-2 rounded font-mono">{d.prenda.codigo}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <p className="text-[10px] font-bold text-brand-gray italic pt-4">Conserve este comprobante para retirar su pedido.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-brand-lightGray/10 border-t border-brand-gray/5 grid grid-cols-2 gap-3">
                  {view === 'pendientes' && (
                    <>
                      <button 
                        onClick={() => handleMarcarListo(pedido.id)}
                        disabled={listo}
                        className={`flex items-center justify-center gap-2 py-3 rounded-semi font-black text-[10px] uppercase tracking-widest transition-all ${listo ? 'bg-green-100 text-green-600 border-2 border-green-200' : 'bg-white text-brand-black border-2 border-brand-black hover:bg-brand-black hover:text-white'}`}
                      >
                        <CheckCircle size={14} /> {listo ? 'LISTO' : 'PREPARADO'}
                      </button>
                      <button 
                        onClick={() => handleMarcarRetirado(pedido.id)}
                        disabled={!listo}
                        className={`flex items-center justify-center gap-2 py-3 rounded-semi font-black text-[10px] uppercase tracking-widest transition-all ${!listo ? 'bg-brand-gray/10 text-brand-gray cursor-not-allowed' : 'bg-brand-blue text-white hover:bg-brand-dark shadow-lg'}`}
                      >
                        <ChevronRight size={14} /> ENTREGADO
                      </button>
                    </>
                  )}
                  {view === 'retirados' && (
                    <div className="col-span-2 text-center py-2 text-[10px] font-black text-green-600 uppercase italic flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Pedido Entregado con Éxito
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
