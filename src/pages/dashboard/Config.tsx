import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Settings, Save, Building2, Image as ImageIcon, CheckCircle2, AlertCircle, Key, RefreshCw, Zap, CreditCard, MessageCircle } from 'lucide-react'

export const Config = () => {
  const { profile, empresa, refreshProfile } = useAuth()
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
      // No limpiamos el localPreview inmediatamente para que no parpadee
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
      
      // 2. Actualizar Empresa (Aquí es donde suele fallar por RLS)
      const { error: eErr } = await supabase.from('empresas').update({
        nombre: userData.empresa_nombre,
        telefono: userData.telefono,
        direccion: userData.direccion,
        localidad: userData.localidad,
        aviso_legal: userData.aviso_legal
      }).eq('id', empresa.id)
      
      if (eErr) {
        console.error("Error RLS Detalle:", eErr)
        throw new Error("Faltan permisos en Supabase (RLS Update Policy). Revisa las instrucciones abajo.")
      }

      await refreshProfile()
      setLocalPreview(null) // Limpiamos preview porque ya se guardó la real
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
      setMsg({ type: 'success', text: 'Contraseña actualizada.' })
      setPasswords({ new_password: '', confirm_password: '' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-brand-black flex items-center gap-3 uppercase tracking-tighter italic">
          <Settings className="text-brand-blue" size={32} /> Configuración de Tienda
        </h2>
        <p className="text-brand-gray font-bold text-sm uppercase tracking-widest mt-1">Identidad de marca y parámetros generales.</p>
      </header>

      {msg && (
        <div className={`p-5 rounded-semi flex items-center gap-3 font-black uppercase text-sm tracking-widest border-2 shadow-xl animate-in slide-in-from-top-2 duration-300 ${
          msg.type === 'success' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <div className="flex flex-col">
            <span>{msg.text}</span>
            {msg.type === 'error' && msg.text.includes('RLS') && (
              <span className="text-[10px] lowercase font-bold mt-1 opacity-70 italic">Debes habilitar la política "UPDATE" en la tabla 'empresas' desde tu panel de Supabase.</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSaveInfo} className="bg-white p-8 rounded-semi shadow-2xl border border-brand-gray/10 space-y-8 relative overflow-hidden">
            <div className="flex items-center gap-3 border-b pb-4"><Building2 size={24} className="text-brand-blue" /><h3 className="text-xl font-black uppercase italic tracking-tighter">Branding</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex items-center gap-6">
                <div className="w-32 h-32 bg-brand-lightGray rounded-semi border-2 border-dashed border-brand-gray/30 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-inner">
                  {localPreview || userData.logo_url ? (
                    <img src={localPreview || `${userData.logo_url}?v=${Date.now()}`} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon size={32} className="text-brand-gray opacity-30" />
                  )}
                  {uploading && <div className="absolute inset-0 bg-brand-black/40 flex items-center justify-center"><RefreshCw className="text-white animate-spin" size={24} /></div>}
                </div>
                <div className="space-y-3">
                  <label className="cursor-pointer px-6 py-3 bg-brand-black text-white rounded-semi text-xs font-black uppercase hover:bg-brand-gray transition-all shadow-lg flex items-center gap-2">
                    <ImageIcon size={18} /> Cambiar Imagen <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploading} />
                  </label>
                  <p className="text-[10px] text-brand-gray font-bold uppercase">PNG o JPG sugerido (Fondo blanco o transparente).</p>
                </div>
              </div>
              <div className="md:col-span-2"><label className="text-xs font-black text-brand-gray uppercase mb-1 block tracking-widest">Nombre del Negocio</label><input type="text" value={userData.empresa_nombre} onChange={e => setUserData({...userData, empresa_nombre: e.target.value})} className="w-full px-4 py-4 bg-brand-lightGray border-none rounded-semi font-black uppercase outline-none focus:ring-2 focus:ring-brand-blue text-lg" /></div>
              <div><label className="text-xs font-black text-brand-gray uppercase mb-1 block">Dueño</label><input type="text" value={userData.nombre} onChange={e => setUserData({...userData, nombre: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-black uppercase outline-none" /></div>
              <div><label className="text-xs font-black text-brand-gray uppercase mb-1 block">WhatsApp</label><input type="text" value={userData.telefono} onChange={e => setUserData({...userData, telefono: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none" /></div>
              <div className="md:col-span-2"><label className="text-xs font-black text-brand-gray uppercase mb-1 block tracking-widest">Leyenda Legal / Pie de Remito</label><textarea value={userData.aviso_legal} onChange={e => setUserData({...userData, aviso_legal: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none h-20" placeholder="Ej: No se aceptan devoluciones pasados los 30 días..." /></div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-5 bg-brand-blue text-white font-black rounded-semi shadow-xl hover:bg-blue-600 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3"><Save size={24} /> Confirmar y Guardar Cambios</button>
          </form>

          <form onSubmit={handleUpdatePassword} className="bg-white p-8 rounded-semi shadow-2xl border border-brand-gray/10 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4"><Key size={24} className="text-brand-blue" /><h3 className="text-xl font-black uppercase italic tracking-tighter">Acceso</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs font-black text-brand-gray uppercase mb-1 block">Nueva Contraseña</label><input type="password" value={passwords.new_password} onChange={e => setPasswords({...passwords, new_password: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none" placeholder="••••••••" /></div>
              <div><label className="text-xs font-black text-brand-gray uppercase mb-1 block">Confirmar</label><input type="password" value={passwords.confirm_password} onChange={e => setPasswords({...passwords, confirm_password: e.target.value})} className="w-full px-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none" placeholder="••••••••" /></div>
            </div>
            <button type="submit" className="px-8 py-3 bg-brand-black text-white font-black rounded-semi uppercase text-xs">Actualizar Clave</button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-brand-black p-5 rounded-semi text-white shadow-2xl border-b-4 border-brand-blue relative overflow-hidden">
            <Zap size={60} className="absolute -right-4 -top-4 opacity-10 text-brand-blue" />
            <h4 className="text-xs font-black text-brand-blue uppercase tracking-[0.3em] mb-4">Estado Suscripción</h4>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-white/50 uppercase font-black">Plan Actual</p>
                <p className="text-2xl font-black uppercase italic tracking-tighter">
                  {profile?.email === 'cache_tienda2026@hotmail.com' ? 'Premium' : (empresa?.plan || 'Estándar')}
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-semi border border-white/10 space-y-3">
                {profile?.email === 'cache_tienda2026@hotmail.com' ? (
                  <>
                    <p className="text-[10px] text-white/70 font-black uppercase">Suscripción Premium</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-white/70">Costo:</span>
                      <span className="text-xl font-black text-brand-blue">$80.000<span className="text-xs font-normal text-white/50">/mes</span></span>
                    </div>
                    <p className="text-[9px] text-white/40 font-bold uppercase">Débito automático · Mercado Pago</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!empresa) return;
                          const { data, error } = await supabase.functions.invoke('mercadopago-create-preference', {
                            body: { empresa_id: empresa.id, email_empresa: profile?.email || '' }
                          });
                          if (error) throw error;
                          if (data?.init_point) window.open(data.init_point, '_blank');
                        } catch (err: any) {
                          alert('Error al conectar con Mercado Pago. Intenta más tarde.');
                        }
                      }}
                      className="w-full py-3 bg-[#009EE3] hover:bg-[#0089c7] text-white font-black rounded-semi text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard size={16} /> Suscribirse · Mercado Pago
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-white/70">Costo:</span>
                      <span className="text-xl font-black text-brand-blue">$40.000<span className="text-xs font-normal text-white/50">/mes</span></span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!empresa) return;
                          const { data, error } = await supabase.functions.invoke('mercadopago-create-preference', {
                            body: { empresa_id: empresa.id, email_empresa: profile?.email || '' }
                          });
                          if (error) throw error;
                          if (data?.init_point) window.open(data.init_point, '_blank');
                        } catch (err: any) {
                          alert('Error al conectar con Mercado Pago. Intenta más tarde.');
                        }
                      }}
                      className="w-full py-3 bg-brand-blue text-white font-black rounded-semi text-xs uppercase shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard size={16} /> Pagar Servicio
                    </button>
                  </>
                )}
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
    </div>
  )
}
