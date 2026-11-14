import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { LanguageSelector } from '../../components/LanguageSelector'
import { CurrencySelector, useCurrencyState } from '../../components/CurrencySelector'
import { InternationalPaymentModal } from '../../components/InternationalPaymentModal'
import { createMercadoPagoPreference } from '../../services/mercadopago'
import {
  BASE_PRICES_ARS,
  getUserPromoStatus,
  fetchCurrentRatesInARS,
  DEFAULT_RATES_IN_ARS,
  calculateConvertedPrice,
  formatCurrencyAmount,
} from '../../utils/currency'
import type { CurrencyCode } from '../../utils/currency'
import { Settings, Save, Building2, Image as ImageIcon, CheckCircle2, AlertCircle, Key, Zap, CreditCard, MessageCircle, PlayCircle, Plus, Trash2, Sparkles, Clock } from 'lucide-react'

export const Config = () => {
  const { profile, empresa, refreshProfile } = useAuth()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const [userData, setUserData] = useState({
    nombre: '',
    email: '',
    empresa_nombre: '',
    telefono: '',
    direccion: '',
    localidad: '',
    logo_url: '',
    aviso_legal: ''
  })

  const [passwords, setPasswords] = useState({ new_password: '', confirm_password: '' })
  const [videos, setVideos] = useState<any[]>([])
  const [nuevoVideo, setNuevoVideo] = useState({ titulo: '', descripcion: '', url: '' })

  // Punto 2: Multi-Moneda y Pasarela Global
  const { currency, setCurrency } = useCurrencyState()
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES_IN_ARS)
  const [payingPlan, setPayingPlan] = useState<'estandar' | 'premium' | null>(null)
  const [intlModalOpen, setIntlModalOpen] = useState(false)
  const [intlSelectedPlan, setIntlSelectedPlan] = useState<{
    planTitle: string
    planKey: 'estandar' | 'premium'
    amount: number
  } | null>(null)

  useEffect(() => {
    fetchCurrentRatesInARS().then(setRates).catch(() => {})
  }, [])

  // Estado de promoción -50% con contador activo
  const promoStatus = getUserPromoStatus(empresa?.fecha_registro)
  // El beneficio de promo del 50% aplica a las suscripciones activas durante los primeros 6 meses
  // Para entorno de prueba y desarrollo / rol programador, se mantiene siempre activa
  const isProgrammerOrTest = profile?.rol === 'programador' || (empresa?.plan as any) === 'programador'
  const isPromoActive = isProgrammerOrTest || promoStatus.isNewUser

  // Punto 2: Persistencia Total
  useEffect(() => {
    if (profile && empresa) {
      setUserData({
        nombre: profile.nombre || '',
        email: profile.email || '',
        empresa_nombre: empresa.nombre || '',
        telefono: empresa.telefono || '',
        direccion: empresa.direccion || '',
        localidad: empresa.localidad || '',
        logo_url: empresa.logo_url || '',
        aviso_legal: (empresa as any).aviso_legal || ''
      })
    }
  }, [profile, empresa])

  useEffect(() => {
    if (profile?.email === 'prueba_tiendaropa2026@hotmail.com' || profile?.rol === 'programador') {
      supabase.from('videos_tutoriales').select('*').order('fecha_creacion', { ascending: false }).then(({data}) => setVideos(data || []))
    }
  }, [profile])

  const handleGuardarVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoVideo.titulo || !nuevoVideo.url) return
    setLoading(true)
    try {
      const { error } = await supabase.from('videos_tutoriales').insert({
        titulo: nuevoVideo.titulo,
        descripcion: nuevoVideo.descripcion,
        url: nuevoVideo.url,
        usuario_id: profile?.id
      })
      if (error) throw error
      setMsg({ type: 'success', text: 'Video subido correctamente' })
      setNuevoVideo({ titulo: '', descripcion: '', url: '' })
      const { data } = await supabase.from('videos_tutoriales').select('*').order('fecha_creacion', { ascending: false })
      setVideos(data || [])
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleEliminarVideo = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este video?')) return
    try {
      const { error } = await supabase.from('videos_tutoriales').delete().eq('id', id)
      if (error) throw error
      setVideos(videos.filter(v => v.id !== id))
      setMsg({ type: 'success', text: 'Video eliminado' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // Vista previa inmediata
    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    setUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${empresa?.id}-${Date.now()}.${fileExt}`
      const filePath = `logos/${fileName}`
      
      const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file)
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath)
      
      // Actualización en BD (Asegurando ID)
      const { error: dbError } = await supabase.from('empresas').update({ logo_url: publicUrl }).eq('id', empresa?.id)
      if (dbError) throw dbError

      setUserData(prev => ({ ...prev, logo_url: publicUrl }))
      await refreshProfile()
      setMsg({ type: 'success', text: '¡Logo cargado y guardado correctamente!' })
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Error de seguridad al guardar: ' + err.message })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      if (!empresa?.id) throw new Error("ID de empresa no encontrado.")

      // 1. Actualizar Usuario
      const { error: uErr } = await supabase.from('usuarios').update({ 
        nombre: userData.nombre 
      }).eq('id', profile?.id)
      if (uErr) throw uErr
      
      // 2. Actualizar Empresa (RLS Update)
      const { error: eErr } = await supabase.from('empresas').update({
        nombre: userData.empresa_nombre,
        telefono: userData.telefono,
        direccion: userData.direccion,
        localidad: userData.localidad,
        aviso_legal: userData.aviso_legal
      }).eq('id', empresa.id)
      
      if (eErr) {
        console.error("Error RLS Detalle:", eErr)
        throw new Error("Error al guardar en Supabase. Revisa los permisos.")
      }

      await refreshProfile()
      setLocalPreview(null)
      setMsg({ type: 'success', text: '¡Toda la configuración ha sido guardada permanentemente!' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwords.new_password) return
    if (passwords.new_password !== passwords.confirm_password) {
      setMsg({ type: 'error', text: 'Las contraseñas no coinciden.' }); return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new_password })
      if (error) throw error
      setMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setPasswords({ new_password: '', confirm_password: '' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-brand-black flex items-center gap-3 uppercase tracking-tighter italic">
          <Settings className="text-brand-blue" size={32} /> {t('nav.config') || 'Configuración'}
        </h2>
      </header>

      {msg && (
        <div className={`p-4 rounded-semi flex items-center gap-3 text-xs font-black uppercase tracking-wider shadow-lg ${
          msg.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      {/* SELECTOR DE IDIOMA EN CONFIGURACIÓN */}
      <div className="bg-white p-6 sm:p-8 rounded-semi border border-brand-gray/10 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-black text-brand-black uppercase tracking-tight flex items-center gap-2">
            <span className="text-brand-blue">🌐</span> Idioma de la Plataforma
          </h3>
          <p className="text-xs text-brand-gray font-medium mt-1">
            Elige tu idioma preferido. El cambio se aplicará a todas las secciones y se guardará en tu cuenta.
          </p>
        </div>
        <LanguageSelector variant="cards" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <form onSubmit={handleSaveInfo} className="bg-white p-6 sm:p-8 rounded-semi border border-brand-gray/10 shadow-xl space-y-6">
            <h3 className="text-base font-black text-brand-black uppercase tracking-tight flex items-center gap-2 border-b border-brand-gray/10 pb-4">
              <Building2 className="text-brand-blue" size={20} /> Datos de la Empresa
            </h3>

            {/* LOGO */}
            <div>
              <label className="text-xs font-black text-brand-gray uppercase mb-2 block tracking-wider">Logotipo Comercial</label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-brand-lightGray border-2 border-dashed border-brand-gray/20 rounded-semi flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {localPreview || userData.logo_url ? (
                    <img src={localPreview || userData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="text-brand-gray" size={32} />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-brand-black text-white rounded-semi cursor-pointer hover:bg-brand-gray transition-all text-xs font-black uppercase tracking-wider shadow-btn">
                    <ImageIcon size={16} /> Cambiar Logo
                    <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" disabled={uploading} />
                  </label>
                  <p className="text-[9px] text-brand-gray mt-2 font-bold uppercase">Formatos admitidos: PNG, JPG, WEBP. Se mostrará en tus comprobantes y encabezado.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Nombre de la Empresa</label>
                <input type="text" value={userData.empresa_nombre} onChange={e => setUserData({...userData, empresa_nombre: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase text-sm" />
              </div>
              <div>
                <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Nombre del Titular</label>
                <input type="text" value={userData.nombre} onChange={e => setUserData({...userData, nombre: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase text-sm" />
              </div>
              <div>
                <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Teléfono / WhatsApp</label>
                <input type="text" value={userData.telefono} onChange={e => setUserData({...userData, telefono: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase text-sm" />
              </div>
              <div>
                <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Localidad</label>
                <input type="text" value={userData.localidad} onChange={e => setUserData({...userData, localidad: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Dirección</label>
                <input type="text" value={userData.direccion} onChange={e => setUserData({...userData, direccion: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase text-sm" />
              </div>
            </div>

            {/* AVISO LEGAL AL PIE DEL COMPROBANTE */}
            <div className="border-t border-brand-gray/10 pt-4">
              <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Aviso Legal en Comprobantes (Pie de Página)</label>
              <textarea 
                value={userData.aviso_legal} 
                onChange={e => setUserData({...userData, aviso_legal: e.target.value})} 
                placeholder="Ej: Las prendas alquiladas deben devolverse en fecha pactada. Pasadas las 24hs se cobrará recargo por día."
                className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase text-xs h-20 resize-none"
              />
              <p className="text-[9px] text-brand-gray mt-1 font-bold uppercase">Este texto aparecerá en letras pequeñas al final del remito o contrato.</p>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-brand-blue text-white font-black rounded-semi uppercase text-xs tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
              <Save size={18} /> {loading ? 'Guardando Cambios...' : 'Guardar Información'}
            </button>
          </form>

          {/* CAMBIAR CONTRASEÑA */}
          <form onSubmit={handleUpdatePassword} className="bg-white p-6 sm:p-8 rounded-semi border border-brand-gray/10 shadow-xl space-y-6">
            <h3 className="text-base font-black text-brand-black uppercase tracking-tight flex items-center gap-2 border-b border-brand-gray/10 pb-4">
              <Key className="text-brand-blue" size={20} /> Cambiar Contraseña
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-xs font-black text-brand-gray uppercase mb-1 block">Nueva Contraseña</label><input type="password" value={passwords.new_password} onChange={e => setPasswords({...passwords, new_password: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none" placeholder="••••••••" /></div>
              <div><label className="text-xs font-black text-brand-gray uppercase mb-1 block">Confirmar</label><input type="password" value={passwords.confirm_password} onChange={e => setPasswords({...passwords, confirm_password: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none" placeholder="••••••••" /></div>
            </div>
            <button type="submit" className="px-8 py-3 bg-brand-black text-white font-black rounded-semi uppercase text-xs">Actualizar Clave</button>
          </form>

          {/* VIDEOS TUTORIALES (PROGRAMADOR) */}
          {(profile?.email === 'prueba_tiendaropa2026@hotmail.com' || profile?.rol === 'programador') && (
            <div className="bg-white p-6 sm:p-8 rounded-semi border border-brand-gray/10 shadow-xl space-y-6">
              <h3 className="text-base font-black text-brand-black uppercase tracking-tight flex items-center gap-2 border-b border-brand-gray/10 pb-4 text-red-500">
                <PlayCircle size={20} /> Cargar Videos del Sistema (Programador)
              </h3>
              
              <form onSubmit={handleGuardarVideo} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Título del Video</label>
                  <input type="text" value={nuevoVideo.titulo} onChange={e => setNuevoVideo({...nuevoVideo, titulo: e.target.value})} placeholder="Ej: Cómo realizar un alquiler" className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none uppercase text-xs" />
                </div>
                <div>
                  <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Descripción (Opcional)</label>
                  <input type="text" value={nuevoVideo.descripcion} onChange={e => setNuevoVideo({...nuevoVideo, descripcion: e.target.value})} placeholder="Breve resumen de lo que enseña el video" className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none uppercase text-xs" />
                </div>
                <div>
                  <label className="text-xs font-black text-brand-gray uppercase mb-1 block">URL de YouTube o MP4</label>
                  <input type="text" value={nuevoVideo.url} onChange={e => setNuevoVideo({...nuevoVideo, url: e.target.value})} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none text-xs" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-red-500 text-white font-black rounded-semi uppercase text-xs hover:bg-red-600 transition-all shadow-xl flex justify-center items-center gap-2"><Plus size={16}/> Guardar Video</button>
              </form>

              <div className="space-y-3 mt-6">
                <h4 className="text-xs font-black uppercase tracking-widest border-b pb-2 mb-4">Videos Cargados ({videos.length})</h4>
                {videos.map(v => (
                  <div key={v.id} className="flex justify-between items-center bg-white border border-brand-gray/10 p-4 rounded-semi shadow-md">
                    <div>
                      <p className="font-black text-sm uppercase">{v.titulo}</p>
                      <p className="text-[10px] font-bold text-brand-gray truncate max-w-xs">{v.url}</p>
                    </div>
                    <button onClick={() => handleEliminarVideo(v.id)} className="p-2 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-all"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR DERECHO: ESTADO SUSCRIPCIÓN CON ESTILO REFORZADO */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0b0f19] p-6 sm:p-7 rounded-3xl text-white shadow-2xl border border-white/10 relative overflow-hidden">
            <Zap size={90} className="absolute -right-6 -top-6 opacity-5 text-yellow-400 pointer-events-none" />
            
            {/* Header del Bloque con Selector de Moneda */}
            <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-white/10">
              <h4 className="text-xs font-black text-brand-blue uppercase tracking-[0.2em] flex items-center gap-2">
                <Sparkles size={14} className="text-brand-blue" /> Estado Suscripción
              </h4>
              <CurrencySelector
                value={currency}
                onChange={setCurrency}
                className="bg-white/10 border-white/20 text-white text-[11px] py-1 px-2.5 shadow-sm"
              />
            </div>

            {/* BANNER DESTACADO DE LA PROMO -50% CON CONTADOR DE DÍAS */}
            <div className="mb-6 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-blue-500/10 border-2 border-yellow-400/40 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 animate-ping inline-block shrink-0" />
                  <p className="text-sm sm:text-base font-black uppercase text-yellow-300 tracking-wider">
                    PROMO DE BIENVENIDA: -50% OFF
                  </p>
                </div>
                <span className="px-3.5 py-1 rounded-xl bg-yellow-400 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-yellow-500/50">
                  ACTIVA
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium mb-3">
                Válida durante los primeros 6 meses de suscripción para nuevos locales.
              </p>
              <div className="flex items-center justify-between text-xs text-white/90 font-bold uppercase pt-2.5 border-t border-white/10">
                <span className="flex items-center gap-2 text-yellow-400 font-black">
                  <Clock size={15} /> {promoStatus.daysRemaining > 0 ? `${promoStatus.daysRemaining} DÍAS RESTANTES` : 'PERÍODO ACTIVO'}
                </span>
                <span className="text-white/60 text-xs">VENCE: {promoStatus.promoEndDate}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="mb-2">
                <p className="text-[10px] text-white/50 uppercase font-black tracking-widest">Plan Actual</p>
                <p className="text-2xl font-black uppercase italic tracking-tighter text-white">
                  {profile?.email === 'cache_tienda2026@hotmail.com' ? 'Premium' : (empresa?.plan || 'Estándar')}
                </p>
              </div>

              {/* TARJETAS DE PLANES CON PRECIO PROMO Y REGULAR VISIBLES */}
              <div className="space-y-5">
                {/* PLAN ESTÁNDAR: $15.000 PROMO (REGULAR $30.000) */}
                {(() => {
                  const baseArs = isPromoActive ? BASE_PRICES_ARS.estandar.promo : BASE_PRICES_ARS.estandar.regular
                  const converted = calculateConvertedPrice(baseArs, currency, rates)
                  const formatted = formatCurrencyAmount(converted, currency)
                  const regularConverted = calculateConvertedPrice(BASE_PRICES_ARS.estandar.regular, currency, rates)
                  const isCurrent = (empresa?.plan || 'Estándar').toLowerCase() === 'estandar' || (empresa?.plan || 'Estándar').toLowerCase() === 'estándar'

                  return (
                    <div className={`p-5 sm:p-6 rounded-2xl transition-all relative ${
                      isCurrent 
                        ? 'bg-gradient-to-b from-[#141b2d] to-[#0f1523] border border-blue-500/40 shadow-xl shadow-blue-500/5' 
                        : 'bg-[#101524] border border-white/10 hover:border-white/20'
                    }`}>
                      {/* Header del Plan con badge amarillo en tamaño grande destacado */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">Plan Estándar</h5>
                            {isCurrent && (
                              <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                Actual
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/50 font-medium mt-0.5">1 Sucursal comercial · Facturación · Stock</p>
                        </div>
                        <span className="shrink-0 px-4 sm:px-5 py-2 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 text-neutral-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_0_25px_rgba(250,204,21,0.85)] border-2 border-yellow-100 flex items-center justify-center">
                          -50% DESC.
                        </span>
                      </div>

                      {/* Display de precio: TACHADO ARRIBA Y PRECIO FINAL A PAGAR ABAJO EN GRANDE */}
                      <div className="bg-black/60 rounded-2xl p-4 sm:p-5 mb-4 border border-white/10 space-y-3">
                        {/* 1. ARRIBA: Precio real sin promo tachado */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <div>
                            <span className="text-[11px] text-white/50 font-black uppercase tracking-wider block mb-0.5">
                              Precio real sin promo:
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-white/40 line-through decoration-red-500 decoration-[3px] tracking-tight">
                              {formatCurrencyAmount(regularConverted, currency)}
                            </span>
                          </div>
                          <span className="text-[11px] font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase tracking-wide">
                            Valor Regular
                          </span>
                        </div>

                        {/* 2. ABAJO: Monto final a pagar con promo en grande y amarillo */}
                        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
                          <div>
                            <span className="text-xs text-yellow-300 font-black uppercase tracking-wider block mb-1">
                              Monto a pagar con promo:
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl sm:text-4xl font-black text-yellow-400 tracking-tight drop-shadow-[0_2px_14px_rgba(250,204,21,0.5)]">
                                {formatted}
                              </span>
                              <span className="text-sm text-white/70 font-bold">/mes</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-block text-xs sm:text-sm font-black text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-400/40 uppercase tracking-wider shadow-sm">
                              ¡Ahorrás el 50%!
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-white/50 font-medium uppercase gap-1">
                          <span>⭐ Beneficio primeros 6 meses</span>
                          <span>Precio regular posterior: {formatCurrencyAmount(regularConverted, currency)}/mes</span>
                        </div>
                      </div>

                      {/* Botón con texto blanco nítido, borde negro y amplio espacio interior */}
                      <button
                        type="button"
                        disabled={payingPlan !== null}
                        onClick={async () => {
                          if (currency === 'ARS') {
                            try {
                              setPayingPlan('estandar')
                              if (!empresa) return
                              const initPoint = await createMercadoPagoPreference({
                                empresaId: empresa.id,
                                emailEmpresa: profile?.email || '',
                                amount: baseArs,
                                planTitle: `Plan Estándar (Promo 50% - $15.000) - Straje.App`,
                                planType: 'estandar',
                              })
                              if (initPoint) window.open(initPoint, '_blank')
                            } catch (err: any) {
                              alert('Error al conectar con Mercado Pago. Intenta más tarde.')
                            } finally {
                              setPayingPlan(null)
                            }
                          } else {
                            setIntlSelectedPlan({
                              planTitle: `Plan Estándar Promo 50% (-${formatted})`,
                              planKey: 'estandar',
                              amount: converted,
                            })
                            setIntlModalOpen(true)
                          }
                        }}
                        className="w-full py-4 px-6 bg-[#009EE3] hover:bg-[#0089c7] active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-2xl shadow-sky-500/30 transition-all flex items-center justify-center gap-3 border-2 border-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      >
                        <CreditCard size={18} className="text-white drop-shadow" />
                        <span className="text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider">
                          {payingPlan === 'estandar'
                            ? 'Conectando con Mercado Pago...'
                            : currency === 'ARS'
                            ? `Pagar Estándar ($ 15.000 ARS)`
                            : `Pagar Estándar (${formatted})`}
                        </span>
                      </button>
                    </div>
                  )
                })()}

                {/* PLAN PREMIUM: $30.000 PROMO (REGULAR $60.000) */}
                {(() => {
                  const baseArs = isPromoActive ? BASE_PRICES_ARS.premium.promo : BASE_PRICES_ARS.premium.regular
                  const converted = calculateConvertedPrice(baseArs, currency, rates)
                  const formatted = formatCurrencyAmount(converted, currency)
                  const regularConverted = calculateConvertedPrice(BASE_PRICES_ARS.premium.regular, currency, rates)
                  const isCurrent = (empresa?.plan || '').toLowerCase() === 'premium' || profile?.email === 'cache_tienda2026@hotmail.com'

                  return (
                    <div className={`p-5 sm:p-6 rounded-2xl transition-all relative ${
                      isCurrent 
                        ? 'bg-gradient-to-b from-[#141b2d] to-[#0f1523] border border-blue-500/40 shadow-xl shadow-blue-500/5' 
                        : 'bg-[#101524] border border-white/10 hover:border-white/20'
                    }`}>
                      {/* Header del Plan con badge amarillo en tamaño grande destacado */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">Plan Premium</h5>
                            {isCurrent && (
                              <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                Actual
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/50 font-medium mt-0.5">Multi-Sucursal · Depósitos centrales · Roles avanzados</p>
                        </div>
                        <span className="shrink-0 px-4 sm:px-5 py-2 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 text-neutral-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_0_25px_rgba(250,204,21,0.85)] border-2 border-yellow-100 flex items-center justify-center">
                          -50% DESC.
                        </span>
                      </div>

                      {/* Display de precio: TACHADO ARRIBA Y PRECIO FINAL A PAGAR ABAJO EN GRANDE */}
                      <div className="bg-black/60 rounded-2xl p-4 sm:p-5 mb-4 border border-white/10 space-y-3">
                        {/* 1. ARRIBA: Precio real sin promo tachado */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <div>
                            <span className="text-[11px] text-white/50 font-black uppercase tracking-wider block mb-0.5">
                              Precio real sin promo:
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-white/40 line-through decoration-red-500 decoration-[3px] tracking-tight">
                              {formatCurrencyAmount(regularConverted, currency)}
                            </span>
                          </div>
                          <span className="text-[11px] font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase tracking-wide">
                            Valor Regular
                          </span>
                        </div>

                        {/* 2. ABAJO: Monto final a pagar con promo en grande y amarillo */}
                        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
                          <div>
                            <span className="text-xs text-yellow-300 font-black uppercase tracking-wider block mb-1">
                              Monto a pagar con promo:
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl sm:text-4xl font-black text-yellow-400 tracking-tight drop-shadow-[0_2px_14px_rgba(250,204,21,0.5)]">
                                {formatted}
                              </span>
                              <span className="text-sm text-white/70 font-bold">/mes</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-block text-xs sm:text-sm font-black text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-400/40 uppercase tracking-wider shadow-sm">
                              ¡Ahorrás el 50%!
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-white/50 font-medium uppercase gap-1">
                          <span>⭐ Beneficio primeros 6 meses</span>
                          <span>Precio regular posterior: {formatCurrencyAmount(regularConverted, currency)}/mes</span>
                        </div>
                      </div>

                      {/* Botón con texto blanco nítido, borde negro y amplio espacio interior */}
                      <button
                        type="button"
                        disabled={payingPlan !== null}
                        onClick={async () => {
                          if (currency === 'ARS') {
                            try {
                              setPayingPlan('premium')
                              if (!empresa) return
                              const initPoint = await createMercadoPagoPreference({
                                empresaId: empresa.id,
                                emailEmpresa: profile?.email || '',
                                amount: baseArs,
                                planTitle: `Plan Premium (Promo 50% - $30.000) - Straje.App`,
                                planType: 'premium',
                              })
                              if (initPoint) window.open(initPoint, '_blank')
                            } catch (err: any) {
                              alert('Error al conectar con Mercado Pago. Intenta más tarde.')
                            } finally {
                              setPayingPlan(null)
                            }
                          } else {
                            setIntlSelectedPlan({
                              planTitle: `Plan Premium Promo 50% (-${formatted})`,
                              planKey: 'premium',
                              amount: converted,
                            })
                            setIntlModalOpen(true)
                          }
                        }}
                        className="w-full py-4 px-6 bg-[#009EE3] hover:bg-[#0089c7] active:scale-[0.99] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-2xl shadow-sky-500/30 transition-all flex items-center justify-center gap-3 border-2 border-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      >
                        <CreditCard size={18} className="text-white drop-shadow" />
                        <span className="text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider">
                          {payingPlan === 'premium'
                            ? 'Conectando con Mercado Pago...'
                            : currency === 'ARS'
                            ? `Pagar Premium ($ 30.000 ARS)`
                            : `Pagar Premium (${formatted})`}
                        </span>
                      </button>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
          
          {/* BOTÓN SOPORTE TÉCNICO */}
          <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl space-y-4 text-center">
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gray border-b border-brand-gray/10 pb-3">Ayuda y Mantenimiento</h4>
             <a 
               href="https://wa.me/5492392538089" 
               target="_blank" 
               rel="noopener noreferrer"
               className="w-full py-4 bg-[#25D366] text-white font-black rounded-semi uppercase text-[10px] tracking-widest shadow-xl hover:bg-[#1ebd5a] transition-all flex items-center justify-center gap-2"
             >
               <MessageCircle size={18} /> Soporte Técnico
             </a>
             <p className="text-[9px] text-brand-gray font-bold italic uppercase">Contacto directo con desarrollador</p>
          </div>
        </div>
      </div>

      {intlModalOpen && intlSelectedPlan && (
        <InternationalPaymentModal
          isOpen={intlModalOpen}
          onClose={() => setIntlModalOpen(false)}
          currency={currency}
          amount={intlSelectedPlan.amount}
          planTitle={intlSelectedPlan.planTitle}
          planKey={intlSelectedPlan.planKey}
          isNewUser={isPromoActive}
          onSuccess={() => {
            setIntlModalOpen(false)
            refreshProfile()
          }}
        />
      )}
    </div>
  )
}
