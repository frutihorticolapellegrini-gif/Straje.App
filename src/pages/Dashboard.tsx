import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Package, TrendingUp, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Users, X, Bell, MessageSquare } from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'
import { formatMoney } from '../utils/formatters'

export const Dashboard = () => {
  const { profile, empresa } = useAuth()
  const [stats, setStats] = useState({
    totalPrendas: 0,
    alquiladasHoy: 0,
    devolucionesHoy: 0,
    pendientesLavanderia: 0,
    ventasHoy: 0,
    gastosHoy: 0,
    unidadesHoy: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [pendientesDevolucion, setPendientesDevolucion] = useState<any[]>([])
  const [filtroDia, setFiltroDia] = useState<string>('todos')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { empresa_id } = profile || {}
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // 1. Stock y Lavandería
      const { data: stockData } = await supabase.from('stock').select('unidades, disponibles, estado').eq('empresa_id', empresa_id)
      const total = stockData?.reduce((acc, s) => acc + (s.unidades || 0), 0) || 0
      const lavanderia = stockData?.filter(s => s.estado === 'lavanderia').length || 0

      // 2. Alquileres Hoy (Unidades vendidas/alquiladas)
      const { data: alqHoy } = await supabase.from('alquileres')
        .select('id')
        .eq('empresa_id', empresa_id)
        .gte('creado_en', today.toISOString())
        .lt('creado_en', tomorrow.toISOString())

      // 3. Caja Hoy (Ventas vs Gastos)
      const { data: cajaHoy } = await supabase.from('caja')
        .select('tipo, monto')
        .eq('empresa_id', empresa_id)
        .gte('fecha_movimiento', today.toISOString())
        .lt('fecha_movimiento', tomorrow.toISOString())

      const ventasHoy = cajaHoy?.filter(c => c.tipo === 'ingreso').reduce((acc, c) => acc + Number(c.monto), 0) || 0
      const gastosHoy = cajaHoy?.filter(c => c.tipo === 'egreso').reduce((acc, c) => acc + Number(c.monto), 0) || 0

      setStats({
        totalPrendas: total,
        alquiladasHoy: alqHoy?.length || 0,
        devolucionesHoy: 0, // Placeholder o quitar si no se usa
        pendientesLavanderia: lavanderia,
        ventasHoy,
        gastosHoy,
        unidadesHoy: alqHoy?.length || 0
      })

      // 4. Gráfico Semanal (Lunes a Hoy)
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const ahora = new Date()
      const diaActual = ahora.getDay() // 0-6
      
      // Calcular Lunes de esta semana
      const inicioSemana = new Date(ahora)
      const diff = ahora.getDate() - diaActual + (diaActual === 0 ? -6 : 1)
      inicioSemana.setDate(diff)
      inicioSemana.setHours(0,0,0,0)

      const { data: cajaSemana } = await supabase.from('caja')
        .select('tipo, monto, fecha_movimiento')
        .eq('empresa_id', empresa_id)
        .gte('fecha_movimiento', inicioSemana.toISOString())
        .lte('fecha_movimiento', ahora.toISOString())

      const weeklyData = []
      // Recorrer desde Lunes hasta Hoy
      const tempDate = new Date(inicioSemana)
      while (tempDate <= ahora) {
        const dInicio = new Date(tempDate); dInicio.setHours(0,0,0,0);
        const dFin = new Date(tempDate); dFin.setHours(23,59,59,999);
        
        const movimientosDia = cajaSemana?.filter(c => {
          const cDate = new Date(c.fecha_movimiento);
          return cDate >= dInicio && cDate <= dFin;
        }) || [];

        const isHoy = tempDate.toDateString() === ahora.toDateString()

        weeklyData.push({
          name: isHoy ? 'HOY' : diasSemana[tempDate.getDay()],
          ventas: movimientosDia.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto), 0),
          gastos: movimientosDia.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + Number(m.monto), 0)
        })

        tempDate.setDate(tempDate.getDate() + 1)
      }
      
      setChartData(weeklyData)

      // 5. Alertas de Devolución (Pendientes)
      const { data: devolucionesData } = await supabase
        .from('alquileres')
        .select(`
          id,
          cliente_nombre,
          cliente_telefono,
          fecha_retiro,
          fecha_devolucion,
          estado,
          detalles:alquiler_detalles(prenda:prenda_id(codigo, tipo))
        `)
        .eq('empresa_id', empresa_id)
        .neq('estado', 'devuelto')
        .order('fecha_devolucion', { ascending: true })

      setPendientesDevolucion(devolucionesData || [])
    } catch (err) {
      console.error(err)
    }
  }

  const getDiasFaltantes = (fechaDev: string) => {
    const hoy = new Date()
    hoy.setHours(0,0,0,0)
    
    // Tratamos la fecha de la base de datos interpretándola en la zona local, 
    // en lugar de usar getTime() crudo si la hora es distinta, 
    // usando parseInt en los segmentos para ser exactos al día calendario.
    const [year, month, day] = fechaDev.split('T')[0].split('-').map(Number)
    const dev = new Date(year, month - 1, day)
    
    const diff = dev.getTime() - hoy.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getFilteredDevoluciones = () => {
    return pendientesDevolucion.filter(dev => {
      if (filtroDia === 'todos') return true;
      
      const [year, month, day] = dev.fecha_devolucion.split('T')[0].split('-').map(Number)
      const devDate = new Date(year, month - 1, day)
      const diaSemana = devDate.getDay();
      
      if (filtroDia === 'esta_semana') {
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        const limit = new Date(hoy);
        limit.setDate(limit.getDate() + 7);
        return devDate >= hoy && devDate <= limit;
      }

      return diaSemana.toString() === filtroDia;
    })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black uppercase tracking-tighter italic">Resumen de Operaciones</h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-wider">Hola, {profile?.nombre}. Control de ventas y stock en tiempo real.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-brand-lightGray text-brand-black rounded-semi font-black text-[10px] uppercase hover:bg-brand-gray/10 transition-all"
        >
          Actualizar Datos
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI VENTAS HOY - Ahora interactivo */}
        <button 
          onClick={() => setShowDetailModal(true)}
          className="bg-brand-black text-white p-6 rounded-semi shadow-2xl border-b-8 border-brand-blue relative overflow-hidden text-left hover:scale-[1.02] transition-transform group"
        >
          <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-1">Ventas HOY (Clic detalle)</p>
          <p className="text-4xl font-black">{formatMoney(stats.ventasHoy)}</p>
        </button>

        <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
          <Users className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-brand-blue" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Alquileres Creados</p>
          <p className="text-4xl font-black text-brand-black">{stats.alquiladasHoy}</p>
        </div>

        <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
          <Package className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-brand-black" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Unidades en Stock</p>
          <p className="text-4xl font-black text-brand-black">{stats.totalPrendas}</p>
        </div>

        <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
          <Clock className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-red-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">En Lavandería</p>
          <p className="text-4xl font-black text-red-500">{stats.pendientesLavanderia}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-semi shadow-xl border border-brand-gray/10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black text-brand-black flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp className="text-brand-blue" size={20} /> VENTAS Y GASTOS (SEMANA ACTUAL)
            </h3>
            <span className="text-[10px] font-black bg-brand-lightGray px-2 py-1 rounded text-brand-gray uppercase">Lunes a Hoy</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 'bold', fill: '#666'}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 'bold', fill: '#999'}} 
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="ventas" fill="#22c55e" radius={[4, 4, 0, 0]} name="Ingresos ($)" barSize={25} />
                <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Egresos ($)" barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-brand-black text-white p-6 rounded-semi shadow-2xl border-t-4 border-brand-blue">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-blue mb-6">Estado Operativo</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                  <p className="text-xs font-bold uppercase tracking-wider">Sistema Online</p>
                </div>
                <CheckCircle2 className="text-green-500" size={16} />
              </div>
              
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/50 uppercase font-black mb-3">Balance Rápido Hoy</p>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black">{formatMoney(stats.ventasHoy - stats.gastosHoy)}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${stats.ventasHoy >= stats.gastosHoy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {stats.ventasHoy >= stats.gastosHoy ? 'Superávit' : 'Déficit'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl">
             <h3 className="text-xs font-black uppercase tracking-widest text-brand-black mb-4">Información de Sesión</h3>
             <div className="space-y-2">
                <p className="text-[10px] font-bold text-brand-gray uppercase">Empresa: <span className="text-brand-black">{empresa?.nombre}</span></p>
                <p className="text-[10px] font-bold text-brand-gray uppercase">Usuario: <span className="text-brand-black">{profile?.nombre}</span></p>
                <p className="text-[10px] font-bold text-brand-gray uppercase">Rol: <span className="text-brand-blue">{profile?.rol}</span></p>
             </div>
          </div>
        </div>
      </div>

      {/* Alertas de Devolución */}
      <div className="bg-white p-8 rounded-semi shadow-xl border border-brand-gray/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h3 className="text-xl font-black text-brand-black flex items-center gap-2 uppercase tracking-widest">
            <Bell className="text-orange-500" size={24} /> Alertas de Devolución
          </h3>
          <select 
            value={filtroDia}
            onChange={(e) => setFiltroDia(e.target.value)}
            className="p-3 border border-brand-gray/20 rounded-semi text-xs font-black uppercase focus:ring-2 focus:ring-brand-blue outline-none cursor-pointer bg-brand-lightGray/30"
          >
            <option value="todos">Todas las Pendientes</option>
            <option value="esta_semana">Devoluciones Esta Semana</option>
            <option value="1">Lunes</option>
            <option value="2">Martes</option>
            <option value="3">Miércoles</option>
            <option value="4">Jueves</option>
            <option value="5">Viernes</option>
            <option value="6">Sábado</option>
          </select>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {getFilteredDevoluciones().length === 0 ? (
             <div className="text-center p-8 text-brand-gray font-black uppercase text-xs italic opacity-70">No hay devoluciones para este filtro.</div>
          ) : getFilteredDevoluciones().map(dev => {
            const diasFaltantes = getDiasFaltantes(dev.fecha_devolucion)
            const esUrgente = diasFaltantes <= 1 && diasFaltantes >= 0
            const pasoFecha = diasFaltantes < 0
            
            const mensajeAviso = encodeURIComponent(`Hola ${dev.cliente_nombre}, le recordamos por favor no se olvide de devolver el traje para su limpieza y control. ¡Muchas gracias!`)

            return (
              <div key={dev.id} className={`p-5 rounded-semi border-l-8 flex flex-col md:flex-row justify-between items-center gap-4 transition-all shadow-sm ${pasoFecha ? 'border-red-500 bg-red-50' : esUrgente ? 'border-orange-500 bg-orange-50/50' : 'border-brand-blue bg-white'}`}>
                <div>
                  <h4 className="font-black text-brand-black uppercase text-sm">{dev.cliente_nombre}</h4>
                  <p className="text-xs font-bold text-brand-gray">{dev.cliente_telefono || 'Sin teléfono'}</p>
                  <p className="text-[10px] text-brand-gray uppercase mt-2 border-t border-brand-gray/10 pt-2">
                    Alquilado: <span className="font-black">{new Date(dev.fecha_retiro).toLocaleDateString()}</span> | 
                    Devolución: <span className="font-black text-brand-black ml-1">{new Date(dev.fecha_devolucion).toLocaleDateString()}</span>
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <div className={`px-4 py-2 rounded font-black text-[10px] uppercase text-center min-w-[120px] w-full sm:w-auto ${pasoFecha ? 'bg-red-500 text-white animate-pulse' : esUrgente ? 'bg-orange-500 text-white animate-pulse' : 'bg-brand-lightGray text-brand-gray'}`}>
                    {pasoFecha ? `Atrasado ${Math.abs(diasFaltantes)} días` : diasFaltantes === 0 ? 'Devolver Hoy' : diasFaltantes === 1 ? 'Devolver Mañana' : `Faltan ${diasFaltantes} días`}
                  </div>
                  <a 
                    href={dev.cliente_telefono ? `https://wa.me/${dev.cliente_telefono.replace(/\D/g, '')}?text=${mensajeAviso}` : '#'}
                    target={dev.cliente_telefono ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded font-black text-[10px] uppercase transition-all shadow-md w-full sm:w-auto ${dev.cliente_telefono ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-brand-gray/20 text-brand-gray cursor-not-allowed'}`}
                    onClick={(e) => { if (!dev.cliente_telefono) { e.preventDefault(); alert("El cliente no tiene teléfono cargado."); } }}
                  >
                    <MessageSquare size={16} /> Enviar Aviso
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL DETALLE VENTAS HOY */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-brand-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-semi shadow-2xl max-w-md w-full overflow-hidden border-t-8 border-brand-blue animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-brand-gray/10 flex justify-between items-center bg-brand-lightGray/50">
              <h3 className="text-xl font-black text-brand-black uppercase italic flex items-center gap-2">
                <TrendingUp className="text-brand-blue" /> Detalle del Día
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-brand-gray/10 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-6 rounded-semi border border-green-100 flex flex-col items-center text-center">
                  <ArrowUpRight className="text-green-600 mb-2" size={24} />
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Ventas Totales</p>
                  <p className="text-2xl font-black text-brand-black">{formatMoney(stats.ventasHoy)}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-semi border border-red-100 flex flex-col items-center text-center">
                  <ArrowDownRight className="text-red-600 mb-2" size={24} />
                  <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Gastos Totales</p>
                  <p className="text-2xl font-black text-brand-black">{formatMoney(stats.gastosHoy)}</p>
                </div>
              </div>

              <div className="bg-brand-black p-6 rounded-semi shadow-xl text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                   <Package className="text-brand-blue" size={20} />
                   <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Unidades Vendidas / Alquileres</p>
                </div>
                <p className="text-5xl font-black text-white">{stats.unidadesHoy}</p>
                <p className="text-[9px] text-brand-blue font-black uppercase mt-2">Operaciones registradas hoy</p>
              </div>

              <div className="pt-4 border-t border-brand-gray/10 flex justify-between items-center">
                <p className="text-xs font-black text-brand-gray uppercase">Balance Neto:</p>
                <p className={`text-xl font-black ${stats.ventasHoy - stats.gastosHoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(stats.ventasHoy - stats.gastosHoy)}
                </p>
              </div>
            </div>

            <div className="p-4 bg-brand-lightGray/50 border-t border-brand-gray/10">
               <button 
                onClick={() => setShowDetailModal(false)}
                className="w-full py-4 bg-brand-black text-white rounded-semi font-black text-xs uppercase tracking-widest hover:bg-brand-gray transition-all"
               >
                 Entendido
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
