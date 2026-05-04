import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { UserPlus, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Register = () => {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    email: '',
    password: '',
    nombreDueno: '',
    telefono: '',
    direccion: '',
    localidad: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError
      const userId = authData.user?.id
      if (!userId) throw new Error("No se pudo obtener el ID del usuario")

      // 2. Crear ID de empresa manual
      const empresaId = crypto.randomUUID()
      
      // Fecha fin de prueba (30 días desde hoy)
      const finPrueba = new Date()
      finPrueba.setDate(finPrueba.getDate() + 30)

      // 3. Registrar Empresa
      const { error: empError } = await supabase
        .from('empresas')
        .insert({
          id: empresaId,
          nombre: formData.nombreEmpresa,
          email_contacto: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          localidad: formData.localidad,
          plan: 'estandar',
          fecha_fin_prueba: finPrueba.toISOString()
        })

      if (empError) throw empError

      // 4. Registrar Usuario Perfil (Dueño)
      const { error: userError } = await supabase
        .from('usuarios')
        .insert({
          id: userId,
          empresa_id: empresaId,
          rol: 'dueño',
          nombre: formData.nombreDueno
        })

      if (userError) throw userError

      // Actualizar el contexto global con el nuevo perfil
      await refreshProfile()

      setSuccess(true)
      
      // Opcional: Redirigir automáticamente después de unos segundos
      setTimeout(() => navigate('/dashboard'), 2000)
      
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al procesar el registro')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-brand-white p-8 rounded-semi shadow-xl text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-4">¡Registro Exitoso!</h2>
        <p className="text-brand-gray mb-6">
          Tu cuenta ha sido creada. Tienes 30 días de prueba gratuita habilitados en el Plan Estándar.
        </p>
        <button onClick={() => navigate('/login')} className="btn-primary w-full">
          Ir a Iniciar Sesión
        </button>
      </div>
    )
  }

  return (
    <div className="bg-brand-white p-8 rounded-semi shadow-xl w-full max-w-lg">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-brand-black">Crea tu Cuenta</h2>
        <p className="text-brand-gray text-sm mt-1">Plan Estándar - 30 Días de Prueba Gratis</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-semi flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} className="flex-shrink-0"/>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Nombre del Negocio</label>
            <input name="nombreEmpresa" type="text" required value={formData.nombreEmpresa} onChange={handleChange}
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Tu Nombre Completo</label>
            <input name="nombreDueno" type="text" required value={formData.nombreDueno} onChange={handleChange}
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Email (Acceso)</label>
            <input name="email" type="email" required value={formData.email} onChange={handleChange}
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <input name="password" type={showPassword ? "text" : "password"} required minLength={6} value={formData.password} onChange={handleChange}
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
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Celular / Teléfono</label>
          <input name="telefono" type="text" required value={formData.telefono} onChange={handleChange}
            className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Dirección</label>
            <input name="direccion" type="text" required value={formData.direccion} onChange={handleChange}
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Localidad</label>
            <input name="localidad" type="text" required value={formData.localidad} onChange={handleChange}
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full btn-accent flex justify-center items-center gap-2 mt-6">
          {loading ? <span className="animate-pulse">Procesando...</span> : <><UserPlus size={18} /><span>Registrar y Comenzar Prueba</span></>}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm text-brand-gray hover:text-brand-blue flex items-center justify-center gap-1">
          <ArrowLeft size={14} /> Volver al Login
        </Link>
      </div>
    </div>
  )
}
