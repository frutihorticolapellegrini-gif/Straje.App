import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const AuthLayout = () => {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-lightGray flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-brand-white rounded-semi mb-4 overflow-hidden shadow-lg border border-brand-gray/10">
            <img src="/pwa-icon.png" alt="Straje.App Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-brand-gray font-medium tracking-wide">Cargando Straje.App...</div>
        </div>
      </div>
    )
  }

  // Si ya hay sesión iniciada y no estamos en registro, redirigir al Dashboard principal
  // (Durante el registro, signUp nos inicia sesión, pero queremos quedarnos para ver el mensaje de éxito)
  if (session && location.pathname !== '/registro') {
    return <Navigate to="/dashboard" replace />
  }

  // Si no hay sesión, mostrar la pantalla de Login (Outlet renderiza Login.tsx)
  return (
    <div className="min-h-screen bg-brand-lightGray flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-24 h-24 bg-brand-white rounded-semi flex items-center justify-center mb-4 shadow-2xl overflow-hidden border border-brand-gray/10">
            <img src="/pwa-icon.png" alt="Straje.App Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-black text-brand-black mb-2 drop-shadow-sm" style={{ fontFamily: "'Roboto', sans-serif" }}>
            Bienvenidos a su tienda virtual
          </h2>
          <p className="text-xs text-brand-gray px-4 leading-relaxed max-w-sm">
            Este programa funciona para facilitar el control de su tienda de ropa tanto para alquiler de traje o vestidos como para control de stock de mercadería, punto de ventas, control de caja diaria y más... <br/>
            <span className="font-bold text-brand-black">¡ESPERO QUE QUEDE FELIZ CON NUESTRO PROGRAMA!</span> <br/>
            Funciona tanto en PC como en celulares.
          </p>
        </div>
        
        {/* Renderiza el contenido de Login aquí */}
        <Outlet />
        
      </div>
    </div>
  )
}
