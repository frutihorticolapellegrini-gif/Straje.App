import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { Calendar, Filter, FileText, ArrowUpRight, ArrowDownRight, Scale, CreditCard, Printer, MessageCircle } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'

export const Historial = () => {
  const { profile } = useAuth()
  const { t } = useLanguage()
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

  const handleWhatsApp = async () => {
    const el = document.getElementById('historial-capture');
    if (!el) return;
    setLoading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, { quality: 0.95, backgroundColor: '#fff' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `historial-caja.png`, { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Historial de Caja',
          text: `Adjunto el historial de caja.`
        });
      } else {
        const link = document.createElement('a');
        link.download = `historial-caja.png`;
        link.href = dataUrl;
        link.click();
        
        window.open(`https://wa.me/?text=${encodeURIComponent("Adjunto el historial de caja. (Por favor, pega la imagen que se acaba de descargar)")}`, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert("Error al generar la imagen.");
    } finally {
      setLoading(false);
    }
  }

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0)
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0)
  const saldoNeto = totalIngresos - totalEgresos

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-2 uppercase tracking-tighter italic">
            <FileText className="text-brand-blue" size={32} /> {t('modules.cash_history.title')}
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-wider">{t('modules.cash_history.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleImprimirHistorial}
            className="flex items-center gap-2 p-3 bg-white text-brand-black border-2 border-brand-black rounded-semi hover:bg-brand-lightGray transition-all font-bold text-xs uppercase"
            title="Imprimir Historial"
          >
            <Printer size={18} /> {t('modules.cash_history.print_btn')}
          </button>
          <button 
            onClick={handleWhatsApp} 
            className="flex items-center gap-2 p-3 bg-[#25D366] text-white rounded-semi hover:bg-[#1ebd5a] transition-all font-bold text-xs uppercase shadow-xl" 
            title="Compartir por WhatsApp"
          >
            <MessageCircle size={18} /> WhatsApp
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl relative overflow-hidden">
          <ArrowUpRight className="absolute -right-4 -top-4 w-20 h-20 opacity-5 text-green-500" />
          <p className="text-[10px] text-brand-gray uppercase font-black tracking-widest mb-1">{t('modules.cash_history.income')}</p>
          <p className="text-3xl font-black text-green-500">{formatMoney(totalIngresos)}</p>
        </div>
        <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl relative overflow-hidden">
          <ArrowDownRight className="absolute -right-4 -top-4 w-20 h-20 opacity-5 text-red-500" />
          <p className="text-[10px] text-brand-gray uppercase font-black tracking-widest mb-1">{t('modules.cash_history.expenses')}</p>
          <p className="text-3xl font-black text-red-500">{formatMoney(totalEgresos)}</p>
        </div>
        <div className="bg-brand-black p-6 rounded-semi shadow-2xl relative overflow-hidden border-b-4 border-brand-blue text-center">
          <Scale className="absolute -right-4 -top-4 w-20 h-20 opacity-10 text-brand-blue" />
          <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">{t('modules.cash_history.net_balance')}</p>
          <p className="text-4xl font-black text-white">{formatMoney(saldoNeto)}</p>
        </div>
      </div>

      <div className="bg-brand-white p-4 rounded-semi shadow-xl border border-brand-gray/10 space-y-4">
        <div className="flex flex-wrap items-center gap-4 border-b border-brand-gray/10 pb-4">
          <div className="flex gap-2 bg-brand-lightGray p-1 rounded-semi">
            {(['hoy', '30dias', '6meses', 'todo'] as const).map(f => (
              <button key={f} onClick={() => setRangoRapido(f)}
                className={`px-4 py-2 rounded-semi text-[10px] font-black uppercase transition-all ${rangoRapido === f ? 'bg-brand-black text-white shadow-lg' : 'text-brand-gray hover:text-brand-black'}`}>
                {f === 'hoy' ? t('modules.cash_history.range_today') : f === '30dias' ? t('modules.cash_history.range_30days') : f === '6meses' ? t('modules.cash_history.range_6months') : t('modules.cash_history.range_all')}
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
              <option value="todos">{t('modules.cash_history.filter_all')}</option>
              <option value="ingreso">{t('modules.cash_history.filter_income')}</option>
              <option value="egreso">{t('modules.cash_history.filter_expenses')}</option>
            </select>
            <select value={metodoFiltro} onChange={e => setMetodoFiltro(e.target.value)}
              className="bg-brand-lightGray px-4 py-2 rounded-semi font-bold text-[10px] uppercase outline-none border border-brand-gray/10">
              <option value="todos">{t('modules.cash_history.filter_methods_all')}</option>
              <option value="efectivo">{t('modules.cash_history.filter_cash')}</option>
              <option value="transferencia">{t('modules.cash_history.filter_transfer')}</option>
              <option value="tarjeta">{t('modules.cash_history.filter_card')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-semi shadow-2xl border border-brand-gray/10 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-brand-black text-white text-[10px] uppercase tracking-widest font-bold">
                <th className="p-4 w-40">{t('modules.cash_history.th_datetime')}</th>
                <th className="p-4">{t('modules.cash_history.th_concept')}</th>
                <th className="p-4 text-center w-32">{t('modules.cash_history.th_method')}</th>
                <th className="p-4 w-48">{t('modules.cash_history.th_responsible')}</th>
                <th className="p-4 text-right w-40">{t('modules.cash_history.th_final_amount')}</th>
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

      {/* HIDDEN WHATSAPP CAPTURE CONTAINER */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div id="historial-capture" style={{ width: '800px', backgroundColor: '#fff', padding: '20px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px' }}>STRAJE.APP - REPORTE DE CAJA</h1>
            <p style={{ margin: '5px 0 0 0' }}>PERIODO: {fechaDesde} AL {fechaHasta}</p>
          </div>
          <div style={{ margin: '20px 0', padding: '10px', border: '2px solid #000' }}>
            <p style={{ margin: '5px 0' }}><strong>TOTAL INGRESOS:</strong> {formatMoney(totalIngresos)}</p>
            <p style={{ margin: '5px 0' }}><strong>TOTAL EGRESOS:</strong> {formatMoney(totalEgresos)}</p>
            <p style={{ margin: '5px 0' }}><strong>SALDO NETO:</strong> {formatMoney(saldoNeto)}</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '15px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>FECHA</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>CONCEPTO</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>METODO</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>TIPO</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>MONTO</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id}>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{new Date(m.fecha_movimiento).toLocaleDateString()}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{m.concepto}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{m.metodo_pago}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{m.tipo}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{formatMoney(m.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
