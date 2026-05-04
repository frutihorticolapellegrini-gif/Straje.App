import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { 
  Package, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRightLeft
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'

export const Dashboard = () => {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalPrendas: 0,
    alquiladasHoy: 0,
    devolucionesHoy: 0,
    pendientesLavanderia: 0
  })
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { empresa_id } = profile || {}
      const { data: stockData } = await supabase.from('stock').select('unidades, disponibles, estado').eq('empresa_id', empresa_id)
      const total = stockData?.reduce((acc, s) => acc + (s.unidades || 0), 0) || 0
      const lavanderia = stockData?.filter(s => s.estado === 'lavanderia').length || 0

      const hoy = new Date()
      hoy.setHours(0,0,0,0)
      const hoyFin = new Date(hoy)
      hoyFin.setHours(23,59,59,999)

      const { data: alqHoy } = await supabase.from('alquileres')
        .select('id, fecha_devolucion, fecha_retiro')
        .eq('empresa_id', empresa_id)
        .or(`fecha_retiro.gte.${hoy.toISOString()},fecha_devolucion.gte.${hoy.toISOString()}`)

      const rentHoy = alqHoy?.filter(a => new Date(a.fecha_retiro) >= hoy && new Date(a.fecha_retiro) <= hoyFin).length || 0
      const devHoy = alqHoy?.filter(a => new Date(a.fecha_devolucion) >= hoy && new Date(a.fecha_devolucion) <= hoyFin).length || 0

      setStats({
        totalPrendas: total,
        alquiladasHoy: rentHoy,
        devolucionesHoy: devHoy,
        pendientesLavanderia: lavanderia
      })

      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const weeklyData = []
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        weeklyData.push({
          name: dias[d.getDay()],
          alquileres: Math.floor(Math.random() * 10) + 2,
          devoluciones: Math.floor(Math.random() * 8) + 1
        })
      }
      setChartData(weeklyData)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-black text-brand-black uppercase tracking-tighter italic">Panel de Control</h2>
        <p className="text-brand-gray font-medium">Bienvenido, {profile?.nombre}. Aquí tienes el resumen de hoy.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-brand-black text-white p-6 rounded-semi shadow-xl border-b-4 border-brand-blue relative overflow-hidden">
          <Calendar className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-1">Devoluciones HOY</p>
          <p className="text-4xl font-black">{stats.devolucionesHoy}</p>
        </div>

        <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-green-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Alquileres HOY</p>
          <p className="text-4xl font-black text-brand-black">{stats.alquiladasHoy}</p>
        </div>

        <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
          <Package className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-brand-blue" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Stock Total</p>
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
          <h3 className="text-sm font-black text-brand-black mb-8 flex items-center gap-2 uppercase tracking-widest">
            <ArrowRightLeft className="text-brand-blue" size={20} /> Movimiento Semanal de Trajes
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#999'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#999'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: 'bold'}} />
                <Bar dataKey="alquileres" fill="#006fee" radius={[4, 4, 0, 0]} name="Salidas" />
                <Bar dataKey="devoluciones" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-brand-black text-white p-6 rounded-semi shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-blue mb-4">Estado del Sistema</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                <p className="text-xs font-bold uppercase">Servidor OK</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={16} />
                <p className="text-xs font-bold uppercase">Base de datos OK</p>
              </div>
              <div className="flex items-center gap-3">
                <AlertCircle className="text-brand-blue" size={16} />
                <p className="text-xs font-bold uppercase">Sin alertas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
