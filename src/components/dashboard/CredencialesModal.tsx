import React, { useState } from 'react'
import { supabaseAdminAuth } from '../../lib/supabaseSecondary'
import { X, Eye, EyeOff, Save, AlertCircle } from 'lucide-react'

interface CredencialesModalProps {
  empleado: { id: string; nombre: string; email?: string }
  onClose: () => void
}

export const CredencialesModal: React.FC<CredencialesModalProps> = ({ empleado, onClose }) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: _, error: updateError } = await supabaseAdminAuth.auth.admin.updateUserById(
        empleado.id,
        { password: password }
      )
      if (updateError) throw updateError
      
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      console.error(err)
      setError('Error al actualizar: Asegúrate de tener permisos de administrador configurados en Supabase o prueba borrar y recrear el empleado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        
        <div className="bg-brand-black px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye size={20} /> Credenciales
          </h3>
          <button onClick={onClose} className="p-2 text-brand-gray hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-brand-gray mb-6 text-center">
            Modifica la contraseña de acceso de <strong>{empleado.nombre}</strong>. Por seguridad, la contraseña actual está cifrada y no puede visualizarse, solo sobrescribirse.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Email (Usuario)</label>
              <input 
                type="text" 
                value={empleado.email || 'Email no disponible'} 
                disabled
                className="w-full px-3 py-2 bg-brand-lightGray border border-brand-gray/30 rounded-semi text-brand-gray cursor-not-allowed" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1 uppercase tracking-wider">Nueva Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Escribe la nueva contraseña..."
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue pr-10" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-semi flex items-start gap-2 text-red-600 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-semi text-green-600 text-sm font-bold text-center">
              ¡Contraseña actualizada con éxito!
            </div>
          )}

          {!success && (
            <button 
              onClick={handleSave} 
              disabled={loading} 
              className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-semi flex items-center justify-center gap-2 transition-colors mt-6"
            >
              {loading ? 'Guardando...' : <><Save size={18} /> Guardar Nueva Contraseña</>}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
