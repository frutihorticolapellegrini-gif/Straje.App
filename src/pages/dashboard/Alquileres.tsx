import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Calendar, Plus, Search, CheckCircle, Clock } from 'lucide-react'
import { AlquilerForm } from '../../components/alquileres/AlquilerForm'
import { DevolucionModal } from '../../components/alquileres/DevolucionModal'
import { formatMoney } from '../../utils/formatters'

export interface Alquiler {
  id: string
  prenda_id: string
  cliente_nombre: string
  cliente_telefono: string
  fecha_retiro: string
  fecha_devolucion: string
  estado: string
  sena_pagada: number
  monto_total: number
  metodo_pago: string
  creado_en: string
  detalles?: {
    prenda?: {
      id: string
      codigo: string
      tipo: string
    }
  }[]
}

export const Alquileres = () => {
  const { profile } = useAuth()
  const [alquileres, setAlquileres] = useState<Alquiler[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDevolucionOpen, setIsDevolucionOpen] = useState(false)
  const [selectedAlquiler, setSelectedAlquiler] = useState<Alquiler | null>(null)

  useEffect(() => {
    fetchAlquileres()
  }, [])

  const fetchAlquileres = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('alquileres')
        .select(`
          *,
          detalles:alquiler_detalles(
            prenda:prenda_id(id, codigo, tipo)
          )
        `)
        .eq('empresa_id', profile?.empresa_id)
        .order('creado_en', { ascending: false })

      if (error) throw error
      setAlquileres(data as any[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDevolucion = (alquiler: Alquiler) => {
    setSelectedAlquiler(alquiler)
    setIsDevolucionOpen(true)
  }

  const filteredAlquileres = alquileres.filter(a => {
    const term = searchTerm.toLowerCase()
    const codesString = a.detalles?.map(d => d.prenda?.codigo).join(' ') || ''
    
    return a.cliente_nombre.toLowerCase().includes(term) || 
           codesString.toLowerCase().includes(term)
  })

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-2 uppercase tracking-tighter italic">
            <Calendar className="text-brand-blue" size={32} /> Gestión de Alquileres
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-widest">Control de reservas y entregas.</p>
        </div>
        
        <button 
          onClick={() => setIsFormOpen(true)}
          className="w-full md:w-auto px-8 py-4 bg-brand-blue text-white font-black rounded-semi shadow-xl shadow-brand-blue/30 hover:bg-blue-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Nueva Reserva
        </button>
      </header>

      <div className="bg-white p-4 rounded-semi shadow-xl border border-brand-gray/10 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={20} />
          <input 
            type="text" 
            placeholder="BUSCAR POR CLIENTE O CÓDIGO DE PRENDA..."
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
                <th className="p-4">Retiro / Devolución</th>
                <th className="p-4">Prendas</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Saldo Pendiente</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-brand-gray animate-pulse font-black uppercase text-xs">Cargando Alquileres...</td></tr>
              ) : filteredAlquileres.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-brand-gray font-black uppercase text-xs italic">No hay alquileres registrados</td></tr>
              ) : (
                filteredAlquileres.map(alquiler => (
                  <tr key={alquiler.id} className="hover:bg-brand-lightGray/30 transition-all group">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-brand-blue" />
                        <span className="text-[10px] font-black text-brand-black">{new Date(alquiler.fecha_retiro).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 opacity-50">
                        <div className="w-3" />
                        <span className="text-[9px] font-bold text-brand-gray">DEV: {new Date(alquiler.fecha_devolucion).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {alquiler.detalles?.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 bg-brand-lightGray text-brand-black font-mono text-[10px] font-black rounded border border-brand-gray/10 uppercase">
                            {d.prenda?.codigo}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-brand-gray font-black uppercase mt-1 italic">{alquiler.detalles?.length} Artículos</p>
                    </td>
                    <td className="p-4">
                      <p className="font-black text-brand-dark uppercase text-[11px]">{alquiler.cliente_nombre}</p>
                      <p className="text-[10px] text-brand-gray font-bold">{alquiler.cliente_telefono}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-semi text-[9px] font-black uppercase tracking-widest border ${
                        alquiler.estado === 'alquilado' ? 'bg-blue-50 text-brand-blue border-brand-blue/20' : 
                        alquiler.estado === 'devuelto' ? 'bg-green-50 text-green-600 border-green-200' :
                        'bg-orange-50 text-orange-600 border-orange-200'
                      }`}>
                        {alquiler.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <p className={`text-lg font-black tracking-tighter ${alquiler.monto_total - alquiler.sena_pagada > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatMoney(alquiler.monto_total - alquiler.sena_pagada)}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      {alquiler.estado !== 'devuelto' && (
                        <button 
                          onClick={() => handleDevolucion(alquiler)}
                          className="p-2 text-brand-gray hover:text-green-600 hover:bg-green-50 rounded-semi transition-all flex items-center gap-1 mx-auto"
                        >
                          <CheckCircle size={18} />
                          <span className="text-[9px] font-black uppercase">Devolver</span>
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
        <AlquilerForm onClose={() => setIsFormOpen(false)} onSave={fetchAlquileres} />
      )}

      {isDevolucionOpen && selectedAlquiler && (
        <DevolucionModal 
          alquiler={selectedAlquiler} 
          onClose={() => setIsDevolucionOpen(false)} 
          onSave={fetchAlquileres} 
        />
      )}
    </div>
  )
}
