import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Waves, CheckCircle, Search, RefreshCw } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'

interface PrendaLavanderia {
  id: string
  codigo: string
  tipo: string
  precio_alquiler: number
  estado: string
}

export const Lavanderia = () => {
  const { profile } = useAuth()
  const [prendas, setPrendas] = useState<PrendaLavanderia[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLavanderia()
  }, [])

  const fetchLavanderia = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .eq('empresa_id', profile?.empresa_id)
        .eq('estado', 'lavanderia')
        .order('codigo', { ascending: true })

      if (error) throw error
      setPrendas(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmarLimpio = async (prenda: PrendaLavanderia) => {
    if (!confirm(`¿Confirmar que la prenda ${prenda.codigo} está lista para alquilar?`)) return
    
    try {
      // Incrementar disponibles y volver a estado disponible
      const { error: stockErr } = await supabase
        .from('stock')
        .update({ 
          estado: 'disponible',
          disponibles: (prenda as any).disponibles + 1 // No usamos rpc aquí por simplicidad si ya tenemos el objeto, pero rpc es mejor
        })
        .eq('id', prenda.id)
      
      if (stockErr) {
        // Si falló el update manual, intentamos rpc
        await supabase.rpc('increment_disponibles', { prenda_id: prenda.id })
        await supabase.from('stock').update({ estado: 'disponible' }).eq('id', prenda.id)
      }

      await supabase.from('historial_stock').insert({
        empresa_id: profile?.empresa_id,
        prenda_id: prenda.id,
        tipo_movimiento: 'entrada',
        cantidad: 1,
        motivo: 'Regreso de Lavandería',
        usuario_id: profile?.id
      })

      fetchLavanderia()
    } catch (err) {
      console.error(err)
      alert("Error al confirmar limpieza")
    }
  }

  const filtered = prendas.filter(p => 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-3 italic uppercase tracking-tighter">
            <Waves className="text-brand-blue animate-pulse" size={32} /> Control de Lavandería
          </h2>
          <p className="text-brand-gray font-medium">Prendas en proceso de limpieza y mantenimiento.</p>
        </div>
        <button 
          onClick={fetchLavanderia}
          className="p-3 bg-brand-lightGray text-brand-gray rounded-full hover:bg-brand-blue/10 hover:text-brand-blue transition-all"
          title="Refrescar lista"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="bg-brand-white p-4 rounded-t-semi border border-brand-gray/10 flex justify-between items-center bg-gradient-to-r from-white to-brand-lightGray/30">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por código o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-brand-gray/20 rounded-semi font-bold outline-none focus:border-brand-blue transition-all shadow-sm"
          />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Total en Lavado</p>
          <p className="text-2xl font-black text-brand-blue tracking-tighter">{prendas.length} UNID.</p>
        </div>
      </div>

      <div className="bg-brand-white rounded-b-semi shadow-2xl border border-t-0 border-brand-gray/10 flex-1 overflow-auto overflow-x-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-brand-gray uppercase text-xs tracking-widest">Actualizando Lavandería...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <Waves size={64} className="mb-4 text-brand-gray" />
            <p className="font-black text-xl uppercase italic text-brand-gray">No hay prendas en lavandería</p>
            <p className="text-sm font-medium">Todo el stock está listo o alquilado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filtered.map(prenda => (
              <div key={prenda.id} className="bg-white border-2 border-brand-lightGray rounded-semi p-5 flex flex-col gap-4 hover:border-brand-blue/30 transition-all hover:shadow-xl group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/5 -mr-8 -mt-8 rounded-full group-hover:scale-150 transition-transform duration-500" />
                
                <div className="flex justify-between items-start relative">
                  <div>
                    <span className="px-2 py-1 bg-brand-black text-white text-[10px] font-black rounded uppercase tracking-widest">{prenda.codigo}</span>
                    <h4 className="text-lg font-black text-brand-black uppercase italic mt-1 leading-tight">{prenda.tipo}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-brand-gray uppercase">Valor Alquiler</p>
                    <p className="text-md font-black text-brand-blue">{formatMoney(prenda.precio_alquiler)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2 border-y border-brand-gray/5">
                  <div className="w-2 h-2 bg-brand-blue rounded-full animate-ping" />
                  <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest italic">EN PROCESO DE LAVADO</p>
                </div>

                <button 
                  onClick={() => handleConfirmarLimpio(prenda)}
                  className="mt-auto w-full py-3 bg-brand-black text-white rounded-semi font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-blue transition-all group shadow-lg"
                >
                  <CheckCircle size={16} />
                  Confirmar Limpio
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
