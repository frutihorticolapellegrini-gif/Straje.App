import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Save, AlertCircle, Shield, Info } from 'lucide-react'

interface PermisosModalProps {
  empleado: { id: string; nombre: string; permisos?: any }
  onClose: () => void
  onSave: () => void
}

export const PermisosModal: React.FC<PermisosModalProps> = ({ empleado, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estado de permisos individuales ampliado (Punto 5)
  const [permisos, setPermisos] = useState({
    puede_ver_historial: false,
    puede_cargar_stock: false,
    puede_cancelar_ventas: false,
    puede_ver_inventario: true,
    puede_ver_totales_caja: false
  })

  useEffect(() => {
    if (empleado.permisos) {
      setPermisos({
        puede_ver_historial: !!empleado.permisos.puede_ver_historial,
        puede_cargar_stock: !!empleado.permisos.puede_cargar_stock,
        puede_cancelar_ventas: !!empleado.permisos.puede_cancelar_ventas,
        puede_ver_inventario: empleado.permisos.puede_ver_inventario !== false,
        puede_ver_totales_caja: !!empleado.permisos.puede_ver_totales_caja
      })
    }
  }, [empleado])

  const handleToggle = (key: keyof typeof permisos) => {
    setPermisos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ permisos: permisos })
        .eq('id', empleado.id)

      if (updateError) throw updateError
      
      onSave()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError('Error al actualizar permisos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
        <div className="bg-brand-black px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={20} /> Gestión de Permisos
          </h3>
          <button onClick={onClose} className="p-2 text-brand-gray hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-semi mb-6 flex gap-3">
            <Info className="text-brand-blue shrink-0" size={20} />
            <p className="text-xs text-brand-blue leading-relaxed">
              <strong>Nota:</strong> Los permisos marcados permiten al empleado acceder a funciones específicas. Si una opción está desmarcada, el empleado no podrá ver esa sección o dato en su panel.
            </p>
          </div>

          <div className="space-y-3">
            
            <label className="flex items-start gap-3 p-3 bg-brand-lightGray/50 border border-brand-gray/20 rounded-semi cursor-pointer hover:bg-brand-lightGray transition-colors">
              <input 
                type="checkbox" 
                checked={permisos.puede_ver_inventario}
                onChange={() => handleToggle('puede_ver_inventario')}
                className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <p className="text-sm font-bold text-brand-dark">Ver Inventario / Stock</p>
                <p className="text-[10px] text-brand-gray mt-0.5">Si se desmarca, el empleado no verá la lista de prendas ni stock.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-brand-lightGray/50 border border-brand-gray/20 rounded-semi cursor-pointer hover:bg-brand-lightGray transition-colors">
              <input 
                type="checkbox" 
                checked={permisos.puede_cargar_stock}
                onChange={() => handleToggle('puede_cargar_stock')}
                className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <p className="text-sm font-bold text-brand-dark">Modificar Stock / Cargar Nuevos</p>
                <p className="text-[10px] text-brand-gray mt-0.5">Permite añadir nuevas prendas, editar cantidades y dar de baja artículos.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-brand-lightGray/50 border border-brand-gray/20 rounded-semi cursor-pointer hover:bg-brand-lightGray transition-colors">
              <input 
                type="checkbox" 
                checked={permisos.puede_ver_historial}
                onChange={() => handleToggle('puede_ver_historial')}
                className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <p className="text-sm font-bold text-brand-dark">Ver Historial de Movimientos</p>
                <p className="text-[10px] text-brand-gray mt-0.5">Permite ver el registro de ventas, alquileres y movimientos de caja.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-brand-lightGray/50 border border-brand-gray/20 rounded-semi cursor-pointer hover:bg-brand-lightGray transition-colors">
              <input 
                type="checkbox" 
                checked={permisos.puede_ver_totales_caja}
                onChange={() => handleToggle('puede_ver_totales_caja')}
                className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <p className="text-sm font-bold text-brand-dark">Ver Totales de Dinero en Caja</p>
                <p className="text-[10px] text-brand-gray mt-0.5">Si se desmarca, el empleado verá los movimientos pero NO los totales sumados.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-brand-lightGray/50 border border-brand-gray/20 rounded-semi cursor-pointer hover:bg-brand-lightGray transition-colors">
              <input 
                type="checkbox" 
                checked={permisos.puede_cancelar_ventas}
                onChange={() => handleToggle('puede_cancelar_ventas')}
                className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
              />
              <div>
                <p className="text-sm font-bold text-brand-dark">Cancelar Ventas / Alquileres</p>
                <p className="text-[10px] text-brand-gray mt-0.5">Permite anular operaciones y realizar devoluciones de dinero.</p>
              </div>
            </label>

          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-semi flex items-start gap-2 text-red-600 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button 
            onClick={handleSave} 
            disabled={loading} 
            className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-semi flex items-center justify-center gap-2 transition-colors mt-6"
          >
            {loading ? 'Guardando...' : <><Save size={18} /> Guardar Permisos</>}
          </button>
        </div>

      </div>
    </div>
  )
}
