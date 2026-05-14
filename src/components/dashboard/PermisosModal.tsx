import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Save, AlertCircle, Shield, Info, LayoutDashboard, LayoutGrid, Calendar, ShoppingCart, DollarSign, MessageCircle, Scissors, Package, Waves, History, BarChart2, Settings, Users } from 'lucide-react'

interface PermisosModalProps {
  empleado: { id: string; nombre: string; permisos?: any }
  onClose: () => void
  onSave: () => void
}

export const PermisosModal: React.FC<PermisosModalProps> = ({ empleado, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estado de todos los módulos del sidebar
  const [permisos, setPermisos] = useState({
    ver_inicio: true,
    ver_disponibilidad: true,
    ver_alquileres: true,
    ver_ventas: true,
    ver_caja: true,
    ver_cuentacorriente: true,
    ver_troqueles: true,
    ver_preparar: true,
    ver_lavanderia: true,
    ver_inventario: true,
    ver_historial_stock: true,
    ver_rentabilidad: false,
    ver_historial_caja: false,
    ver_empleados: false,
    ver_configuracion: false,
    // Permisos de acciones (mantener los anteriores)
    puede_cargar_stock: false,
    puede_cancelar_ventas: false,
    puede_ver_totales_caja: false
  })

  useEffect(() => {
    if (empleado.permisos) {
      setPermisos({
        ver_inicio: empleado.permisos.ver_inicio !== false,
        ver_disponibilidad: empleado.permisos.ver_disponibilidad !== false,
        ver_alquileres: empleado.permisos.ver_alquileres !== false,
        ver_ventas: empleado.permisos.ver_ventas !== false,
        ver_caja: empleado.permisos.ver_caja !== false,
        ver_cuentacorriente: empleado.permisos.ver_cuentacorriente !== false,
        ver_troqueles: empleado.permisos.ver_troqueles !== false,
        ver_preparar: empleado.permisos.ver_preparar !== false,
        ver_lavanderia: empleado.permisos.ver_lavanderia !== false,
        ver_inventario: empleado.permisos.ver_inventario !== false,
        ver_historial_stock: empleado.permisos.ver_historial_stock !== false,
        ver_rentabilidad: !!empleado.permisos.ver_rentabilidad,
        ver_historial_caja: !!empleado.permisos.ver_historial_caja,
        ver_empleados: !!empleado.permisos.ver_empleados,
        ver_configuracion: !!empleado.permisos.ver_configuracion,
        puede_cargar_stock: !!empleado.permisos.puede_cargar_stock,
        puede_cancelar_ventas: !!empleado.permisos.puede_cancelar_ventas,
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

  const PermissionItem = ({ label, icon: Icon, value, onChange, description }: any) => (
    <label className="flex items-start gap-3 p-3 bg-brand-lightGray/50 border border-brand-gray/20 rounded-semi cursor-pointer hover:bg-brand-lightGray transition-colors">
      <input 
        type="checkbox" 
        checked={value}
        onChange={onChange}
        className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-brand-blue" />}
          <p className="text-sm font-bold text-brand-dark">{label}</p>
        </div>
        {description && <p className="text-[9px] text-brand-gray mt-0.5 uppercase font-bold">{description}</p>}
      </div>
    </label>
  )

  return (
    <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[120]">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[90vh]">
        
        <div className="bg-brand-black px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 italic uppercase tracking-tighter">
            <Shield size={20} className="text-brand-blue" /> Gestión de Accesos: {empleado.nombre}
          </h3>
          <button onClick={onClose} className="p-2 text-brand-gray hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-semi mb-6 flex gap-3">
            <Info className="text-brand-blue shrink-0" size={20} />
            <p className="text-xs text-brand-blue leading-relaxed font-bold uppercase">
              Selecciona qué módulos de la barra lateral podrá ver y utilizar este empleado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-brand-gray uppercase tracking-[0.2em] mb-2">Módulos de Operación</h4>
              <PermissionItem label="Inicio / Dashboard" icon={LayoutDashboard} value={permisos.ver_inicio} onChange={() => handleToggle('ver_inicio')} />
              <PermissionItem label="Disponibilidad" icon={LayoutGrid} value={permisos.ver_disponibilidad} onChange={() => handleToggle('ver_disponibilidad')} />
              <PermissionItem label="Alquileres" icon={Calendar} value={permisos.ver_alquileres} onChange={() => handleToggle('ver_alquileres')} />
              <PermissionItem label="Ventas" icon={ShoppingCart} value={permisos.ver_ventas} onChange={() => handleToggle('ver_ventas')} />
              <PermissionItem label="Caja Diaria" icon={DollarSign} value={permisos.ver_caja} onChange={() => handleToggle('ver_caja')} />
              <PermissionItem label="Cuenta Corriente" icon={MessageCircle} value={permisos.ver_cuentacorriente} onChange={() => handleToggle('ver_cuentacorriente')} />
              <PermissionItem label="Troqueles" icon={Scissors} value={permisos.ver_troqueles} onChange={() => handleToggle('ver_troqueles')} />
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-brand-gray uppercase tracking-[0.2em] mb-2">Taller e Inventario</h4>
              <PermissionItem label="Pedidos a Preparar" icon={Package} value={permisos.ver_preparar} onChange={() => handleToggle('ver_preparar')} />
              <PermissionItem label="Lavandería" icon={Waves} value={permisos.ver_lavanderia} onChange={() => handleToggle('ver_lavanderia')} />
              <PermissionItem label="Inventario / Stock" icon={Package} value={permisos.ver_inventario} onChange={() => handleToggle('ver_inventario')} />
              <PermissionItem label="Historial de Stock" icon={History} value={permisos.ver_historial_stock} onChange={() => handleToggle('ver_historial_stock')} />
              
              <h4 className="text-[10px] font-black text-brand-gray uppercase tracking-[0.2em] mt-6 mb-2">Módulos de Dueño</h4>
              <PermissionItem label="Rentabilidad" icon={BarChart2} value={permisos.ver_rentabilidad} onChange={() => handleToggle('ver_rentabilidad')} />
              <PermissionItem label="Historial de Caja" icon={BarChart2} value={permisos.ver_historial_caja} onChange={() => handleToggle('ver_historial_caja')} />
              <PermissionItem label="Empleados" icon={Users} value={permisos.ver_empleados} onChange={() => handleToggle('ver_empleados')} />
              <PermissionItem label="Configuración" icon={Settings} value={permisos.ver_configuracion} onChange={() => handleToggle('ver_configuracion')} />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-brand-gray/10">
            <h4 className="text-[10px] font-black text-brand-gray uppercase tracking-[0.2em] mb-4">Permisos Especiales de Acción</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <PermissionItem label="Cargar / Modificar Stock" description="Añadir nuevas prendas y editar" value={permisos.puede_cargar_stock} onChange={() => handleToggle('puede_cargar_stock')} />
               <PermissionItem label="Cancelar Operaciones" description="Anular ventas y alquileres" value={permisos.puede_cancelar_ventas} onChange={() => handleToggle('puede_cancelar_ventas')} />
               <PermissionItem label="Ver Totales de Dinero" description="Ver sumas totales en caja" value={permisos.puede_ver_totales_caja} onChange={() => handleToggle('puede_ver_totales_caja')} />
            </div>
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
            className="w-full py-4 bg-brand-black hover:bg-brand-gray text-white font-black rounded-semi flex items-center justify-center gap-2 transition-all mt-8 uppercase tracking-widest shadow-xl"
          >
            {loading ? 'Sincronizando...' : <><Save size={18} /> Guardar Configuración de Accesos</>}
          </button>
        </div>

      </div>
    </div>
  )
}
