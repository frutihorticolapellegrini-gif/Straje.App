import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { 
  BarChart2, Users, DollarSign, Activity, AlertTriangle, 
  Plus, Trash2, MapPin, Search, MessageCircle, Sparkles, 
  Clock, ShieldCheck
} from 'lucide-react'
import { formatMoney } from '../../utils/formatters'
import { MapaUsuarios } from '../../components/metricas/MapaUsuarios'
import type { UsuarioMapaItem } from '../../components/metricas/MapaUsuarios'

export const Metricas = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState<any[]>([])
  const [usuariosDb, setUsuariosDb] = useState<any[]>([])
  const [actividadLogins, setActividadLogins] = useState<any[]>([])
  const [visitas, setVisitas] = useState<{ hoy: number, semana: number, total: number }>({ hoy: 0, semana: 0, total: 0 })
  const [gastos, setGastos] = useState<any[]>([])
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', monto: '' })

  // Filtros de tabla
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'nuevos' | 'premium' | 'prueba' | 'mora'>('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (profile?.rol === 'programador' || profile?.email === 'prueba_tiendaropa2026@hotmail.com') {
      fetchMetricas()
    }
  }, [profile])

  const fetchMetricas = async () => {
    setLoading(true)
    try {
      // 1. Obtener Empresas
      const { data: empData } = await supabase.from('empresas').select('*')
      setEmpresas(empData || [])

      // 2. Obtener Usuarios Perfiles (para conocer nombres de las personas registradas)
      try {
        const { data: usrData } = await supabase.from('usuarios').select('*')
        setUsuariosDb(usrData || [])
      } catch (e) {
        console.warn("No se pudo cargar tabla usuarios completa:", e)
      }

      // 3. Obtener Actividad de Logins
      try {
        const { data: actData } = await supabase.from('actividad_logins').select('*').order('fecha', { ascending: false })
        setActividadLogins(actData || [])
      } catch (e) {
        console.warn("Tabla actividad_logins no existe aún:", e)
      }

      // 4. Obtener Gastos
      const { data: gasData } = await supabase.from('gastos_programador').select('*').order('fecha', { ascending: false })
      setGastos(gasData || [])

      // 5. Obtener Visitas
      const { data: visData } = await supabase.from('visitas_app').select('fecha')
      if (visData) {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        
        const semanaPasada = new Date()
        semanaPasada.setDate(semanaPasada.getDate() - 7)
        semanaPasada.setHours(0, 0, 0, 0)

        let countHoy = 0
        let countSemana = 0
        
        visData.forEach(v => {
          const d = new Date(v.fecha)
          if (d >= hoy) countHoy++
          if (d >= semanaPasada) countSemana++
        })

        setVisitas({ hoy: countHoy, semana: countSemana, total: visData.length })
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAgregarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoGasto.concepto || !nuevoGasto.monto) return
    
    try {
      const { error } = await supabase.from('gastos_programador').insert({
        concepto: nuevoGasto.concepto,
        monto: Number(nuevoGasto.monto),
        usuario_id: profile?.id
      })
      if (error) throw error
      setNuevoGasto({ concepto: '', monto: '' })
      fetchMetricas()
    } catch (err) {
      console.error("Error al agregar gasto", err)
      alert("Error al agregar gasto")
    }
  }

  const handleEliminarGasto = async (id: string) => {
    if (!confirm("¿Eliminar gasto?")) return
    try {
      const { error } = await supabase.from('gastos_programador').delete().eq('id', id)
      if (error) throw error
      fetchMetricas()
    } catch (err) {
      console.error("Error", err)
    }
  }

  if (profile?.rol !== 'programador' && profile?.email !== 'prueba_tiendaropa2026@hotmail.com') {
    return <div className="p-8 text-center font-black text-red-500 uppercase tracking-widest">Acceso Denegado</div>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
        <p className="text-xs font-black uppercase tracking-widest text-brand-gray">Cargando Métricas del Sistema...</p>
      </div>
    )
  }

  const today = new Date()

  // Mapear y enriquecer la lista de empresas con sus usuarios y actividad de login
  const usuariosEnriquecidos: (UsuarioMapaItem & {
    direccion?: string
    finPruebaDate: Date
    diffDays: number
    isMora: boolean
    ultimoLoginFecha?: string
  })[] = empresas
    .filter(e => e.plan !== 'programador')
    .map(e => {
      // Buscar el usuario dueño asociado a esta empresa
      const owner = usuariosDb.find(u => u.empresa_id === e.id && u.rol === 'dueño') ||
                    usuariosDb.find(u => u.empresa_id === e.id)

      // Contar inicios de sesión registrados
      const loginsDeEmpresa = actividadLogins.filter(
        a => a.empresa_id === e.id || (a.email && a.email.toLowerCase() === (e.email_contacto || '').toLowerCase())
      )

      const loginsCount = Math.max(loginsDeEmpresa.length, Number(e.cantidad_logins) || 1)
      const ultimoLoginFecha = loginsDeEmpresa[0]?.fecha || e.ultimo_login || e.fecha_registro

      const fechaReg = e.fecha_registro ? new Date(e.fecha_registro) : new Date()
      const diffDiasReg = Math.floor((today.getTime() - fechaReg.getTime()) / (1000 * 3600 * 24))
      const esNuevo = diffDiasReg <= 7 // Registrado en los últimos 7 días

      const finPrueba = e.fecha_fin_prueba ? new Date(e.fecha_fin_prueba) : new Date()
      const diffDays = Math.ceil((finPrueba.getTime() - today.getTime()) / (1000 * 3600 * 24))
      const isMora = diffDays < 0 && e.plan !== 'premium'

      return {
        id: e.id,
        nombreNegocio: e.nombre || 'Sin Nombre',
        nombreContacto: owner?.nombre || e.nombre || 'Titular',
        email: e.email_contacto || owner?.email || '',
        telefono: e.telefono || '',
        localidad: e.localidad || 'Buenos Aires',
        direccion: e.direccion || 'S/D',
        fechaRegistro: e.fecha_registro || new Date().toISOString(),
        loginsCount,
        ultimoLoginFecha,
        plan: e.plan || 'estandar',
        esNuevo,
        finPruebaDate: finPrueba,
        diffDays,
        isMora,
      }
    })

  // KPIs de cálculo
  let cantPrueba = 0
  let cantPremium = 0
  let cantMora = 0
  let cantNuevos = 0
  let ingresosEstimados = 0

  usuariosEnriquecidos.forEach(u => {
    if (u.esNuevo) cantNuevos++
    if (u.plan === 'premium') {
      cantPremium++
      ingresosEstimados += (u.email === 'cache_tienda2026@hotmail.com') ? 80000 : 40000
    } else {
      if (u.diffDays >= 0) {
        cantPrueba++
      } else {
        cantMora++
      }
    }
  })

  const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0)
  const balanceNeto = ingresosEstimados - totalGastos

  // Filtrado de la lista para la tabla
  const usuariosFiltrados = usuariosEnriquecidos.filter(u => {
    // Filtro por tab
    if (filtroTipo === 'nuevos' && !u.esNuevo) return false
    if (filtroTipo === 'premium' && u.plan !== 'premium') return false
    if (filtroTipo === 'prueba' && (u.plan === 'premium' || u.isMora)) return false
    if (filtroTipo === 'mora' && !u.isMora) return false

    // Filtro por término de búsqueda
    const term = busqueda.toLowerCase().trim()
    if (!term) return true

    return (
      u.nombreNegocio.toLowerCase().includes(term) ||
      u.nombreContacto.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.localidad && u.localidad.toLowerCase().includes(term)) ||
      (u.telefono && u.telefono.includes(term))
    )
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-2 pb-24">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-black text-white p-6 rounded-semi shadow-2xl border-l-8 border-violet-500">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
            <Activity className="text-violet-400" size={32} /> Panel de Control & Métricas
          </h2>
          <p className="text-brand-gray text-xs font-bold uppercase tracking-widest mt-1">
            Programador: <span className="text-white font-mono">{profile?.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-semi text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={14} /> Modo Auditoría Total
          </span>
        </div>
      </header>

      {/* KPI VISITAS */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-brand-gray mb-3 flex items-center gap-2">
          <BarChart2 size={16} className="text-brand-blue" /> Tráfico & Visitas a la Aplicación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-brand-black text-white p-6 rounded-semi shadow-xl border-b-4 border-brand-blue relative overflow-hidden">
            <Users className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-1">Visitas Hoy</p>
            <p className="text-4xl font-black italic">{visitas.hoy}</p>
          </div>
          <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
            <Activity className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-brand-blue" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Últimos 7 Días</p>
            <p className="text-4xl font-black text-brand-black italic">{visitas.semana}</p>
          </div>
          <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
            <BarChart2 className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-brand-gray" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Visitas Históricas</p>
            <p className="text-4xl font-black text-brand-black italic">{visitas.total}</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: MAPA DE DISTRIBUCIÓN GEOGRÁFICA Y CONTROL DE PROPAGANDA */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 mb-4 border-b-2 border-brand-gray/20 pb-2">
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-brand-black flex items-center gap-2">
              <MapPin className="text-emerald-600" size={24} /> 
              Mapa de Clientes & Geolocalización de Nuevos
            </h3>
            <p className="text-xs font-bold text-brand-gray uppercase">
              Ubicación de registros y logins para medir tracción de propaganda y campañas publicitarias
            </p>
          </div>
        </div>

        <MapaUsuarios usuarios={usuariosEnriquecidos} />
      </div>

      {/* KPI ESTADO DE USUARIOS */}
      <div>
        <h3 className="text-xl font-black uppercase tracking-widest text-brand-black border-b-2 border-brand-gray/20 pb-2 mb-4">
          Estado General de Cuentas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-emerald-50 text-emerald-900 p-6 rounded-semi shadow-md border-2 border-emerald-300">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-emerald-800">Público Nuevo</p>
              <Sparkles size={16} className="text-emerald-600" />
            </div>
            <p className="text-4xl font-black text-emerald-700">{cantNuevos}</p>
            <p className="text-[10px] font-bold mt-2 uppercase text-emerald-800">Registrados en últimos 7 días</p>
          </div>

          <div className="bg-blue-50 text-blue-900 p-6 rounded-semi shadow-md border border-blue-200">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">En Modo Prueba</p>
            <p className="text-4xl font-black">{cantPrueba}</p>
            <p className="text-[10px] font-bold mt-2 uppercase">Cuentas Activas &lt; 30 Días</p>
          </div>

          <div className="bg-green-50 text-green-900 p-6 rounded-semi shadow-md border border-green-200">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Versión Paga (Premium)</p>
            <p className="text-4xl font-black">{cantPremium}</p>
            <p className="text-[10px] font-bold mt-2 uppercase">Generando Ingresos</p>
          </div>

          <div className="bg-red-50 text-red-900 p-6 rounded-semi shadow-md border border-red-200">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70 flex items-center gap-2">
              <AlertTriangle size={14}/> En Mora / Vencidos
            </p>
            <p className="text-4xl font-black">{cantMora}</p>
            <p className="text-[10px] font-bold mt-2 uppercase">Prueba finalizada sin pago</p>
          </div>
        </div>
      </div>

      {/* FINANZAS Y GASTOS */}
      <div>
        <h3 className="text-xl font-black uppercase tracking-widest text-brand-black border-b-2 border-brand-gray/20 pb-2 mb-4">
          Balance Financiero del Negocio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1 bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Ingresos Estimados/Mes</p>
                <p className="text-3xl font-black text-green-600">{formatMoney(ingresosEstimados)}</p>
              </div>
              <div className="flex-1 bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Gastos Totales</p>
                <p className="text-3xl font-black text-red-600">{formatMoney(totalGastos)}</p>
              </div>
            </div>
            <div className="bg-brand-black p-6 rounded-semi shadow-2xl relative overflow-hidden">
               <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 text-brand-blue" />
               <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-1">Balance Neto</p>
               <p className="text-5xl font-black text-white italic tracking-tighter">{formatMoney(balanceNeto)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10">
            <h4 className="text-sm font-black uppercase tracking-widest mb-4">Registro de Gastos</h4>
            <form onSubmit={handleAgregarGasto} className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="CONCEPTO (Ej: Publicidad Meta/Google)" 
                value={nuevoGasto.concepto}
                onChange={e => setNuevoGasto({...nuevoGasto, concepto: e.target.value})}
                className="flex-1 px-3 py-2 bg-brand-lightGray border-none rounded text-xs font-bold uppercase outline-none"
              />
              <input 
                type="number" 
                placeholder="MONTO" 
                value={nuevoGasto.monto}
                onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})}
                className="w-24 px-3 py-2 bg-brand-lightGray border-none rounded text-xs font-bold uppercase outline-none"
              />
              <button type="submit" className="bg-brand-blue text-white p-2 rounded hover:bg-blue-600 transition-colors">
                <Plus size={18}/>
              </button>
            </form>

            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {gastos.length === 0 ? (
                <p className="text-xs text-brand-gray font-bold uppercase text-center py-4">No hay gastos registrados</p>
              ) : gastos.map(g => (
                <div key={g.id} className="flex justify-between items-center p-3 bg-brand-lightGray/50 rounded border border-brand-gray/5">
                  <div>
                    <p className="text-xs font-black uppercase">{g.concepto}</p>
                    <p className="text-[9px] text-brand-gray font-bold uppercase">{new Date(g.fecha).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-black text-red-600">-{formatMoney(g.monto)}</p>
                    <button onClick={() => handleEliminarGasto(g.id)} className="text-brand-gray hover:text-red-500 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: DIRECTORIO DE USUARIOS CON WHATSAPP, NOMBRE Y LOGIN COUNTS */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b-2 border-brand-gray/20 pb-3">
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-brand-black flex items-center gap-2">
              <Users className="text-brand-blue" size={24} /> Directorio de Usuarios & Clientes
            </h3>
            <p className="text-xs font-bold text-brand-gray uppercase">
              Control de inicios de sesión, nombres de registro y contacto directo por WhatsApp
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-semi text-xs font-black uppercase tracking-wider transition-all ${
                filtroTipo === 'todos' 
                  ? 'bg-brand-black text-white shadow-md' 
                  : 'bg-brand-lightGray text-brand-black hover:bg-brand-gray/20'
              }`}
            >
              Todos ({usuariosEnriquecidos.length})
            </button>
            <button
              onClick={() => setFiltroTipo('nuevos')}
              className={`px-3 py-1.5 rounded-semi text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                filtroTipo === 'nuevos' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Sparkles size={14} /> Nuevos ({cantNuevos})
            </button>
            <button
              onClick={() => setFiltroTipo('prueba')}
              className={`px-3 py-1.5 rounded-semi text-xs font-black uppercase tracking-wider transition-all ${
                filtroTipo === 'prueba' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Prueba ({cantPrueba})
            </button>
            <button
              onClick={() => setFiltroTipo('premium')}
              className={`px-3 py-1.5 rounded-semi text-xs font-black uppercase tracking-wider transition-all ${
                filtroTipo === 'premium' 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-green-50 text-green-800 hover:bg-green-100'
              }`}
            >
              Premium ({cantPremium})
            </button>
            <button
              onClick={() => setFiltroTipo('mora')}
              className={`px-3 py-1.5 rounded-semi text-xs font-black uppercase tracking-wider transition-all ${
                filtroTipo === 'mora' 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              Mora ({cantMora})
            </button>
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="bg-white p-3 rounded-semi shadow-md border border-brand-gray/10 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
            <input 
              type="text"
              placeholder="BUSCAR POR NOMBRE PERSONAL, NEGOCIO, EMAIL, TELÉFONO O CIUDAD..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-lightGray border-none rounded-semi font-black text-xs outline-none focus:ring-2 focus:ring-brand-blue uppercase tracking-tight"
            />
          </div>
        </div>

        {/* TABLA DE USUARIOS */}
        <div className="bg-white rounded-semi shadow-xl border border-brand-gray/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="bg-brand-black text-white text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="p-4">Negocio & Titular Registrado</th>
                  <th className="p-4">Contacto Directo</th>
                  <th className="p-4">Ubicación</th>
                  <th className="p-4 text-center">Inicios de Sesión (Logins)</th>
                  <th className="p-4 text-center">Plan / Estado</th>
                  <th className="p-4 text-right">Vencimiento / Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray/10">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-brand-gray font-black uppercase text-xs italic">
                      No se encontraron usuarios para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map(u => {
                    const cleanPhone = u.telefono ? u.telefono.replace(/\D/g, '') : ''
                    const phoneWithCountry = cleanPhone.startsWith('54') ? cleanPhone : '549' + cleanPhone
                    const waLink = cleanPhone ? `https://wa.me/${phoneWithCountry}?text=Hola%20${encodeURIComponent(u.nombreContacto || u.nombreNegocio)},%20te%20contacto%20desde%20Straje.App.` : null

                    return (
                      <tr key={u.id} className="hover:bg-brand-lightGray/30 transition-colors group">
                        {/* NEGOCIO Y TITULAR */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <p className="font-black uppercase text-brand-black text-sm">{u.nombreNegocio}</p>
                            {u.esNuevo && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase tracking-wider flex items-center gap-1 border border-emerald-300">
                                <Sparkles size={10} /> Nuevo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-brand-blue uppercase mt-0.5">
                            👤 Titular: {u.nombreContacto}
                          </p>
                          <p className="text-[10px] text-brand-gray font-mono mt-0.5">
                            📧 {u.email}
                          </p>
                        </td>

                        {/* CONTACTO WHATSAPP */}
                        <td className="p-4">
                          {waLink ? (
                            <a 
                              href={waLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-semi font-black text-[10px] uppercase tracking-wider shadow-sm transition-all hover:scale-105"
                              title="Enviar mensaje por WhatsApp"
                            >
                              <MessageCircle size={14} />
                              <span>{u.telefono}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-gray uppercase italic">
                              Sin Teléfono
                            </span>
                          )}
                        </td>

                        {/* UBICACIÓN */}
                        <td className="p-4">
                          <p className="font-black flex items-center gap-1 uppercase text-xs text-brand-black">
                            <MapPin size={14} className="text-brand-blue flex-shrink-0" /> 
                            {u.localidad || 'Buenos Aires'}
                          </p>
                          <p className="text-[10px] text-brand-gray font-medium mt-0.5 truncate max-w-[200px]">
                            {u.direccion || 'Sin dirección'}
                          </p>
                        </td>

                        {/* INICIOS DE SESIÓN */}
                        <td className="p-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="px-3 py-1 bg-violet-100 text-violet-800 border border-violet-200 rounded-full font-black text-xs font-mono">
                              ⚡ {u.loginsCount} {u.loginsCount === 1 ? 'login' : 'logins'}
                            </span>
                            {u.ultimoLoginFecha && (
                              <span className="text-[9px] text-brand-gray font-bold uppercase mt-1 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(u.ultimoLoginFecha).toLocaleDateString()} {new Date(u.ultimoLoginFecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}hs
                              </span>
                            )}
                          </div>
                        </td>

                        {/* PLAN / ESTADO */}
                        <td className="p-4 text-center">
                          {u.plan === 'premium' ? (
                            <span className="bg-green-100 text-green-800 border border-green-300 px-2.5 py-1 rounded text-[10px] font-black uppercase">
                              Premium
                            </span>
                          ) : u.isMora ? (
                            <span className="bg-red-100 text-red-800 border border-red-300 px-2.5 py-1 rounded text-[10px] font-black uppercase">
                              En Mora
                            </span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-1 rounded text-[10px] font-black uppercase">
                              Prueba Activa
                            </span>
                          )}
                        </td>

                        {/* VENCIMIENTO / FECHA REGISTRO */}
                        <td className="p-4 text-right">
                          <p className="font-black text-xs uppercase text-brand-black">
                            {u.finPruebaDate.toLocaleDateString()}
                          </p>
                          {u.plan !== 'premium' && (
                            <p className={`text-[10px] font-bold mt-0.5 ${u.isMora ? 'text-red-500' : 'text-blue-500'}`}>
                              {u.isMora ? `Vencido hace ${Math.abs(u.diffDays)} d` : `Quedan ${u.diffDays} d`}
                            </p>
                          )}
                          <p className="text-[9px] text-brand-gray font-bold uppercase mt-1">
                            Reg: {new Date(u.fechaRegistro).toLocaleDateString()}
                          </p>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
