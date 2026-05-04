import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('straje_email')
    const savedPassword = localStorage.getItem('straje_password')
    if (savedEmail && savedPassword) {
      setEmail(savedEmail)
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (rememberMe) {
      localStorage.setItem('straje_email', email)
      localStorage.setItem('straje_password', password)
    } else {
      localStorage.removeItem('straje_email')
      localStorage.removeItem('straje_password')
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      // El AuthContext detectará el cambio de sesión y nos redirigirá al Dashboard.
    } catch (err: any) {
      console.error(err)
      setError('Credenciales incorrectas o problema de conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-brand-white p-8 rounded-semi shadow-xl">
      <div className="mb-6 text-center">
        <p className="text-brand-gray text-sm mt-1">Ingresa tus credenciales para continuar</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-semi flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brand-dark mb-1">
            Correo Electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors"
            placeholder="ejemplo@correo.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-dark mb-1">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-brand-gray/30 rounded-semi focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors pr-10"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-blue transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-brand-gray/30 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-brand-dark cursor-pointer">
            Recordar mis datos
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary flex justify-center items-center gap-2 mt-6"
        >
          {loading ? (
            <span className="animate-pulse">Verificando...</span>
          ) : (
            <>
              <LogIn size={18} />
              <span>Ingresar</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center pt-4 border-t border-brand-gray/20">
        <p className="text-sm text-brand-dark mb-2">¿No tienes cuenta de negocio?</p>
        <Link to="/registro" className="text-sm font-semibold text-brand-blue hover:text-brand-blueHover">
          Crear Cuenta (30 Días Gratis)
        </Link>
      </div>
    </div>
  )
}
