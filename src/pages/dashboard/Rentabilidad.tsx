import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import { TrendingUp, DollarSign, Calendar, Award, Search, BarChart2, Printer, MessageCircle } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'

interface ProfitItem {
  id: string
  codigo: string
  tipo: string
  color: string
  talle: string
  marca?: string
  costo: number
  precio_alquiler: number
  total_alquileres: number
  rentabilidad_total: number
}

export const Rentabilidad = () => {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stockStats, setStockStats] = useState<ProfitItem[]>([])
  const [seasonData, setSeasonData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('TODOS')
  const [chartView, setChartView] = useState<'estacionalidad' | 'ranking'>('estacionalidad')

  useEffect(() => {
    fetchRentabilidadData()
  }, [])

  const fetchRentabilidadData = async () => {
    try {
      setLoading(true)
      const { empresa_id } = profile || {}
      if (!empresa_id) return

      // 1. Obtener detalles de alquileres para contar frecuencia por prenda
      // Usamos !inner para filtrar por la tabla relacionada alquileres
      const { data: detalles, error: detErr } = await supabase
        .from('alquiler_detalles')
        .select(`
          prenda_id,
          precio_unitario,
          alquileres!inner (creado_en, empresa_id)
        `)
        .eq('alquileres.empresa_id', empresa_id)

      if (detErr) throw detErr

      // 2. Obtener todo el stock de alquiler
      const { data: stock, error: stockErr } = await supabase
        .from('stock')
        .select('*')
        .eq('empresa_id', empresa_id)
        .gt('precio_alquiler', 0)

      if (stockErr) throw stockErr

      // Calcular estadísticas por prenda
      const stats = stock.map(item => {
        const rentals = detalles?.filter(d => d.prenda_id === item.id) || []
        const count = rentals.length
        const revenue = rentals.reduce((acc, r) => acc + Number(r.precio_unitario), 0)
        
        return {
          id: item.id,
          codigo: item.codigo,
          tipo: item.tipo,
          color: item.color,
          talle: item.talle,
          marca: item.marca,
          costo: Number(item.costo) || 0,
          precio_alquiler: Number(item.precio_alquiler),
          total_alquileres: count,
          rentabilidad_total: revenue
        }
      }).sort((a, b) => b.total_alquileres - a.total_alquileres)

      setStockStats(stats)

      // 3. Calcular Estacionalidad (Ventas por Mes/Semana)
      // Agrupamos los alquileres por mes de los últimos 12 meses
      const monthlyTrends: { [key: string]: number } = {}
      detalles?.forEach(d => {
        const alq = (d as any).alquileres
        if (alq && alq.creado_en) {
          const date = new Date(alq.creado_en)
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
          monthlyTrends[monthKey] = (monthlyTrends[monthKey] || 0) + 1
        }
      })

      const chartData = Object.entries(monthlyTrends)
        .map(([key, val]) => ({
          name: key,
          alquileres: val
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(-12) // Últimos 12 meses

      setSeasonData(chartData)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const types = useMemo(() => {
    return ['TODOS', ...Array.from(new Set(stockStats.map(s => s.tipo)))]
  }, [stockStats])

  const filteredStats = useMemo(() => {
    return stockStats.filter(s => {
      const matchSearch = s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.tipo.toLowerCase().includes(searchTerm.toLowerCase())
      const matchType = filterType === 'TODOS' || s.tipo === filterType
      return matchSearch && matchType
    })
  }, [stockStats, searchTerm, filterType])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div></div>

  const totalRecaudado = stockStats.reduce((acc, s) => acc + s.rentabilidad_total, 0)
  const topPrenda = stockStats[0]

  const handleImprimir = () => {
    const html = document.getElementById('rentabilidad-capture')?.innerHTML || '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>REPORTE DE RENTABILIDAD</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { background-color: #f0f0f0; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${html}
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const handleWhatsApp = async () => {
    const el = document.getElementById('rentabilidad-capture');
    if (!el) return;
    setLoading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, { quality: 0.95, backgroundColor: '#fff' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `rentabilidad.png`, { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Reporte de Rentabilidad',
          text: `Adjunto el reporte de rentabilidad.`
        });
      } else {
        const link = document.createElement('a');
        link.download = `rentabilidad.png`;
        link.href = dataUrl;
        link.click();
        
        window.open(`https://wa.me/?text=${encodeURIComponent("Adjunto el reporte de rentabilidad. (Por favor, pega la imagen que se acaba de descargar)")}`, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert("Error al generar la imagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-2">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black uppercase tracking-tighter italic flex items-center gap-3">
            <BarChart2 className="text-brand-blue" size={32} /> {t('modules.profitability.title')}
          </h2>
          <p className="text-brand-gray font-medium">{t('modules.profitability.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImprimir} className="flex items-center gap-2 p-3 bg-white text-brand-black border-2 border-brand-black rounded-semi hover:bg-brand-lightGray transition-all font-bold text-xs uppercase" title={t('common.print')}>
            <Printer size={18} /> {t('common.print')}
          </button>
          <button onClick={handleWhatsApp} className="flex items-center gap-2 p-3 bg-[#25D366] text-white rounded-semi hover:bg-[#1ebd5a] transition-all font-bold text-xs uppercase shadow-xl" title="Compartir por WhatsApp">
            <MessageCircle size={18} /> WhatsApp
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-black text-white p-6 rounded-semi shadow-xl border-b-4 border-brand-blue relative overflow-hidden">
          <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-1">Recaudación Total (Vida Útil)</p>
          <p className="text-4xl font-black italic">{formatMoney(totalRecaudado)}</p>
          <p className="text-[10px] mt-2 opacity-60 uppercase font-bold">Suma de todos los alquileres históricos</p>
        </div>

        <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
          <Award className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-yellow-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Prenda Más Rentable</p>
          <p className="text-2xl font-black text-brand-black uppercase truncate">[{topPrenda?.codigo}] {topPrenda?.tipo}</p>
          <p className="text-lg font-bold text-brand-blue italic">{topPrenda?.total_alquileres} Alquileres</p>
        </div>

        <div className="bg-white p-6 rounded-semi shadow-xl border border-brand-gray/10 relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 text-green-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-1">Rentabilidad Promedio</p>
          <p className="text-4xl font-black text-brand-black italic">{formatMoney(totalRecaudado / (stockStats.length || 1))}</p>
          <p className="text-[10px] mt-2 text-brand-gray uppercase font-bold">Por unidad en stock</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-8 rounded-semi shadow-xl border border-brand-gray/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h3 className="text-sm font-black text-brand-black flex items-center gap-2 uppercase tracking-widest">
            {chartView === 'estacionalidad' ? (
              <><Calendar className="text-brand-blue" size={20} /> Épocas de Mayor Demanda</>
            ) : (
              <><Award className="text-brand-orange" size={20} /> Ranking de Prendas (Cantidades)</>
            )}
          </h3>
          <div className="flex bg-brand-lightGray p-1 rounded-semi">
            <button 
              onClick={() => setChartView('estacionalidad')}
              className={`px-4 py-2 text-[10px] font-black uppercase rounded transition-all ${chartView === 'estacionalidad' ? 'bg-white shadow-md text-brand-blue' : 'text-brand-gray hover:bg-brand-gray/10'}`}
            >
              Estacionalidad
            </button>
            <button 
              onClick={() => setChartView('ranking')}
              className={`px-4 py-2 text-[10px] font-black uppercase rounded transition-all flex items-center gap-2 ${chartView === 'ranking' ? 'bg-white shadow-md text-brand-orange' : 'text-brand-gray hover:bg-brand-gray/10'}`}
            >
              <BarChart2 size={14} /> Ver Ranking Visual
            </button>
          </div>
        </div>

        <div className="h-[350px] w-full">
          {chartView === 'estacionalidad' ? (
            seasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seasonData}>
                  <defs>
                    <linearGradient id="colorAlq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006fee" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#006fee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#999'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#999'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="alquileres" stroke="#006fee" strokeWidth={4} fillOpacity={1} fill="url(#colorAlq)" name="Total Alquileres" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-brand-lightGray/20 rounded-semi border-2 border-dashed border-brand-gray/20">
                 <BarChart2 size={48} className="text-brand-gray/30 mb-4" />
                 <p className="text-brand-gray font-black uppercase tracking-widest text-xs">No hay datos de estacionalidad todavía.</p>
                 <p className="text-brand-gray/50 font-bold uppercase text-[10px] mt-2">A medida que registres ventas y alquileres, el gráfico tomará color y forma.</p>
              </div>
            )
          ) : (
            stockStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockStats.slice(0, 15)} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="codigo" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#999'}} angle={-45} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#999'}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                    formatter={(value: any, _name: any, props: any) => [`${value} Alquileres`, props.payload.tipo]}
                  />
                  <Bar dataKey="total_alquileres" radius={[6, 6, 0, 0]} name="Cantidades">
                    {
                      stockStats.slice(0, 15).map((_entry, index) => {
                        const totalShown = Math.min(15, stockStats.length);
                        const isTop = index < 3;
                        const isBottom = index >= totalShown - 3 && totalShown > 6;
                        return (
                          <Cell key={`cell-${index}`} fill={
                            isTop ? '#10b981' : // Verde top 3
                            isBottom ? '#ef4444' : // Rojo bottom 3
                            '#3b82f6' // Azul el resto
                          } />
                        )
                      })
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-brand-lightGray/20 rounded-semi border-2 border-dashed border-brand-gray/20">
                 <Award size={48} className="text-brand-gray/30 mb-4" />
                 <p className="text-brand-gray font-black uppercase tracking-widest text-xs">No hay ranking disponible todavía.</p>
              </div>
            )
          )}
        </div>
        <p className="mt-6 text-[10px] text-brand-gray font-bold uppercase text-center italic">
          {chartView === 'estacionalidad' ? 
            'Este gráfico muestra los meses con más salida de prendas para organizar stock y personal.' : 
            'Las barras en verde indican las más alquiladas, en rojo las menos alquiladas. Se muestran hasta los 15 productos principales.'}
        </p>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-semi shadow-xl border border-brand-gray/10 overflow-hidden">
        <div className="p-6 border-b border-brand-gray/5 bg-brand-lightGray/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-black uppercase tracking-widest">Ranking de Rentabilidad por Prenda</h3>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" size={16} />
              <input 
                type="text" 
                placeholder="BUSCAR CÓDIGO..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-brand-gray/20 rounded-semi text-xs font-bold uppercase outline-none"
              />
            </div>
            <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white border border-brand-gray/20 rounded-semi text-xs font-bold uppercase outline-none cursor-pointer"
            >
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-black text-white text-[10px] font-black uppercase tracking-widest">
                <th className="p-4">Prenda</th>
                <th className="p-4">Atributos</th>
                <th className="p-4 text-center">Frecuencia</th>
                <th className="p-4 text-right">Recaudación</th>
                <th className="p-4 text-center">Rendimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/5">
              {filteredStats.map((item) => {
                const perc = (item.rentabilidad_total / (totalRecaudado || 1)) * 100
                return (
                  <tr key={item.id} className="hover:bg-brand-lightGray/20 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-black text-brand-black uppercase text-xs">[{item.codigo}] {item.tipo}</span>
                        <span className="text-[10px] text-brand-gray font-bold uppercase italic">{item.marca || 'Genérico'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-brand-lightGray rounded text-[9px] font-black uppercase">T: {item.talle}</span>
                        <span className="px-2 py-0.5 bg-brand-lightGray rounded text-[9px] font-black uppercase">{item.color || 'S/C'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-black text-brand-blue">
                      {item.total_alquileres} veces
                    </td>
                    <td className="p-4 text-right font-black text-brand-black">
                      {formatMoney(item.rentabilidad_total)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="w-24 bg-brand-lightGray rounded-full h-1.5 mx-auto overflow-hidden">
                        <div className="bg-brand-blue h-full" style={{ width: `${Math.min(100, (perc || 0) * 10)}%` }}></div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HIDDEN PRINT/WHATSAPP CONTAINER */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div id="rentabilidad-capture" style={{ width: '800px', backgroundColor: '#fff', padding: '20px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
           <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
             <h1 style={{ margin: 0, fontSize: '24px' }}>STRAJE.APP - REPORTE DE RENTABILIDAD</h1>
             <p style={{ margin: '5px 0 0 0' }}>FECHA: {new Date().toLocaleDateString()}</p>
           </div>
           
           <div style={{ marginBottom: '20px', border: '2px solid #000', padding: '10px' }}>
             <p style={{ margin: '5px 0' }}><strong>TOTAL RECAUDADO (VIDA ÚTIL):</strong> {formatMoney(totalRecaudado)}</p>
             <p style={{ margin: '5px 0' }}><strong>PRENDA MÁS RENTABLE:</strong> [{topPrenda?.codigo}] {topPrenda?.tipo}</p>
             <p style={{ margin: '5px 0' }}><strong>RENTABILIDAD PROMEDIO:</strong> {formatMoney(totalRecaudado / (stockStats.length || 1))}</p>
           </div>

           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
             <thead>
               <tr>
                 <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>CÓDIGO</th>
                 <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>PRENDA</th>
                 <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>ALQUILERES</th>
                 <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', backgroundColor: '#f0f0f0' }}>RECAUDACIÓN</th>
               </tr>
             </thead>
             <tbody>
               {filteredStats.map((s, i) => (
                 <tr key={i}>
                   <td style={{ border: '1px solid #000', padding: '6px' }}>[{s.codigo}]</td>
                   <td style={{ border: '1px solid #000', padding: '6px' }}>{s.tipo} - {s.talle} {s.color}</td>
                   <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{s.total_alquileres}</td>
                   <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{formatMoney(s.rentabilidad_total)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  )
}
