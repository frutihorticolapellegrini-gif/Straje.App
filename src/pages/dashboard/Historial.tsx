import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Calendar, Filter, FileText, ArrowUpRight, ArrowDownRight, Scale, CreditCard, Printer } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'

export const Historial = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [movimientos, setMovimientos] = useState<any[]>([])

  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [rangoRapido, setRangoRapido] = useState('30dias')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [metodoFiltro, setMetodoFiltro] = useState('todos')

  useEffect(() => {
    aplicarRangoRapido(rangoRapido)
  }, [rangoRapido])

  const aplicarRangoRapido = (rango: string) => {
    const hoy = new Date()
    let desde = new Date()
    if (rango === 'hoy') {
      desde.setHours(0,0,0,0)
    } else if (rango === '30dias') {
      desde.setDate(hoy.getDate() - 30)
    } else if (rango === '6meses') {
      desde.setMonth(hoy.getMonth() - 6)
    } else if (rango === 'todo') {
      desde = new Date('2020-01-01')
    }
    setFechaHasta(hoy.toISOString().split('T')[0])
    setFechaDesde(desde.toISOString().split('T')[0])
  }

  useEffect(() => {
    if (fechaDesde && fechaHasta) {
      fetchHistorial()
    }
  }, [fechaDesde, fechaHasta, tipoFiltro, metodoFiltro])

  const fetchHistorial = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('caja')
        .select(`*, usuario:usuario_id (nombre)`)
        .eq('empresa_id', profile?.empresa_id)
        .gte('fecha_movimiento', `${fechaDesde}T00:00:00.000Z`)
        .lte('fecha_movimiento', `${fechaHasta}T23:59:59.999Z`)
        .order('fecha_movimiento', { ascending: false })

      if (tipoFiltro !== 'todos') query = query.eq('tipo', tipoFiltro)
      if (metodoFiltro !== 'todos') query = query.eq('metodo_pago', metodoFiltro)

      const { data, error } = await query
      if (error) throw error
      setMovimientos(data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const handleImprimirHistorial = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const html = `
      <html>
        <head>
          <title>REPORTE DE CAJA - STRAJE.APP</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; text-transform: uppercase; font-size: 9px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { background-color: #f0f0f0; }
            .summary { margin: 20px 0; padding: 10px; border: 2px solid #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>STRAJE.APP - REPORTE DE CAJA</h1>
            <p>PERIODO: ${fechaDesde} AL ${fechaHasta}</p>
          </div>
          <div class="summary">
            <p><strong>TOTAL INGRESOS:</strong> ${formatMoney(totalIngresos)}</p>
            <p><strong>TOTAL EGRESOS:</strong> ${formatMoney(totalEgresos)}</p>
            <p><strong>SALDO NETO:</strong> ${formatMoney(saldoNeto)}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>FECHA</th>
                <th>CONCEPTO</th>
                <th>METODO</th>
                <th>TIPO</th>
                <th>MONTO</th>
              </tr>
            </thead>
            <tbody>
              ${movimientos.map(m => `
                <tr>
                  <td>${new Date(m.fecha_movimiento).toLocaleDateString()}</td>
                  <td>${m.concepto}</td>
                  <td>${m.metodo_pago}</td>
                  <td>${m.tipo}</td>
                  <td>${formatMoney(m.monto)}</td>
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

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0)
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0)
  const saldoNeto = totalIngresos - totalEgresos

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-2 uppercase tracking-tighter italic">
            <FileText className="text-brand-blue" size={32} /> Historial General de Caja
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-wider">Balance global y auditoría de todos los movimientos.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleImprimirHistorial}
            className="p-3 bg-white text-brand-black border-2 border-brand-black rounded-semi hover:bg-brand-lightGray transition-all"
            title="Imprimir Historial"
          >
            <Printer size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl relative overflow-hidden">
          <ArrowUpRight className="absolute -right-4 -top-4 w-20 h-20 opacity-5 text-green-500" />
          <p className="text-[10px] text-brand-gray uppercase font-black tracking-widest mb-1">Ingresos</p>
          <p className="text-3xl font-black text-green-500">{formatMoney(totalIngresos)}</p>
        </div>
        <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl relative overflow-hidden">
          <ArrowDownRight className="absolute -right-4 -top-4 w-20 h-20 opacity-5 text-red-500" />
          <p className="text-[10px] text-brand-gray uppercase font-black tracking-widest mb-1">Egresos / Gastos</p>
          <p className="text-3xl font-black text-red-500">{formatMoney(totalEgresos)}</p>
        </div>
        <div className="bg-brand-black p-6 rounded-semi shadow-2xl relative overflow-hidden border-b-4 border-brand-blue text-center">
          <Scale className="absolute -right-4 -top-4 w-20 h-20 opacity-10 text-brand-blue" />
          <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Saldo Neto del Período</p>
          <p className="text-4xl font-black text-white">{formatMoney(saldoNeto)}</p>
        </div>
      </div>

      <div className="bg-brand-white p-4 rounded-semi shadow-xl border border-brand-gray/10 space-y-4">
        <div className="flex flex-wrap items-center gap-4 border-b border-brand-gray/10 pb-4">
          <div className="flex gap-2 bg-brand-lightGray p-1 rounded-semi">
            {(['hoy', '30dias', '6meses', 'todo'] as const).map(f => (
              <button key={f} onClick={() => setRangoRapido(f)}
                className={`px-4 py-2 rounded-semi text-[10px] font-black uppercase transition-all ${rangoRapido === f ? 'bg-brand-black text-white shadow-lg' : 'text-brand-gray hover:text-brand-black'}`}>
                {f === 'hoy' ? 'Hoy' : f === '30dias' ? '30 Días' : f === '6meses' ? '6 Meses' : 'Todo'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 bg-brand-lightGray px-3 py-2 rounded-semi border border-brand-gray/10">
              <Calendar size={14} className="text-brand-blue" />
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="bg-transparent font-bold text-xs outline-none" />
              <span className="text-brand-gray font-black">/</span>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="bg-transparent font-bold text-xs outline-none" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-brand-blue" />
            <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}
              className="bg-brand-lightGray px-4 py-2 rounded-semi font-bold text-[10px] uppercase outline-none border border-brand-gray/10">
              <option value="todos">Todos los Movimientos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
            </select>
            <select value={metodoFiltro} onChange={e => setMetodoFiltro(e.target.value)}
              className="bg-brand-lightGray px-4 py-2 rounded-semi font-bold text-[10px] uppercase outline-none border border-brand-gray/10">
              <option value="todos">Todos los Métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-semi shadow-2xl border border-brand-gray/10 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-brand-black text-white text-[10px] uppercase tracking-widest font-bold">
                <th className="p-4 w-40">Fecha y Hora</th>
                <th className="p-4">Concepto / Detalle Operativo</th>
                <th className="p-4 text-center w-32">Método</th>
                <th className="p-4 w-48">Responsable</th>
                <th className="p-4 text-right w-40">Monto Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-brand-gray animate-pulse font-bold uppercase text-xs tracking-widest">Consultando Registros...</td></tr>
              ) : movimientos.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-brand-gray font-bold uppercase text-xs">No hay datos para mostrar</td></tr>
              ) : (
                movimientos.map(mov => (
                  <tr key={mov.id} className="hover:bg-brand-lightGray/30 transition-all group">
                    <td className="p-4">
                      <p className="text-[10px] font-bold text-brand-black">{new Date(mov.fecha_movimiento).toLocaleDateString()}</p>
                      <p className="text-[9px] text-brand-gray font-medium">{new Date(mov.fecha_movimiento).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}hs</p>
                    </td>
                    <td className="p-4">
                      <p className="font-black text-brand-black text-xs uppercase leading-tight max-w-xs break-words">{mov.concepto}</p>
                      <p className={`text-[9px] font-black uppercase mt-1 ${mov.tipo === 'ingreso' ? 'text-green-500' : 'text-red-500'}`}>Registro de {mov.tipo}</p>
                    </td>
                    <td className="p-4 text-center">
                      {/* Punto 1: Mostrar cuotas si es tarjeta */}
                      {mov.metodo_pago === 'tarjeta' ? (
                        <div className="group/cuotas relative inline-block">
                          <span className="px-3 py-1 bg-brand-blue text-white rounded-semi text-[9px] font-black uppercase flex items-center gap-1 cursor-help">
                            <CreditCard size={10} /> Tarjeta
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-brand-black text-white text-[9px] font-bold rounded-semi opacity-0 group-hover/cuotas:opacity-100 transition-opacity z-10 text-center shadow-xl">
                            VERIFICAR EN VENTAS/ALQUILERES PARA DETALLE DE CUOTAS
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-brand-lightGray text-brand-gray border border-brand-gray/10 rounded text-[9px] font-black uppercase">
                          {mov.metodo_pago}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-bold text-brand-blue uppercase">{mov.usuario?.nombre}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className={`text-lg font-black tracking-tighter ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.tipo === 'ingreso' ? '+' : '-'} {formatMoney(mov.monto)}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
