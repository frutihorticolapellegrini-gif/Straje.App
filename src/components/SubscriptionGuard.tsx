import React from 'react'
import { useAuth } from '../context/AuthContext'
import { AlertTriangle, CreditCard, CheckCircle2, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { empresa, profile, signOut } = useAuth()

  // EXCEPCIÓN PARA EL PROGRAMADOR Y USUARIOS PREMIUM EXISTENTES (Excepto cache_tienda para forzar suscripción en 30 días)
  if (
    profile?.email === 'prueba_tiendaropa2026@hotmail.com' || 
    profile?.rol === 'programador' || 
    empresa?.plan === 'programador' || 
    (empresa?.plan === 'premium' && profile?.email !== 'cache_tienda2026@hotmail.com')
  ) {
    return <>{children}</>
  }

  // Cliente Estándar y Cache Tienda: Verificación de 30 días
  const today = new Date()
  
  let diffDays = 0;
  if (profile?.email === 'cache_tienda2026@hotmail.com') {
    const cacheEndDate = new Date('2026-06-04T00:00:00-03:00'); // 30 días a partir de hoy (05-05-2026)
    diffDays = Math.ceil((cacheEndDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  } else {
    const finPrueba = empresa?.fecha_fin_prueba ? new Date(empresa.fecha_fin_prueba) : new Date();
    diffDays = Math.ceil((finPrueba.getTime() - today.getTime()) / (1000 * 3600 * 24));
  }

  // Si está inactiva o caducó (diffDays <= 0)
  if (!empresa?.activa || diffDays < 0) {
    return (
      <div className="min-h-screen bg-brand-lightGray flex flex-col items-center justify-center p-4">
        <div className="bg-brand-white p-8 rounded-semi shadow-xl max-w-lg w-full text-center border-t-8 border-red-500">
          
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 p-6 rounded-full text-red-600 shadow-inner">
              <AlertTriangle size={64} />
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-brand-black mb-2 uppercase tracking-tighter">Acceso Restringido</h1>
          <p className="text-brand-gray mb-8 font-medium">
            Tu periodo de prueba de 30 días o tu suscripción mensual ha finalizado. Para seguir utilizando <strong>Straje.App</strong>, por favor activa tu suscripción.
          </p>

          <div className="bg-brand-lightGray border border-brand-gray/10 p-6 rounded-semi mb-8 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest">Vencido</div>
            <h3 className="font-bold text-brand-black flex items-center gap-2 mb-3">
              <CreditCard size={18} className="text-brand-blue" /> 
              {profile?.email === 'cache_tienda2026@hotmail.com' ? 'Plan Premium Especial' : 'Plan Estándar'}
            </h3>
            <ul className="text-sm text-brand-gray space-y-2 list-none">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /> Renovación automática</li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" /> 
                {profile?.email === 'cache_tienda2026@hotmail.com'
                  ? 'Suscripción Premium: $80.000/mes · Débito automático Mercado Pago'
                  : 'Valor: $40.000 / mes'}
              </li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /> Soporte incluido</li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={async () => {
                try {
                  if (!empresa) return;
                  const { data, error } = await supabase.functions.invoke('mercadopago-create-preference', {
                    body: { 
                      empresa_id: empresa.id,
                      email_empresa: profile?.email || ''
                    }
                  });
                  
                  if (error) throw error;
                  
                  if (data?.init_point) {
                    window.open(data.init_point, '_blank');
                  }
                } catch (err: any) {
                  alert('Error al conectar con Mercado Pago. Por favor intenta más tarde.');
                  console.error(err);
                }
              }}
              className="w-full bg-[#009EE3] hover:bg-[#0089c7] text-white font-bold py-4 rounded-semi transition-all shadow-lg flex justify-center items-center gap-2 text-lg"
            >
              <CreditCard size={20} />
              Suscribirse y Activar Cuenta
            </button>
            
            <button 
              onClick={() => signOut()}
              className="w-full flex justify-center items-center gap-2 text-brand-gray hover:text-brand-black font-medium text-sm py-2"
            >
              <LogOut size={16} /> Salir de la cuenta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {diffDays >= 0 && (
        <div className="bg-red-500 text-white text-center py-2 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <AlertTriangle size={14} />
          {profile?.email === 'cache_tienda2026@hotmail.com' 
            ? `Atención: Quedan ${diffDays} días para activar tu Suscripción Premium obligatoria.`
            : `Prueba de sistema: Quedan ${diffDays} días para que tu cuenta sea bloqueada. ¡Suscríbete ahora!`
          }
        </div>
      )}
      {children}
    </>
  )
}
