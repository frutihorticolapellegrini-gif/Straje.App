import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Printer,
  LayoutGrid
} from 'lucide-react'
import { AlquilerForm } from '../../components/alquileres/AlquilerForm'

interface GridItem {
  id: string
  codigo: string
  tipo: string
  marca: string
  talle: string
  color: string
}

interface Period {
  start: Date
  end: Date
  label: string
}

export const Disponibilidad = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 100%, 1.2 = 120%, etc.
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [baseDate, setBaseDate] = useState(new Date())
  const [stock, setStock] = useState<GridItem[]>([])
  const [rentals, setRentals] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('TODOS')
  
  // Modal Alquiler state
  const [showAlquilerModal, setShowAlquilerModal] = useState(false)
  const [preSelectedData, setPreSelectedData] = useState<{ prenda: any, fecha: string } | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const { data: stockData } = await supabase
        .from('stock')
        .select('id, codigo, tipo, marca, talle, color, precio_alquiler')
        .eq('empresa_id', profile?.empresa_id)
        .neq('estado', 'baja')
        .gt('precio_alquiler', 0) // SOLO PRENDAS DE ALQUILER
        .order('tipo', { ascending: true })
      
      setStock(stockData || [])

      // Fetch rentals for the next 6 months to have them in memory
      const start = new Date()
      start.setHours(0,0,0,0)
      const end = new Date()
      end.setMonth(end.getMonth() + 6)

      const { data: rentalsData } = await supabase
        .from('alquileres')
        .select(`
          id, 
          fecha_retiro, 
          fecha_devolucion, 
          estado,
          alquiler_detalles (prenda_id)
        `)
        .eq('empresa_id', profile?.empresa_id)
        .neq('estado', 'devuelto') // Only active/reserved
        .gte('fecha_devolucion', start.toISOString())
      
      setRentals(rentalsData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Generate periods (Weeks or Months)
  const periods = useMemo(() => {
    const list: Period[] = []
    const temp = new Date(baseDate)
    temp.setHours(0,0,0,0)

    if (viewMode === 'week') {
      // Generate 12 weeks from baseDate
      for (let i = 0; i < 12; i++) {
        const start = new Date(temp)
        const end = new Date(temp)
        end.setDate(end.getDate() + 6)
        
        list.push({
          start,
          end,
          label: `SEM ${i + 1}\n(${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1})`
        })
        temp.setDate(temp.getDate() + 7)
      }
    } else {
      // Generate 6 months
      temp.setDate(1)
      for (let i = 0; i < 6; i++) {
        const start = new Date(temp)
        const end = new Date(temp.getFullYear(), temp.getMonth() + 1, 0)
        
        const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
        list.push({
          start,
          end,
          label: `${monthNames[start.getMonth()]}\n${start.getFullYear()}`
        })
        temp.setMonth(temp.getMonth() + 1)
      }
    }
    return list
  }, [viewMode, baseDate])

  const types = useMemo(() => {
    const t = Array.from(new Set(stock.map(s => s.tipo)))
    return ['TODOS', ...t]
  }, [stock])

  const filteredStock = useMemo(() => {
    return stock.filter(s => {
      const matchSearch = s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.marca?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchType = selectedType === 'TODOS' || s.tipo === selectedType
      return matchSearch && matchType
    })
  }, [stock, searchTerm, selectedType])

  const checkAvailability = (prendaId: string, period: Period) => {
    // A prenda is UNAVAILABLE if any rental overlaps with the period
    const isRented = rentals.some(r => {
      const rStart = new Date(r.fecha_retiro)
      const rEnd = new Date(r.fecha_devolucion)
      const pStart = period.start
      const pEnd = period.end

      const hasItem = r.alquiler_detalles.some((d: any) => d.prenda_id === prendaId)
      const overlaps = (rStart <= pEnd && rEnd >= pStart)
      
      return hasItem && overlaps
    })

    return !isRented
  }

  const handleCellClick = (prenda: GridItem, period: Period, isAvailable: boolean) => {
    if (!isAvailable) return
    
    setPreSelectedData({
      prenda: prenda,
      fecha: period.start.toISOString().split('T')[0]
    })
    setShowAlquilerModal(true)
  }

  const handleImprimirGrilla = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <html>
        <head>
          <title>RECUADRO DE ALQUILERES - STRAJE.APP</title>
          <style>
            @page { size: A4 landscape; margin: 5mm; }
            body { font-family: 'Arial', sans-serif; text-transform: uppercase; font-size: 8px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; overflow: hidden; }
            th { background-color: #000; color: #fff; }
            .sticky-col { background-color: #fff; font-weight: bold; }
            .disponible { background-color: #f0fff4; color: #22543d; }
            .ocupado { background-color: #fff5f5; color: #c53030; font-weight: bold; }
            .header { text-align: center; margin-bottom: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2>STRAJE.APP - DISPONIBILIDAD (${viewMode === 'week' ? 'SEMANAL' : 'MENSUAL'})</h2>
            <p>FECHA: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th width="80px">FECHAS</th>
                ${filteredStock.map(s => `<th width="100px">${s.codigo}<br>${s.tipo}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${periods.map(p => `
                <tr>
                  <td class="sticky-col">${p.label.replace('\n', ' ')}</td>
                  ${filteredStock.map(s => {
                    const avail = checkAvailability(s.id, p)
                    return `<td class="${avail ? 'disponible' : 'ocupado'}">${avail ? 'LIBRE' : 'ALQUILADO'}</td>`
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-brand-lightGray"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div></div>

  return (
    <div className={`flex flex-col gap-4 ${isFullscreen ? 'fixed inset-0 z-[100] bg-brand-lightGray p-6' : ''}`}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black uppercase tracking-tighter italic flex items-center gap-3">
            <LayoutGrid className="text-brand-blue" size={32} /> Recuadro de Alquileres
          </h2>
          <p className="text-brand-gray font-medium text-sm">Matriz de disponibilidad en tiempo real</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleImprimirGrilla}
            className="p-3 bg-white text-brand-black border-2 border-brand-black rounded-semi font-black flex items-center justify-center gap-2 hover:bg-brand-lightGray transition-all uppercase text-xs tracking-widest"
            title="Imprimir Vista Actual"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-black text-white rounded-semi shadow-xl hover:bg-brand-blue transition-all font-black text-xs uppercase tracking-widest animate-pulse"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            {isFullscreen ? 'REDUCIR' : 'EXPANDIR VISTA'}
          </button>
          
          <div className="flex bg-white rounded-semi p-1 shadow-md border border-brand-gray/10 items-center gap-2 px-3">
            <span className="text-[10px] font-black uppercase text-brand-gray">Zoom:</span>
            <button 
              onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.1))}
              className="w-8 h-8 flex items-center justify-center bg-brand-lightGray rounded-full hover:bg-brand-gray/20 transition-all font-black"
            >
              -
            </button>
            <span className="text-xs font-black w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
              className="w-8 h-8 flex items-center justify-center bg-brand-lightGray rounded-full hover:bg-brand-gray/20 transition-all font-black"
            >
              +
            </button>
          </div>

          <div className="flex bg-white rounded-semi p-1 shadow-md border border-brand-gray/10">
            <button 
              onClick={() => setViewMode('week')} 
              className={`px-4 py-2 rounded-semi font-black text-xs transition-all ${viewMode === 'week' ? 'bg-brand-black text-white' : 'text-brand-gray hover:bg-brand-lightGray'}`}
            >
              SEMANAS
            </button>
            <button 
              onClick={() => setViewMode('month')} 
              className={`px-4 py-2 rounded-semi font-black text-xs transition-all ${viewMode === 'month' ? 'bg-brand-black text-white' : 'text-brand-gray hover:bg-brand-lightGray'}`}
            >
              MESES
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-semi shadow-lg border border-brand-gray/5">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR PRENDA (CÓDIGO, TIPO, MARCA)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-brand-lightGray rounded-semi font-bold text-xs outline-none focus:ring-2 ring-brand-blue/20"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-brand-lightGray rounded-semi font-bold text-xs outline-none appearance-none cursor-pointer"
          >
            {types.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const d = new Date(baseDate)
              d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 30))
              setBaseDate(d)
            }}
            className="flex-1 p-3 bg-brand-lightGray rounded-semi hover:bg-brand-gray/20 transition-all"
          >
            <ChevronLeft size={20} className="mx-auto" />
          </button>
          <button 
            onClick={() => setBaseDate(new Date())}
            className="px-4 py-3 bg-brand-black text-white rounded-semi font-black text-[10px] uppercase"
          >
            HOY
          </button>
          <button 
            onClick={() => {
              const d = new Date(baseDate)
              d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 30))
              setBaseDate(d)
            }}
            className="flex-1 p-3 bg-brand-lightGray rounded-semi hover:bg-brand-gray/20 transition-all"
          >
            <ChevronRight size={20} className="mx-auto" />
          </button>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="flex-1 bg-white rounded-semi shadow-2xl border border-brand-gray/10 overflow-hidden flex flex-col min-h-[500px]">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table 
            className="w-full border-collapse table-fixed min-w-[max-content] transition-all origin-top-left"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
          >
            <thead className="sticky top-0 z-30">
              <tr className="bg-brand-black text-white">
                <th className="p-4 text-center font-black uppercase text-sm tracking-widest border-r border-white/10 sticky left-0 z-40 bg-brand-black w-[180px] min-w-[180px]">
                  FECHAS / SEMANAS
                </th>
                {filteredStock.map((item) => (
                  <th key={item.id} className="p-4 text-center border-r border-white/10 min-w-[180px] max-w-[180px] bg-brand-black align-top h-[130px]">
                    <div className="flex flex-col h-full justify-between items-center text-center">
                      <span className="font-black text-[13px] text-brand-blue uppercase leading-tight line-clamp-2">{item.tipo}</span>
                      <span className="text-[11px] text-white font-bold uppercase opacity-80">{item.marca || 'GENÉRICO'}</span>
                      <span className="text-[11px] text-brand-gray font-black uppercase">{item.color || 'SIN COLOR'}</span>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-white/20 rounded text-[11px] font-black border border-white/10">COD: {item.codigo}</span>
                        <span className="px-2 py-1 bg-brand-blue/30 rounded text-[11px] font-black border border-brand-blue/20">T: {item.talle}</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p, pIdx) => (
                <tr key={pIdx} className="border-b border-brand-gray/5 hover:bg-brand-lightGray/30 transition-colors">
                  <td className="p-6 border-r border-brand-gray/10 sticky left-0 z-20 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-[10px] text-brand-gray uppercase leading-tight tracking-widest opacity-60">
                        {p.label.split('\n')[0]}
                      </span>
                      <span className="font-black text-[18px] text-brand-blue bg-blue-50 py-2 rounded-semi border-2 border-brand-blue/20 shadow-sm block transform scale-y-110">
                        {p.label.split('\n')[1].replace('(', '').replace(')', '')}
                      </span>
                    </div>
                  </td>
                  {filteredStock.map((item) => {
                    const isAvailable = checkAvailability(item.id, p)
                    return (
                      <td 
                        key={item.id} 
                        className="p-1 border-r border-brand-gray/5"
                      >
                        <button
                          onClick={() => handleCellClick(item, p, isAvailable)}
                          className={`w-full h-14 rounded-semi transition-all flex flex-col items-center justify-center gap-1 group relative ${
                            isAvailable 
                              ? 'bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-200 shadow-sm' 
                              : 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed opacity-80'
                          }`}
                        >
                          {isAvailable ? (
                            <>
                              <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[8px] font-black uppercase">LIBRE</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={16} />
                              <span className="text-[8px] font-black uppercase">ALQUILADO</span>
                            </>
                          )}
                          
                          {isAvailable && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand-black text-white text-[8px] font-black py-2 px-3 rounded-semi opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-xl z-50 whitespace-nowrap uppercase tracking-widest">
                              RESERVAR ESTA FECHA
                            </div>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Alquiler */}
      {showAlquilerModal && (
        <AlquilerForm 
          onClose={() => {
            setShowAlquilerModal(false)
            setPreSelectedData(null)
          }}
          onSave={() => {
            setShowAlquilerModal(false)
            setPreSelectedData(null)
            fetchInitialData() // Refresh grid
          }}
          // We need to pass pre-filled data. I'll modify AlquilerForm next to accept these.
          {...preSelectedData} 
        />
      )}
    </div>
  )
}


