import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart2,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Zap,
  Smartphone,
  ChevronRight,
  Sparkles,
  Check,
  Building2,
  Scissors,
  Shirt,
  CalendarCheck,
  Coins,
  ArrowRight,
  Globe2,
  Lock,
  HeartHandshake,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { LanguageSelector } from '../components/LanguageSelector'
import { CurrencySelector, useCurrencyState } from '../components/CurrencySelector'
import {
  BASE_PRICES_ARS,
  calculateConvertedPrice,
  formatCurrencyAmount,
  fetchCurrentRatesInARS,
  DEFAULT_RATES_IN_ARS,
} from '../utils/currency'
import type { CurrencyCode } from '../utils/currency'

// Imágenes de stock de Unsplash para la identidad visual
const FASHION_IMAGES = [
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1550614000-4b95d466f272?auto=format&fit=crop&q=80&w=800',
]

const ANALYTICS_IMAGES = [
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800',
]

export const Landing = () => {
  const { t } = useLanguage()
  const [currentFashionIdx, setCurrentFashionIdx] = useState(0)
  const [currentAnalyticsIdx, setCurrentAnalyticsIdx] = useState(0)

  // Selector Multi-Moneda y Tasas para sección de Planes
  const { currency, setCurrency } = useCurrencyState()
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES_IN_ARS)

  useEffect(() => {
    fetchCurrentRatesInARS().then(setRates).catch(() => {})
  }, [])

  // Carruseles automáticos
  useEffect(() => {
    const timer1 = setInterval(() => {
      setCurrentFashionIdx((prev) => (prev + 1) % FASHION_IMAGES.length)
    }, 3000)

    const timer2 = setInterval(() => {
      setCurrentAnalyticsIdx((prev) => (prev + 1) % ANALYTICS_IMAGES.length)
    }, 3500)

    return () => {
      clearInterval(timer1)
      clearInterval(timer2)
    }
  }, [])

  // Precios convertidos para la landing con promo 50%
  const estandarPromoConverted = calculateConvertedPrice(BASE_PRICES_ARS.estandar.promo, currency, rates)
  const estandarRegularConverted = calculateConvertedPrice(BASE_PRICES_ARS.estandar.regular, currency, rates)
  const premiumPromoConverted = calculateConvertedPrice(BASE_PRICES_ARS.premium.promo, currency, rates)
  const premiumRegularConverted = calculateConvertedPrice(BASE_PRICES_ARS.premium.regular, currency, rates)

  return (
    <div className="min-h-screen bg-white font-sans text-brand-black selection:bg-brand-blue selection:text-white flex flex-col">
      {/* NAVBAR FIJA */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-md border-b border-brand-gray/20 z-50 flex items-center justify-between px-6 lg:px-12 shadow-sm">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-black rounded-lg overflow-hidden flex items-center justify-center p-1">
            <img src="/pwa-icon.png" alt="Straje.App Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-black uppercase tracking-tighter italic">Straje.App</span>
        </Link>
        <div className="flex flex-row items-center gap-2 md:gap-4">
          <LanguageSelector variant="navbar" />
          <Link
            to="/login"
            className="text-[10px] md:text-sm font-black text-brand-gray hover:text-brand-black transition-colors whitespace-nowrap px-2 py-1"
          >
            {t('landing.nav.login')}
          </Link>
          <Link
            to="/registro"
            className="bg-brand-blue text-white px-3 md:px-6 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-500/30 whitespace-nowrap"
          >
            {t('landing.nav.register')}
          </Link>
        </div>
      </nav>

      {/* HERO SECTION CON FONDO */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 px-6 lg:px-12 overflow-hidden">
        {/* Imagen de fondo Hero */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-fixed"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&q=80&w=1920")' }}
        />
        {/* Overlay para suavizar la foto */}
        <div className="absolute inset-0 bg-brand-lightGray/70 backdrop-blur-sm" />

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative z-10 bg-white/95 backdrop-blur-xl p-6 sm:p-10 lg:p-14 rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl border border-white/60">
          <div className="flex-1 space-y-6 lg:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-brand-blue rounded-full text-xs font-black uppercase tracking-widest border border-blue-100 shadow-sm">
              <Zap size={14} className="text-brand-blue animate-pulse" /> {t('landing.hero.badge')}
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05] uppercase">
              {t('landing.hero.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-purple-600 italic py-1 pr-2 inline-block">
                {t('landing.hero.title_gradient')}
              </span>
            </h2>
            <p className="text-base sm:text-lg text-brand-gray font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link
                to="/registro"
                className="w-full sm:w-auto bg-brand-black text-white px-8 py-4 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-2xl flex items-center justify-center gap-2 group"
              >
                {t('landing.hero.try_free')}{' '}
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://wa.me/5492392538089"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto bg-[#25D366] text-white px-8 py-4 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-[#1ebd5a] transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} /> {t('landing.hero.consult_whatsapp')}
              </a>
            </div>
            <p className="text-xs text-brand-gray/70 font-bold uppercase tracking-widest pt-2">
              {t('landing.hero.no_card')}
            </p>
          </div>

          {/* HERO CAROUSEL */}
          <div className="flex-1 w-full relative h-[360px] sm:h-[420px] lg:h-[540px] rounded-[2rem] overflow-hidden shadow-2xl shadow-brand-black/20">
            {FASHION_IMAGES.map((img, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 w-full h-full bg-cover bg-center bg-brand-lightGray transition-opacity duration-1000 ${
                  idx === currentFashionIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                }`}
                style={{ backgroundImage: `url("${img}")` }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-blue bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                  Software Especializado
                </span>
                <p className="text-white font-black text-xl sm:text-2xl uppercase tracking-widest mt-2">
                  {t('landing.hero.carousel_caption')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN MÓDULOS Y VALOR AGREGADO */}
      <section className="py-20 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-blue">
              Ecosistema Integral de Gestión
            </span>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight">
              Diseñado exclusivamente para el rubro indumentaria
            </h3>
            <p className="text-brand-gray text-base font-medium">
              A diferencia de sistemas genéricos de facturación, Straje.App resuelve las necesidades reales y los dolores de cabeza cotidianos de tiendas de ropa, alquileres de trajes y vestidos de fiesta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-brand-lightGray/70 border border-brand-gray/15 hover:border-brand-blue/50 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-brand-blue flex items-center justify-center">
                <Shirt size={24} />
              </div>
              <h4 className="text-lg font-black uppercase">Alquileres con Señas y Garantías</h4>
              <p className="text-sm text-brand-gray leading-relaxed font-medium">
                Control de fechas de retiro y devolución, estado de señas, depósitos en garantía, remitos troquelados y gestión de prendas pendientes de entrega.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-lightGray/70 border border-brand-gray/15 hover:border-brand-blue/50 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Scissors size={24} />
              </div>
              <h4 className="text-lg font-black uppercase">Lavandería y Tintorería</h4>
              <p className="text-sm text-brand-gray leading-relaxed font-medium">
                Flujo directo de prendas que entran sucias tras un alquiler, tiempos estimados de lavado y reingreso automático al stock disponible.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-lightGray/70 border border-brand-gray/15 hover:border-brand-blue/50 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CalendarCheck size={24} />
              </div>
              <h4 className="text-lg font-black uppercase">Matriz de Disponibilidad</h4>
              <p className="text-sm text-brand-gray leading-relaxed font-medium">
                Verificá al instante si un talle o modelo específico está alquilado o libre para cualquier fin de semana o evento futuro. Sin dobles reservas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-lightGray/70 border border-brand-gray/15 hover:border-brand-blue/50 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Coins size={24} />
              </div>
              <h4 className="text-lg font-black uppercase">Caja Diaria y Cuentas Corrientes</h4>
              <p className="text-sm text-brand-gray leading-relaxed font-medium">
                Apertura y cierre de caja ciego o detallado por empleado, arqueos, múltiples medios de cobro y saldos adeudados de clientes recurrentes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-lightGray/70 border border-brand-gray/15 hover:border-brand-blue/50 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <h4 className="text-lg font-black uppercase">Multi-Sucursal y Depósitos</h4>
              <p className="text-sm text-brand-gray leading-relaxed font-medium">
                Sincronizá el stock de todas tus sucursales y depósitos en tiempo real desde un único panel administrativo con roles de acceso protegidos.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-lightGray/70 border border-brand-gray/15 hover:border-brand-blue/50 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                <HeartHandshake size={24} />
              </div>
              <h4 className="text-lg font-black uppercase">Soporte Directo con Desarrollador</h4>
              <p className="text-sm text-brand-gray leading-relaxed font-medium">
                Sin bots ni tickets eternos. Hablás directamente por WhatsApp con el creador del programa para despejar dudas o implementar mejoras inmediatas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES MIDDLE SECTION CON FONDO FOTOGRÁFICO DESENFOCADO */}
      <section className="relative py-24 px-6 lg:px-12 border-y border-brand-gray/20 overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-fixed"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=1920")' }}
        />
        <div className="absolute inset-0 bg-brand-black/75 backdrop-blur-sm" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 bg-white/10 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-2xl">
            <h3 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-white">
              {t('landing.features.title')}
              <br />
              {t('landing.features.title_sub')}
            </h3>
            <p className="text-white/90 font-medium text-base sm:text-lg">{t('landing.features.description')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { icon: <Smartphone />, title: t('landing.features.card1_title'), desc: t('landing.features.card1_desc') },
              { icon: <BarChart2 />, title: t('landing.features.card2_title'), desc: t('landing.features.card2_desc') },
              { icon: <ShieldCheck />, title: t('landing.features.card3_title'), desc: t('landing.features.card3_desc') },
              { icon: <PlayCircle />, title: t('landing.features.card4_title'), desc: t('landing.features.card4_desc') },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 hover:-translate-y-2 transition-transform duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="bg-brand-blue/10 w-16 h-16 rounded-2xl flex items-center justify-center text-brand-blue mb-6">
                    {React.cloneElement(feature.icon as any, { size: 32 })}
                  </div>
                  <h4 className="text-xl font-black uppercase mb-3 text-brand-black">{feature.title}</h4>
                  <p className="text-brand-gray text-sm leading-relaxed font-medium">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALYTICS SECTION */}
      <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16">
        <div className="flex-1 w-full relative h-[360px] sm:h-[420px] rounded-[2rem] overflow-hidden shadow-2xl shadow-brand-blue/10">
          {ANALYTICS_IMAGES.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 w-full h-full bg-cover bg-center bg-brand-lightGray transition-opacity duration-1000 ${
                idx === currentAnalyticsIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
              style={{ backgroundImage: `url("${img}")` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/90 to-transparent flex items-end p-8">
            <p className="text-white font-black text-xl sm:text-2xl uppercase tracking-widest">
              {t('landing.analytics.carousel_caption')}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-6 text-center lg:text-left">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-blue">
            Rentabilidad y Contabilidad
          </span>
          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-tight">
            {t('landing.analytics.title')}
          </h3>
          <p className="text-brand-gray text-base sm:text-lg font-medium leading-relaxed">
            {t('landing.analytics.description')}
          </p>
          <ul className="space-y-4 text-left inline-block lg:block">
            {[t('landing.analytics.point1'), t('landing.analytics.point2'), t('landing.analytics.point3')].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-brand-black font-bold text-sm sm:text-base">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  ✓
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECCIÓN DE PLANES CON SELECTOR DE MONEDA / PAÍS (PUNTO 3)      */}
      {/* ============================================================== */}
      <section id="planes" className="py-24 px-6 lg:px-12 bg-gradient-to-b from-brand-lightGray to-white border-t border-brand-gray/20">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header de Sección con Selector de Moneda */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-brand-gray/20 pb-8">
            <div className="text-center lg:text-left space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-black uppercase tracking-widest">
                <Sparkles size={14} /> Precios Transparentes y Adaptados
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight">
                Elegí el plan ideal para tu tienda
              </h3>
              <p className="text-brand-gray text-sm sm:text-base font-medium max-w-2xl">
                Comenzá con <strong>30 días gratis</strong>. Luego disfrutá de un <strong>50% de descuento durante los primeros 6 meses</strong> de prueba en tu moneda local.
              </p>
            </div>

            {/* Selector de Moneda y País */}
            <div className="flex flex-col items-center lg:items-end gap-2 bg-white p-4 rounded-2xl shadow-lg border border-brand-gray/20">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-gray flex items-center gap-1.5">
                <Globe2 size={14} className="text-brand-blue" /> Tu Moneda Local
              </span>
              <CurrencySelector
                value={currency}
                onChange={setCurrency}
                className="bg-brand-lightGray border-brand-gray/30 text-brand-black text-xs font-bold py-2 px-4 shadow-sm"
              />
            </div>
          </div>

          {/* Banner Promo 50% */}
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-brand-blue text-white p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-yellow-300 animate-pulse" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-black uppercase tracking-wide">
                  -50% durante los primeros 6 meses de prueba
                </p>
                <p className="text-xs text-white/90 font-medium">
                  Beneficio exclusivo para nuevas tiendas registradas. Sin costos de instalación ni comisiones por venta.
                </p>
              </div>
            </div>
            <Link
              to="/registro"
              className="px-6 py-2.5 bg-white text-brand-black hover:bg-brand-lightGray rounded-full text-xs font-black uppercase tracking-widest shadow-md transition-all whitespace-nowrap"
            >
              Reclamar Descuento
            </Link>
          </div>

          {/* Cards de Planes Comparativos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* PLAN ESTÁNDAR */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border-2 border-brand-gray/15 hover:border-brand-blue/50 transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      Ideal 1 Sucursal
                    </span>
                    <h4 className="text-2xl sm:text-3xl font-black uppercase mt-2">Plan Estándar</h4>
                    <p className="text-xs text-brand-gray font-medium mt-1">
                      Todo lo necesario para digitalizar y ordenar tu local de ropa o alquiler.
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg border border-emerald-200">
                    -50% OFF
                  </div>
                </div>

                {/* Precios convertidos */}
                <div className="p-5 rounded-2xl bg-brand-lightGray border border-brand-gray/15 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-brand-black tracking-tight">
                      {formatCurrencyAmount(estandarPromoConverted, currency)}
                    </span>
                    <span className="text-xs font-bold text-brand-gray uppercase">/mes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-gray/60 line-through">
                      {formatCurrencyAmount(estandarRegularConverted, currency)}
                    </span>
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Promo primeros 6 meses
                    </span>
                  </div>
                  <p className="text-[10px] text-brand-gray font-medium pt-1">
                    Precio regular posterior: {formatCurrencyAmount(estandarRegularConverted, currency)}/mes
                  </p>
                </div>

                {/* Lista de características */}
                <ul className="space-y-3 text-xs sm:text-sm text-brand-black font-semibold">
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-emerald-500 shrink-0" />
                    <span><strong>1 Sucursal comercial</strong> completa</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-emerald-500 shrink-0" />
                    <span>Control de <strong>Alquileres, Señas y Devoluciones</strong></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-emerald-500 shrink-0" />
                    <span>Punto de Ventas de indumentaria y accesorios</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-emerald-500 shrink-0" />
                    <span>Caja diaria, Cuentas corrientes y Arqueos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-emerald-500 shrink-0" />
                    <span>Módulo de <strong>Lavandería y Tintorería</strong></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-emerald-500 shrink-0" />
                    <span>Videos explicativos y tutoriales paso a paso</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-emerald-500 shrink-0" />
                    <span>Soporte técnico directo vía WhatsApp</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/registro"
                  className="w-full py-4 bg-brand-black text-white hover:bg-brand-blue font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-blue-500/20"
                >
                  Comenzar con Plan Estándar <ArrowRight size={16} />
                </Link>
                <p className="text-[10px] text-center text-brand-gray font-bold uppercase tracking-widest mt-2">
                  30 días de prueba gratis incluidos
                </p>
              </div>
            </div>

            {/* PLAN PREMIUM */}
            <div className="bg-brand-black text-white rounded-3xl p-8 sm:p-10 shadow-2xl border-4 border-brand-blue relative overflow-hidden flex flex-col justify-between group">
              <div className="absolute top-0 right-0 bg-brand-blue text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-md">
                Más Elegido por Cadenas
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-blue bg-white/10 px-3 py-1 rounded-full">
                    Multi-Sucursal & Avanzado
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-black uppercase mt-2 text-white">Plan Premium</h4>
                  <p className="text-xs text-white/60 font-medium mt-1">
                    Para negocios con varias sucursales, depósitos o estructura con múltiples empleados.
                  </p>
                </div>

                {/* Precios convertidos */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-brand-blue tracking-tight">
                      {formatCurrencyAmount(premiumPromoConverted, currency)}
                    </span>
                    <span className="text-xs font-bold text-white/50 uppercase">/mes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40 line-through">
                      {formatCurrencyAmount(premiumRegularConverted, currency)}
                    </span>
                    <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      Promo primeros 6 meses
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 font-medium pt-1">
                    Precio regular posterior: {formatCurrencyAmount(premiumRegularConverted, currency)}/mes
                  </p>
                </div>

                {/* Lista de características */}
                <ul className="space-y-3 text-xs sm:text-sm text-white/90 font-semibold">
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-brand-blue shrink-0" />
                    <span><strong>Múltiples Sucursales</strong> físicas ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-brand-blue shrink-0" />
                    <span><strong>Control de Depósitos Centrales</strong> y transferencias</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-brand-blue shrink-0" />
                    <span>Usuarios y <strong>Roles avanzados de empleados</strong></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-brand-blue shrink-0" />
                    <span>Matriz global de Disponibilidad de prendas y trajes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-brand-blue shrink-0" />
                    <span>Reportes avanzados de rentabilidad neta por sucursal</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-brand-blue shrink-0" />
                    <span><strong>Soporte Prioritario VIP</strong> directo por WhatsApp</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={18} className="text-brand-blue shrink-0" />
                    <span>Todas las funciones del Plan Estándar incluidas</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/registro"
                  className="w-full py-4 bg-brand-blue hover:bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-2"
                >
                  Comenzar con Plan Premium <ArrowRight size={16} />
                </Link>
                <p className="text-[10px] text-center text-white/40 font-bold uppercase tracking-widest mt-2">
                  30 días de prueba gratis incluidos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-brand-black text-white py-24 px-6 text-center border-t border-brand-gray/20">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter italic">{t('landing.cta.title')}</h2>
          <p className="text-lg sm:text-xl text-brand-gray font-medium">{t('landing.cta.subtitle')}</p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <a
              href="https://wa.me/5492392538089"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-black uppercase tracking-widest rounded-full shadow-2xl transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle size={20} /> {t('landing.cta.whatsapp_btn')}
            </a>
            <Link
              to="/registro"
              className="w-full sm:w-auto px-8 py-4 bg-white text-brand-black hover:bg-brand-lightGray font-black uppercase tracking-widest rounded-full shadow-2xl transition-all"
            >
              {t('landing.cta.try_btn')}
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FOOTER ENRIQUECIDO CON MEDIOS DE PAGO Y POLÍTICAS (PUNTO 3)    */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-brand-gray/15 py-16 px-6 lg:px-12 text-center lg:text-left relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Columna 1: Identidad */}
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <div className="w-8 h-8 bg-brand-black rounded flex items-center justify-center p-1">
                  <img src="/pwa-icon.png" alt="Straje.App Logo" className="w-full h-full object-contain filter invert" />
                </div>
                <h4 className="text-xl font-black uppercase tracking-tighter italic">Straje.App</h4>
              </div>
              <p className="text-brand-gray text-xs sm:text-sm font-medium leading-relaxed max-w-sm mx-auto lg:mx-0">
                {t('landing.footer.description')}
              </p>
              <p className="text-[11px] text-brand-gray font-bold">
                Plataforma de software como servicio (SaaS) optimizada para web y dispositivos móviles (PWA).
              </p>
            </div>

            {/* Columna 2: Contacto */}
            <div className="space-y-4">
              <h5 className="font-black uppercase tracking-widest text-xs text-brand-black">{t('landing.footer.contact_title')}</h5>
              <ul className="text-xs sm:text-sm text-brand-gray space-y-2.5 font-medium">
                <li>
                  Email:{' '}
                  <a href="mailto:LEAN04_23@HOTMAIL.COM" className="hover:text-brand-blue font-bold">
                    LEAN04_23@HOTMAIL.COM
                  </a>
                </li>
                <li>
                  WhatsApp:{' '}
                  <a href="https://wa.me/5492392538089" target="_blank" rel="noreferrer" className="text-[#25D366] font-bold">
                    +54 9 2392 538089
                  </a>
                </li>
                <li>Horario: Lunes a Sábados 08:00 - 20:00</li>
              </ul>
            </div>

            {/* Columna 3: Información y Políticas Legales */}
            <div className="space-y-4">
              <h5 className="font-black uppercase tracking-widest text-xs text-brand-black">Políticas y Legalidad</h5>
              <ul className="text-xs sm:text-sm text-brand-gray space-y-2.5 font-medium">
                <li>
                  <Link to="/privacidad" className="hover:text-brand-blue underline font-bold">
                    Políticas de Privacidad (ARCO/GDPR)
                  </Link>
                </li>
                <li>
                  <Link to="/terminos" className="hover:text-brand-blue underline font-bold">
                    Términos y Condiciones de Uso
                  </Link>
                </li>
                <li>
                  <Link to="/reembolsos" className="hover:text-brand-blue underline font-bold">
                    Garantía y Política de Reembolso
                  </Link>
                </li>
                <li>{t('landing.footer.dev_name')}</li>
                <li>{t('landing.footer.dev_location')}</li>
              </ul>
            </div>

            {/* Columna 4: Medios de Pago Aceptados */}
            <div className="space-y-4">
              <h5 className="font-black uppercase tracking-widest text-xs text-brand-black">Medios de Pago Aceptados</h5>
              <div className="space-y-2 text-xs text-brand-gray">
                <p className="font-bold text-brand-black">Argentina:</p>
                <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start">
                  <span className="px-2 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded font-black text-[10px]">
                    Mercado Pago
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                    Débito / Crédito
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                    Transferencia CVU
                  </span>
                </div>

                <p className="font-bold text-brand-black pt-2">Internacional:</p>
                <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-black text-[10px]">
                    Visa
                  </span>
                  <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded font-black text-[10px]">
                    Mastercard
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                    Tarjeta Débito / Crédito
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-brand-gray/70 pt-1 flex items-center justify-center lg:justify-start gap-1">
                <Lock size={12} className="text-emerald-600" /> Transacciones seguras con cifrado SSL 256-bit
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-brand-gray/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-brand-gray/60 uppercase tracking-widest text-center sm:text-left">
            <div>© {new Date().getFullYear()} Straje.App. {t('landing.footer.rights')}</div>
            <div className="flex items-center gap-4 text-[10px]">
              <Link to="/privacidad" className="hover:text-brand-black">Privacidad</Link>
              <span>·</span>
              <Link to="/terminos" className="hover:text-brand-black">Términos</Link>
              <span>·</span>
              <Link to="/reembolsos" className="hover:text-brand-black">Reembolsos</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
