import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Package, TrendingUp, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Users, X } from 'lucide-react'
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
    } catch (err) {
      console.error(err)
    }
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
