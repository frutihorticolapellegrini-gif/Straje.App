import { Navigate, Outlet, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { LanguageSelector } from '../components/LanguageSelector'
import { ArrowLeft } from 'lucide-react'

export const AuthLayout = () => {
  const { session, loading } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-lightGray flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-brand-white rounded-semi mb-4 overflow-hidden shadow-lg border border-brand-gray/10">
            <img src="/pwa-icon.png" alt="Straje.App Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-brand-gray font-medium tracking-wide">{t('auth.layout.loading_app')}</div>
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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      {/* Fondo fotográfico */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-fixed"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=1920")' }}
      ></div>
      <div className="absolute inset-0 bg-brand-black/60 backdrop-blur-sm"></div>

      <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center pointer-events-auto">
        <Link to="/" className="flex items-center gap-2 text-brand-black hover:text-brand-blue transition-colors font-bold text-sm uppercase tracking-widest bg-white/90 backdrop-blur-md py-2 px-4 rounded-full shadow-lg border border-white/20">
          <ArrowLeft size={16} /> {t('auth.layout.back_home')}
        </Link>
        <LanguageSelector variant="navbar" />
      </div>

      <div className="w-full max-w-md mt-16 md:mt-12 relative z-10 bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white/30">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-24 h-24 bg-brand-white rounded-semi flex items-center justify-center mb-4 shadow-2xl overflow-hidden border border-brand-gray/10">
            <img src="/pwa-icon.png" alt="Straje.App Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-black text-brand-black mb-2 drop-shadow-sm" style={{ fontFamily: "'Roboto', sans-serif" }}>
            {t('auth.layout.welcome_title')}
          </h2>
          <p className="text-xs text-brand-gray px-4 leading-relaxed max-w-sm">
            {t('auth.layout.welcome_desc')} <br/>
            <span className="font-bold text-brand-black">{t('auth.layout.welcome_happy')}</span> <br/>
            {t('auth.layout.welcome_devices')}
          </p>
        </div>
        
        {/* Renderiza el contenido de Login aquí */}
        <Outlet />
        
      </div>
    </div>
  )
}
