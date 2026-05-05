import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Calendar, Plus, Search, CheckCircle, Clock } from 'lucide-react'
import { AlquilerForm } from '../../components/alquileres/AlquilerForm'
import { DevolucionModal } from '../../components/alquileres/DevolucionModal'

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
  const [filterEstado, setFilterEstado] = useState<'activos' | 'finalizados' | 'atrasados'>('activos')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [devolucionAlquiler, setDevolucionAlquiler] = useState<Alquiler | null>(null)

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
            prenda_id,
            prenda:prenda_id(id, codigo, tipo)
          )
        `)
        .eq('empresa_id', profile?.empresa_id)
        .order('fecha_retiro', { ascending: true })

      if (error) throw error
      setAlquileres(data as any[])
    } catch (err) {
      console.error(err)
      alert('Error cargando alquileres')
    } finally {
      setLoading(false)
    }
  }

  const filteredAlquileres = alquileres.filter(a => {
    const term = searchTerm.toLowerCase()
    const codesString = a.detalles?.map(d => d.prenda?.codigo).join(' ') || ''
    const matchesSearch = a.cliente_nombre.toLowerCase().includes(term) || codesString.toLowerCase().includes(term)

    if (!matchesSearch) return false;

    if (filterEstado === 'finalizados') {
      return a.estado === 'devuelto';
    } else if (filterEstado === 'atrasados') {
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const fechaDev = new Date(a.fecha_devolucion); fechaDev.setHours(0,0,0,0);
      return a.estado !== 'devuelto' && fechaDev.getTime() < hoy.getTime();
    } else {
      // Activos
      return a.estado !== 'devuelto';
    }
  })

  const getSemaforoBadge = (alquiler: Alquiler) => {
    if (alquiler.estado === 'devuelto') {
      return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-bold uppercase border border-gray-200">Devuelto</span>
    }

    const hoy = new Date()
    hoy.setHours(0,0,0,0)
    // Usamos split para evitar problemas de timezone de la DB y tomar la fecha YYYY-MM-DD literal si es posible, o parsear directo
    const fechaDev = new Date(alquiler.fecha_devolucion)
    fechaDev.setHours(0,0,0,0)
    
    const diffTime = fechaDev.getTime() - hoy.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 border border-red-300 rounded text-xs font-bold uppercase animate-pulse">Atrasado ({Math.abs(diffDays)}d)</span>
    } else if (diffDays === 0) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded text-xs font-bold uppercase">Devuelve HOY</span>
    } else if (diffDays === 1) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded text-xs font-bold uppercase">Mañana</span>
    } else {
      return <span className="px-2 py-1 bg-green-100 text-green-800 border border-green-300 rounded text-xs font-bold uppercase">En {diffDays} días</span>
    }
  }

  const getPaymentStatus = (alquiler: Alquiler) => {
    if (alquiler.sena_pagada >= alquiler.monto_total) {
      return <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={14}/> PAGADO</span>
    }
    return <span className="text-orange-600 font-bold text-xs flex items-center gap-1"><Clock size={14}/> DEBE ${(alquiler.monto_total - alquiler.sena_pagada).toLocaleString()}</span>
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black flex items-center gap-2">
            <Calendar className="text-brand-blue" /> Alquileres y Reservas
          </h2>
          <p className="text-brand-gray">Gestión de préstamos y agenda de la tienda.</p>
        </div>
        
        <button 
          onClick={() => setIsFormOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Nuevo Alquiler
        </button>
      </header>

      <div className="bg-brand-white p-4 rounded-t-semi border-b border-brand-gray/10 flex flex-col md:flex-row justify-end gap-4">
        <select 
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as any)}
          className="px-4 py-2 bg-brand-lightGray border-none rounded-semi font-bold outline-none text-brand-black cursor-pointer text-sm"
        >
          <option value="activos">En Espera (Activos)</option>
          <option value="atrasados">Atrasados (En Rojo)</option>
          <option value="finalizados">Finalizados (Devueltos)</option>
        </select>
        <div className="relative w-full md:w-64">
          <input 
            type="text" 
            placeholder="Buscar por cliente o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
        </div>
      </div>

      <div className="bg-brand-white rounded-b-semi shadow-sm border border-t-0 border-brand-gray/10 flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-lightGray/50 border-b border-brand-gray/10 text-xs uppercase text-brand-gray font-bold">
              <th className="p-4">Prenda</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Retiro / Devolución</th>
              <th className="p-4">Semáforo</th>
              <th className="p-4 text-right">Pago</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray/10 text-sm">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-brand-gray animate-pulse">Cargando alquileres...</td></tr>
            ) : filteredAlquileres.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-brand-gray">No hay alquileres registrados.</td></tr>
            ) : (
              filteredAlquileres.map(alq => (
                <tr key={alq.id} className="hover:bg-brand-lightGray/30 transition-colors">
                  <td className="p-4">
                    <p className="font-mono font-bold text-brand-black">
                      {alq.detalles && alq.detalles.length > 0 
                        ? alq.detalles.map(d => d.prenda?.codigo).join(', ') 
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-brand-gray">{alq.detalles?.length || 0} prendas</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-brand-dark">{alq.cliente_nombre}</p>
                    <p className="text-xs text-brand-gray">{alq.cliente_telefono || 'Sin teléfono'}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-brand-black flex gap-2">
                      <span className="text-green-600">↑ {new Date(alq.fecha_retiro).toLocaleDateString()}</span>
                    </p>
                    <p className="font-medium text-brand-black flex gap-2">
                      <span className="text-red-600">↓ {new Date(alq.fecha_devolucion).toLocaleDateString()}</span>
                    </p>
                  </td>
                  <td className="p-4">
                    {getSemaforoBadge(alq)}
                  </td>
                  <td className="p-4 text-right">
                    <p className="font-bold text-brand-dark">${alq.monto_total.toLocaleString()}</p>
                    <div className="flex justify-end mt-1">
                      {getPaymentStatus(alq)}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {alq.estado !== 'devuelto' ? (
                      <button 
                        onClick={() => setDevolucionAlquiler(alq)}
                        className="px-3 py-1.5 bg-brand-blue text-white rounded text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm"
                      >
                        Devolver
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">✔ Finalizado</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <AlquilerForm 
          onClose={() => setIsFormOpen(false)} 
          onSave={fetchAlquileres}
        />
      )}

      {devolucionAlquiler && (
        <DevolucionModal
          alquiler={devolucionAlquiler}
          onClose={() => setDevolucionAlquiler(null)}
          onSave={fetchAlquileres}
        />
      )}
    </div>
  )
}
