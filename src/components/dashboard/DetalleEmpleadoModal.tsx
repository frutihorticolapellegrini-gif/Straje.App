import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Calendar, List } from 'lucide-react'

interface DetalleEmpleadoModalProps {
  empleado: { id: string; nombre: string }
  onClose: () => void
  fechaInicial?: string // Si se pasa, muestra esa fecha, sino, permite elegir
}

export const DetalleEmpleadoModal: React.FC<DetalleEmpleadoModalProps> = ({ empleado, onClose, fechaInicial }) => {
  const [fecha, setFecha] = useState(fechaInicial || new Date().toISOString().split('T')[0])
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDetalles()
  }, [fecha])

  const fetchDetalles = async () => {
    setLoading(true)
    try {
      // Buscamos en la caja todos los movimientos hechos por este usuario en esta fecha
      const { data, error } = await supabase
        .from('caja')
        .select('*')
        .eq('usuario_id', empleado.id)
        .gte('fecha_movimiento', `${fecha}T00:00:00.000Z`)
        .lte('fecha_movimiento', `${fecha}T23:59:59.999Z`)
        .order('fecha_movimiento', { ascending: false })

      if (error) throw error
      setMovimientos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const ventas = movimientos.filter(m => m.concepto.toLowerCase().includes('venta'))
  const alquileres = movimientos.filter(m => m.concepto.toLowerCase().includes('alquiler'))
  const otros = movimientos.filter(m => !m.concepto.toLowerCase().includes('venta') && !m.concepto.toLowerCase().includes('alquiler'))

  return (
    <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-brand-black px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <List size={20} /> Historial de Actividad
          </h3>
          <button onClick={onClose} className="p-2 text-brand-gray hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-semi shadow-sm border border-brand-gray/10">
            <div>
              <p className="text-xs text-brand-gray uppercase font-bold tracking-wider">Empleado</p>
              <p className="text-lg font-black text-brand-black">{empleado.nombre}</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-brand-gray" />
              <input 
                type="date" 
                value={fecha} 
                onChange={e => setFecha(e.target.value)}
                className="px-3 py-1.5 border border-brand-gray/30 rounded focus:border-brand-blue outline-none text-sm font-bold text-brand-dark"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center p-8 text-brand-gray animate-pulse font-bold">Cargando actividad...</div>
          ) : movimientos.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-semi border border-brand-gray/10 text-brand-gray font-bold">
              No se registraron movimientos en esta fecha.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-semi border border-blue-100 text-center">
                  <p className="text-2xl font-black text-blue-600">{alquileres.length}</p>
                  <p className="text-[10px] font-bold text-blue-800 uppercase">Alquileres</p>
                </div>
                <div className="bg-green-50 p-4 rounded-semi border border-green-100 text-center">
                  <p className="text-2xl font-black text-green-600">{ventas.length}</p>
                  <p className="text-[10px] font-bold text-green-800 uppercase">Ventas</p>
                </div>
                <div className="bg-brand-lightGray p-4 rounded-semi border border-brand-gray/20 text-center">
                  <p className="text-2xl font-black text-brand-dark">{otros.length}</p>
                  <p className="text-[10px] font-bold text-brand-gray uppercase">Otros Mvts.</p>
                </div>
              </div>

              <div className="bg-white rounded-semi shadow-sm border border-brand-gray/10 overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-brand-lightGray/50 border-b border-brand-gray/10 text-xs uppercase text-brand-gray font-bold">
                      <th className="p-3">Hora</th>
                      <th className="p-3">Concepto</th>
                      <th className="p-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-gray/10">
                    {movimientos.map(mov => (
                      <tr key={mov.id} className="hover:bg-brand-lightGray/30">
                        <td className="p-3 text-brand-gray whitespace-nowrap">
                          {new Date(mov.fecha_movimiento).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="p-3 font-medium text-brand-dark">{mov.concepto}</td>
                        <td className="p-3 text-right">
                          <span className={`font-bold ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-500'}`}>
                            {mov.tipo === 'ingreso' ? '+' : '-'} ${mov.monto.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
