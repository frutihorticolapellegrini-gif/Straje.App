import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { LanguageSelector } from './LanguageSelector'
import { CurrencySelector, useCurrencyState } from './CurrencySelector'
import { InternationalPaymentModal } from './InternationalPaymentModal'
import { 
  BASE_PRICES_ARS, 
  calculateConvertedPrice, 
  formatCurrencyAmount, 
  checkIsNewUser, 
  fetchCurrentRatesInARS, 
  DEFAULT_RATES_IN_ARS 
} from '../utils/currency'
import { 
  AlertTriangle, 
  CreditCard, 
  CheckCircle2, 
  LogOut, 
  Sparkles, 
  ShieldCheck 
} from 'lucide-react'
import { createMercadoPagoPreference } from '../services/mercadopago'

export const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { empresa, profile, signOut, loading, refreshProfile } = useAuth()
  const { t } = useLanguage()
  const { currency, setCurrency } = useCurrencyState()

  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES_IN_ARS)
  const [selectedPlan, setSelectedPlan] = useState<'estandar' | 'premium'>('estandar')
  const [isInternationalModalOpen, setIsInternationalModalOpen] = useState(false)
  const [showPlansBannerModal, setShowPlansBannerModal] = useState(false)
  const [processingMp, setProcessingMp] = useState(false)

  // Cargar cotizaciones actualizadas al montar
  useEffect(() => {
    fetchCurrentRatesInARS().then(r => setRates(r)).catch(() => {})
  }, [])

  // Si está cargando O si aún no tenemos los datos básicos, pantalla de espera
  if (loading || !profile || !empresa) {
    return (
      <div className="fixed inset-0 bg-brand-black flex flex-col items-center justify-center z-[9999] animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-12 h-12 border-4 border-white/10 border-b-white rounded-full animate-spin-reverse"></div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <h2 className="text-white font-black text-2xl tracking-[0.3em] uppercase italic animate-pulse">Straje.App</h2>
          <div className="flex items-center gap-2 justify-center mt-2">
            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    )
  }

  // EXCEPCIÓN ÚNICAMENTE PARA EL PROGRAMADOR
  if (
    profile?.email === 'prueba_tiendaropa2026@hotmail.com' || 
    profile?.rol === 'programador' || 
    empresa?.plan === 'programador'
  ) {
    return <>{children}</>
  }

  // Verificación de días de prueba / expiración
  const today = new Date()
  const finPrueba = empresa?.fecha_fin_prueba ? new Date(empresa.fecha_fin_prueba) : new Date()
  const diffDays = Math.ceil((finPrueba.getTime() - today.getTime()) / (1000 * 3600 * 24))
  const isExpired = !empresa?.activa || diffDays < 0

  // Comprobar si califica como usuario nuevo recién registrado (primeros 6 meses)
  const isProgrammerOrTest = (profile?.rol as string) === 'programador' || (empresa?.plan as string) === 'programador'
  const isNewUser = isProgrammerOrTest || checkIsNewUser(empresa?.fecha_registro)

  // Cálculo de montos en ARS base según reglas de Punto 2
  const estandarARS = isNewUser ? BASE_PRICES_ARS.estandar.promo : BASE_PRICES_ARS.estandar.regular
  const premiumARS = isNewUser ? BASE_PRICES_ARS.premium.promo : BASE_PRICES_ARS.premium.regular
  const regularEstandarARS = BASE_PRICES_ARS.estandar.regular
  const regularPremiumARS = BASE_PRICES_ARS.premium.regular

  // Conversión con redondeo hacia abajo Math.floor
  const estandarAmount = calculateConvertedPrice(estandarARS, currency as any, rates as any)
  const premiumAmount = calculateConvertedPrice(premiumARS, currency as any, rates as any)
  const regularEstandarAmount = calculateConvertedPrice(regularEstandarARS, currency as any, rates as any)
  const regularPremiumAmount = calculateConvertedPrice(regularPremiumARS, currency as any, rates as any)

  const activeAmount = selectedPlan === 'estandar' ? estandarAmount : premiumAmount
  const activeAmountARS = selectedPlan === 'estandar' ? estandarARS : premiumARS
  const activePlanTitle = selectedPlan === 'estandar' ? 'Plan Estándar' : 'Plan Premium'

  const handleMercadoPagoCheckout = async () => {
    setProcessingMp(true)
    try {
      if (!empresa) return
      const initPoint = await createMercadoPagoPreference({
        empresaId: empresa.id,
        emailEmpresa: profile?.email || '',
        amount: activeAmountARS,
        planTitle: `${activePlanTitle} (${isNewUser ? 'Promo 50%' : 'Regular'}) - Straje.App`,
        planType: selectedPlan,
      })
      if (initPoint) {
        window.open(initPoint, '_blank')
      }
    } catch (err: any) {
      alert(t('subscription.mp_error'))
      console.error(err)
    } finally {
      setProcessingMp(false)
    }
  }

  const handleStartPayment = () => {
    if (currency === 'ARS') {
      handleMercadoPagoCheckout()
    } else {
      setIsInternationalModalOpen(true)
    }
  }

  // Render de la interfaz de suscripción (usada tanto en bloqueo como en modal de aviso)
  const renderSubscriptionContent = () => (
    <div className="bg-brand-white p-6 sm:p-8 rounded-[2rem] shadow-2xl max-w-2xl w-full text-center border-t-8 border-brand-blue relative">
      
      {/* SELECTORES DE IDIOMA Y MONEDA */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-brand-gray/10">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase text-brand-gray">Moneda:</span>
          <CurrencySelector value={currency as any} onChange={setCurrency} />
        </div>
        <LanguageSelector variant="navbar" />
      </div>

      <div className="flex justify-center mb-4">
        <div className="bg-blue-50 p-4 rounded-full text-brand-blue shadow-inner">
          <CreditCard size={48} />
        </div>
      </div>
      
      <h1 className="text-2xl sm:text-3xl font-black text-brand-black mb-2 uppercase tracking-tighter">
        {isExpired ? t('subscription.expired_title') : 'Planes de Suscripción Straje.App'}
      </h1>
      <p className="text-brand-gray mb-6 font-medium text-xs sm:text-sm max-w-lg mx-auto">
        {isExpired 
          ? t('subscription.expired_desc')
          : 'Elige tu plan para continuar disfrutando de todas las herramientas de tu tienda.'}
      </p>

      {/* BANNER DE OFERTA EXCLUSIVO PARA USUARIOS NUEVOS (-50%) */}
      {isNewUser ? (
        <div className="mb-6 p-3 sm:p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-pulse">
          <Sparkles size={20} className="shrink-0" />
          <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
            -50% durante los primeros 6 meses de prueba
          </span>
        </div>
      ) : (
        <div className="mb-6 p-2.5 bg-brand-lightGray text-brand-gray rounded-xl text-xs font-bold uppercase tracking-wider">
          Tarifa Regular · Renovación Mensual
        </div>
      )}

      {/* TARJETAS DE PLANES: ESTÁNDAR vs PREMIUM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-left">
        {/* PLAN ESTÁNDAR */}
        <div 
          onClick={() => setSelectedPlan('estandar')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
            selectedPlan === 'estandar' 
              ? 'border-brand-blue bg-blue-50/40 shadow-xl scale-[1.02]' 
              : 'border-brand-gray/20 bg-white hover:border-brand-gray/40'
          }`}
        >
          {selectedPlan === 'estandar' && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-brand-blue text-white rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          )}
          <h3 className="font-black text-base uppercase text-brand-black mb-1">Plan Estándar</h3>
          <div className="my-2">
            {isNewUser && (
              <span className="text-xs text-brand-gray line-through block font-bold">
                {formatCurrencyAmount(regularEstandarAmount, currency as any)}
              </span>
            )}
            <span className="text-2xl font-black text-brand-black">
              {formatCurrencyAmount(estandarAmount, currency as any)}
            </span>
            <span className="text-[10px] text-brand-gray font-bold uppercase ml-1">/ mes</span>
          </div>
          <ul className="text-xs text-brand-gray space-y-1.5 mt-3 pt-3 border-t border-brand-gray/10">
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-500 shrink-0" /> Control de Stock y Ventas</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-500 shrink-0" /> Gestión de Alquileres</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-500 shrink-0" /> Caja Diaria y Cuentas Ctes.</li>
          </ul>
        </div>

        {/* PLAN PREMIUM */}
        <div 
          onClick={() => setSelectedPlan('premium')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
            selectedPlan === 'premium' 
              ? 'border-violet-600 bg-violet-50/50 shadow-xl scale-[1.02]' 
              : 'border-brand-gray/20 bg-white hover:border-brand-gray/40'
          }`}
        >
          <div className="absolute -top-3 left-4 px-2 py-0.5 bg-violet-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
            Recomendado
          </div>
          {selectedPlan === 'premium' && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-violet-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          )}
          <h3 className="font-black text-base uppercase text-brand-black mb-1">Plan Premium</h3>
          <div className="my-2">
            {isNewUser && (
              <span className="text-xs text-brand-gray line-through block font-bold">
                {formatCurrencyAmount(regularPremiumAmount, currency as any)}
              </span>
            )}
            <span className="text-2xl font-black text-violet-700">
              {formatCurrencyAmount(premiumAmount, currency as any)}
            </span>
            <span className="text-[10px] text-brand-gray font-bold uppercase ml-1">/ mes</span>
          </div>
          <ul className="text-xs text-brand-gray space-y-1.5 mt-3 pt-3 border-t border-brand-gray/10">
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-violet-600 shrink-0" /> Todo lo del Plan Estándar</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-violet-600 shrink-0" /> Métricas Avanzadas y Gráficos</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-violet-600 shrink-0" /> Múltiples Empleados y Permisos</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-violet-600 shrink-0" /> Soporte Prioritario WhatsApp</li>
          </ul>
        </div>
      </div>

      {/* BOTÓN DE PAGO SEGÚN MONEDA (ARGENTINA vs EXTERIOR) */}
      <div className="space-y-3">
        {currency === 'ARS' ? (
          <button 
            onClick={handleStartPayment}
            disabled={processingMp}
            className="w-full bg-[#009EE3] hover:bg-[#0089c7] text-white font-black py-4 rounded-2xl transition-all shadow-xl flex justify-center items-center gap-2 text-base uppercase tracking-widest cursor-pointer"
          >
            {processingMp ? (
              <span className="animate-pulse">Conectando con Mercado Pago...</span>
            ) : (
              <>
                <CreditCard size={20} />
                Suscribirme con Mercado Pago ({formatCurrencyAmount(activeAmount, currency as any)})
              </>
            )}
          </button>
        ) : (
          <button 
            onClick={handleStartPayment}
            className="w-full bg-brand-blue hover:bg-blue-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl flex justify-center items-center gap-2 text-base uppercase tracking-widest cursor-pointer"
          >
            <CreditCard size={20} />
            Pagar Internacionalmente ({formatCurrencyAmount(activeAmount, currency as any)})
          </button>
        )}

        <div className="flex items-center justify-center gap-4 text-[10px] text-brand-gray font-bold uppercase pt-1">
          <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-green-500" /> Cancelá cuando quieras</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-brand-blue" /> Activación Inmediata</span>
        </div>

        {isExpired && (
          <button 
            onClick={() => signOut()}
            className="w-full flex justify-center items-center gap-2 text-brand-gray hover:text-brand-black font-black text-xs py-2 uppercase tracking-wider mt-4"
          >
            <LogOut size={16} /> {t('subscription.sign_out_button')}
          </button>
        )}
      </div>

      {/* MODAL DE PAGO INTERNACIONAL */}
      <InternationalPaymentModal
        isOpen={isInternationalModalOpen}
        onClose={() => setIsInternationalModalOpen(false)}
        planTitle={activePlanTitle}
        planKey={selectedPlan}
        amount={activeAmount}
        currency={currency as any}
        isNewUser={isNewUser}
        onSuccess={() => {
          refreshProfile()
        }}
      />
    </div>
  )

  // SI LA CUENTA ESTÁ EXPIRADA / BLOQUEADA
  if (isExpired) {
    return (
      <div className="min-h-screen bg-brand-lightGray flex flex-col items-center justify-center p-4">
        {renderSubscriptionContent()}
      </div>
    )
  }

  // SI AÚN TIENE DÍAS DISPONIBLES: BANNER SUPERIOR CON BOTÓN ACTIVO
  return (
    <>
      {diffDays >= 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-center py-2 px-4 text-xs font-black uppercase tracking-widest flex flex-wrap items-center justify-center gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>
              {profile?.email === 'cache_tienda2026@hotmail.com' 
                ? t('subscription.trial_warning_premium', { days: diffDays })
                : t('subscription.trial_warning', { days: diffDays })
              }
            </span>
          </div>

          <button
            onClick={() => setShowPlansBannerModal(true)}
            className="px-3 py-1 bg-white text-red-600 hover:bg-red-50 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow cursor-pointer flex items-center gap-1"
          >
            <Sparkles size={12} /> Ver Planes {isNewUser ? '(-50%)' : ''}
          </button>
        </div>
      )}

      {/* Modal flotante de planes cuando el usuario hace clic en el banner de advertencia */}
      {showPlansBannerModal && (
        <div className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full">
            <button
              onClick={() => setShowPlansBannerModal(false)}
              className="absolute -top-3 -right-3 w-9 h-9 bg-white text-brand-black rounded-full flex items-center justify-center font-black shadow-2xl z-10 hover:bg-gray-100"
            >
              ✕
            </button>
            {renderSubscriptionContent()}
          </div>
        </div>
      )}

      {children}
    </>
  )
}
