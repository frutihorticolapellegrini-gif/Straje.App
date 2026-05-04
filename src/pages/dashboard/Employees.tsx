import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { supabaseAdminAuth } from '../../lib/supabaseSecondary'
import { useAuth } from '../../context/AuthContext'
import { UserMinus, UserCheck, AlertCircle, Eye, EyeOff, Calendar, List, Shield } from 'lucide-react'
import { CredencialesModal } from '../../components/dashboard/CredencialesModal'
import { PermisosModal } from '../../components/dashboard/PermisosModal'
import { DetalleEmpleadoModal } from '../../components/dashboard/DetalleEmpleadoModal'

interface Empleado {
  id: string
  nombre: string
  activo: boolean
  creado_en: string
  email?: string
  permisos?: any
}

export const Employees = () => {
  const { profile, empresa } = useAuth()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Formulario nuevo empleado
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Modales
  const [modalCredenciales, setModalCredenciales] = useState<{id: string, nombre: string} | null>(null)
  const [modalDetalle, setModalDetalle] = useState<{id: string, nombre: string, fecha?: string} | null>(null)
  const [modalPermisos, setModalPermisos] = useState<{id: string, nombre: string, permisos: any} | null>(null)

  const isEstandar = empresa?.plan === 'estandar'
  const limiteEmpleados = isEstandar ? 3 : Infinity
  const currentCount = empleados.length
  const canAddMore = currentCount < limiteEmpleados

  useEffect(() => {
    fetchEmpleados()
  }, [])

  const fetchEmpleados = async () => {
    if (!profile?.empresa_id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('rol', 'empleado')
        .order('creado_en', { ascending: false })

      if (error) throw error
      setEmpleados(data as Empleado[])
    } catch (err: any) {
      console.error("Fetch Error:", err)
      setError(`Error de carga: ${err.message || 'Desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAddMore) return
    
    setIsCreating(true)
    setError(null)

    try {
      // 1. Alta en Auth usando el cliente silencioso (para no desloguear al dueño)
      const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      const newUserId = authData.user?.id
      if (!newUserId) throw new Error("No se obtuvo ID del nuevo usuario")

      // 2. Crear registro en tabla pública
      const { error: dbError } = await supabase
        .from('usuarios')
        .insert({
          id: newUserId,
          empresa_id: profile?.empresa_id,
          rol: 'empleado',
          nombre: nombre,
          activo: true
        })

      if (dbError) throw dbError

      // Limpiar formulario y recargar
      setNombre('')
      setEmail('')
      setPassword('')
      fetchEmpleados()

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al crear el empleado')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: !currentStatus })
        .eq('id', id)

      if (error) throw error
      fetchEmpleados() // Recargar lista
    } catch (err: any) {
      console.error(err)
      alert("Error al cambiar estado: " + err.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Gestión de Empleados</h2>
          <p className="text-brand-gray">Agrega o suspende a tus vendedores.</p>
        </div>
        
        {isEstandar && (
          <div className="bg-brand-white px-4 py-2 rounded-semi shadow-sm border border-brand-gray/20">
            <span className="text-sm font-bold text-brand-dark">Cupo Estándar: </span>
            <span className={`text-sm font-bold ${currentCount >= limiteEmpleados ? 'text-red-500' : 'text-brand-blue'}`}>
              {currentCount} / {limiteEmpleados}
            </span>
          </div>
        )}
      </header>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-semi flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulario de Alta */}
        <div className="lg:col-span-1">
          <div className="bg-brand-white p-6 rounded-semi shadow-sm border border-brand-gray/10">
            <h3 className="text-lg font-bold text-brand-black mb-4">Nuevo Empleado</h3>
            
            {!canAddMore ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-semi text-orange-700 text-sm">
                Has alcanzado el límite de empleados de tu plan Estándar. Pásate a Premium para agregar más.
              </div>
            ) : (
              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Nombre</label>
                  <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Email (Acceso)</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Contraseña Temporal</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue pr-10" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-blue transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isCreating} className="w-full btn-primary mt-2">
                  {isCreating ? 'Creando...' : 'Crear Empleado'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Lista de Empleados */}
        <div className="lg:col-span-2">
          <div className="bg-brand-white rounded-semi shadow-sm border border-brand-gray/10 overflow-hidden">
            <div className="p-4 border-b border-brand-gray/10 bg-brand-lightGray/50">
              <h3 className="font-bold text-brand-black">Plantilla Actual</h3>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-brand-gray animate-pulse">Cargando empleados...</div>
            ) : empleados.length === 0 ? (
              <div className="p-8 text-center text-brand-gray">No tienes empleados registrados aún.</div>
            ) : (
              <ul className="divide-y divide-brand-gray/10">
                {empleados.map(emp => (
                  <li key={emp.id} className="p-4 flex items-center justify-between hover:bg-brand-lightGray/50 transition-colors">
                    <div>
                      <p className="font-bold text-brand-black">{emp.nombre}</p>
                      <p className="text-xs text-brand-gray mt-1">
                        Registrado: {new Date(emp.creado_en).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3 sm:mt-0 flex-wrap">
                      <button
                        onClick={() => setModalDetalle({ id: emp.id, nombre: emp.nombre, fecha: new Date().toISOString().split('T')[0] })}
                        className="px-3 py-1.5 bg-brand-lightGray hover:bg-brand-gray/20 text-brand-dark rounded-semi text-xs font-bold transition-colors flex items-center gap-1"
                        title="Ver movimientos de hoy"
                      >
                        <List size={14} /> Hoy
                      </button>
                      <button
                        onClick={() => setModalDetalle({ id: emp.id, nombre: emp.nombre })}
                        className="px-3 py-1.5 bg-brand-lightGray hover:bg-brand-gray/20 text-brand-dark rounded-semi text-xs font-bold transition-colors flex items-center gap-1"
                        title="Buscar actividad por fecha"
                      >
                        <Calendar size={14} /> Historial
                      </button>
                      <button
                        onClick={() => setModalCredenciales({ id: emp.id, nombre: emp.nombre })}
                        className="px-3 py-1.5 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue rounded-semi text-xs font-bold transition-colors flex items-center gap-1"
                        title="Cambiar contraseña del empleado"
                      >
                        <Eye size={14} /> Accesos
                      </button>
                      <button
                        onClick={() => setModalPermisos({ id: emp.id, nombre: emp.nombre, permisos: emp.permisos })}
                        className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-semi text-xs font-bold transition-colors flex items-center gap-1"
                        title="Configurar permisos del empleado"
                      >
                        <Shield size={14} /> Permisos
                      </button>

                      <div className="w-px h-6 bg-brand-gray/20 mx-1"></div>

                      {emp.activo ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Activo</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Suspendido</span>
                      )}
                      
                      <button 
                        onClick={() => toggleStatus(emp.id, emp.activo)}
                        title={emp.activo ? "Suspender acceso" : "Restaurar acceso"}
                        className={`p-2 rounded-semi transition-colors ${emp.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        {emp.activo ? <UserMinus size={18} /> : <UserCheck size={18} />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {modalCredenciales && (
        <CredencialesModal 
          empleado={modalCredenciales} 
          onClose={() => setModalCredenciales(null)} 
        />
      )}

      {modalDetalle && (
        <DetalleEmpleadoModal 
          empleado={modalDetalle} 
          fechaInicial={modalDetalle.fecha}
          onClose={() => setModalDetalle(null)} 
        />
      )}

      {modalPermisos && (
        <PermisosModal 
          empleado={modalPermisos}
          onClose={() => setModalPermisos(null)}
          onSave={fetchEmpleados}
        />
      )}
    </div>
  )
}
