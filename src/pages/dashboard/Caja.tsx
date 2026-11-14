import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { 
  Wallet, ArrowUpRight, ArrowDownRight, Printer, CreditCard, 
  X, Plus, Minus, User, Banknote, Smartphone, Search, 
  Calendar, CalendarDays, History 
} from 'lucide-react'
import { formatMoney } from '../../utils/formatters'
import { CierreCajaModal } from '../../components/caja/CierreCajaModal'

export const Caja = () => {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCierreModal, setShowCierreModal] = useState(false)
  const [selectedMov, setSelectedMov] = useState<any | null>(null)
  
  // Modos de filtrado y búsqueda
  const [filterMode, setFilterMode] = useState<'diaria' | 'fecha' | 'total'>('diaria')
  const [fechaDesde, setFechaDesde] = useState(new Date().toLocaleDateString('sv-SE'))
  const [fechaHasta, setFechaHasta] = useState(new Date().toLocaleDateString('sv-SE'))
  const [searchTerm, setSearchTerm] = useState('')

  const [showManualModal, setShowManualModal] = useState<'ingreso' | 'egreso' | null>(null)
  const [manualData, setManualData] = useState({ monto: '', concepto: '', metodo: 'efectivo' })
  const [savingManual, setSavingManual] = useState(false)

  const formatInputMoney = (value: string) => {
    const rawValue = value.replace(/\D/g, "")
    if (!rawValue) return ""
    return new Intl.NumberFormat('es-AR').format(parseInt(rawValue))
  }

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputMoney(e.target.value)
    setManualData({ ...manualData, monto: formatted })
  }

  useEffect(() => {
    if (profile?.empresa_id) {
      fetchMovimientos()
    }
  }, [profile?.empresa_id, filterMode, fechaDesde, fechaHasta])

  const fetchMovimientos = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('caja')
        .select(`*, usuario:usuario_id (nombre)`)
        .eq('empresa_id', profile?.empresa_id)
        .order('fecha_movimiento', { ascending: false })

      if (filterMode === 'diaria') {
        // Movimientos desde el último cierre de caja o desde el inicio del día
        const { data: cierres } = await supabase
          .from('cierres_diarios')
          .select('fecha_cierre')
          .eq('empresa_id', profile?.empresa_id)
          .order('fecha_cierre', { ascending: false })
          .limit(1)
        
        const ultimoCierre = cierres && cierres.length > 0 ? cierres[0] : null
        const fechaReferencia = ultimoCierre?.fecha_cierre || new Date(new Date().setHours(0,0,0,0)).toISOString()
        query = query.gt('fecha_movimiento', fechaReferencia)
      } else if (filterMode === 'fecha') {
        if (fechaDesde) {
          query = query.gte('fecha_movimiento', `${fechaDesde}T00:00:00`)
        }
        if (fechaHasta) {
          query = query.lte('fecha_movimiento', `${fechaHasta}T23:59:59`)
        }
      }
      // Si filterMode === 'total', no se aplican filtros de fecha para cargar el historial completo

      const { data, error } = await query
      if (error) throw error
      setMovimientos(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanMonto = manualData.monto.replace(/\./g, "")
    if (!cleanMonto || !manualData.concepto) return
    setSavingManual(true)
    try {
      await supabase.from('caja').insert({
        empresa_id: profile?.empresa_id,
        usuario_id: profile?.id,
        tipo: showManualModal,
        monto: Number(cleanMonto),
        concepto: manualData.concepto.toUpperCase(),
        metodo_pago: manualData.metodo
      })
      setManualData({ monto: '', concepto: '', metodo: 'efectivo' })
      setShowManualModal(null)
      fetchMovimientos()
    } catch (err) { 
      console.error(err) 
    } finally { 
      setSavingManual(false) 
    }
  }

  // Filtrado de movimientos por texto de búsqueda
  const filteredMovimientos = movimientos.filter(mov => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    const concepto = (mov.concepto || '').toLowerCase()
    const usuario = (mov.usuario?.nombre || '').toLowerCase()
    const metodo = (mov.metodo_pago || '').toLowerCase()
    return concepto.includes(term) || usuario.includes(term) || metodo.includes(term)
  })

  // Cálculo de totales dinámicos
  const totales = filteredMovimientos.reduce((acc, mov) => {
    if (mov.tipo === 'ingreso') acc.ingresos += Number(mov.monto) || 0
    else acc.egresos += Number(mov.monto) || 0
    return acc
  }, { ingresos: 0, egresos: 0 })

  const saldoCaja = totales.ingresos - totales.egresos

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-2 uppercase tracking-tighter italic">
            <Wallet className="text-brand-blue" size={32} /> {t('modules.cash.title')}
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-widest">Resumen y control de movimientos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowManualModal('ingreso')} 
            className="px-4 py-3 bg-green-600 text-white font-black rounded-semi shadow-lg hover:bg-green-700 transition-all uppercase text-[10px] flex items-center gap-2 tracking-widest cursor-pointer"
          >
            <Plus size={16} /> Ingreso Manual
          </button>
          <button 
            onClick={() => setShowManualModal('egreso')} 
            className="px-4 py-3 bg-red-600 text-white font-black rounded-semi shadow-lg hover:bg-red-700 transition-all uppercase text-[10px] flex items-center gap-2 tracking-widest cursor-pointer"
          >
            <Minus size={16} /> Gasto / Egreso
          </button>
          <button 
            onClick={() => setShowCierreModal(true)} 
            disabled={movimientos.length === 0} 
            className={`px-6 py-3 font-black rounded-semi shadow-xl transition-all uppercase tracking-widest text-[10px] flex items-center gap-2 ${movimientos.length === 0 ? 'bg-brand-gray/20 text-brand-gray cursor-not-allowed' : 'bg-brand-black text-white hover:bg-brand-gray cursor-pointer'}`}
          >
            <Printer size={16} /> Cierre Diario
          </button>
        </div>
      </header>

      {/* PANEL DE BÚSQUEDA Y FILTROS POR FECHA / TOTAL */}
      <div className="bg-white p-4 md:p-6 rounded-semi shadow-xl border border-brand-gray/10 space-y-4">
        {/* BUSCADOR */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={20} />
          <input 
            type="text" 
            placeholder="BUSCAR EN CAJA POR CONCEPTO, RESPONSABLE O MÉTODO DE PAGO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-brand-lightGray border-none rounded-semi font-black outline-none focus:ring-2 focus:ring-brand-blue uppercase tracking-tighter text-sm"
          />
        </div>

        {/* BOTONES DE FILTRO + TOTAL EN VERDE */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 pt-3 border-t border-brand-gray/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('diaria')}
              className={`px-5 py-3 rounded-semi font-black uppercase text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                filterMode === 'diaria'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30'
                  : 'bg-brand-lightGray text-brand-black hover:bg-brand-gray/20'
              }`}
            >
              <Calendar size={16} />
              Caja Diaria
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('fecha')}
              className={`px-5 py-3 rounded-semi font-black uppercase text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                filterMode === 'fecha'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30'
                  : 'bg-brand-lightGray text-brand-black hover:bg-brand-gray/20'
              }`}
            >
              <CalendarDays size={16} />
              Caja por Fecha
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('total')}
              className={`px-5 py-3 rounded-semi font-black uppercase text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                filterMode === 'total'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30'
                  : 'bg-brand-lightGray text-brand-black hover:bg-brand-gray/20'
              }`}
            >
              <History size={16} />
              Caja Total
            </button>
          </div>

          {/* RANGO DE FECHAS (VISIBLE SI SELECCIONA 'CAJA POR FECHA') */}
          {filterMode === 'fecha' && (
            <div className="flex flex-wrap items-center gap-3 bg-brand-lightGray/70 p-2.5 rounded-semi border border-brand-gray/10 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-brand-gray tracking-wider">Desde:</span>
                <input 
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-brand-gray/20 rounded font-black text-xs outline-none focus:ring-2 focus:ring-brand-blue text-brand-black cursor-pointer uppercase"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-brand-gray tracking-wider">Hasta:</span>
                <input 
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-brand-gray/20 rounded font-black text-xs outline-none focus:ring-2 focus:ring-brand-blue text-brand-black cursor-pointer uppercase"
                />
              </div>
            </div>
          )}

          {/* TOTAL / SALDO EN VERDE EN UN RECUADRO */}
          <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-800 px-5 py-3 rounded-semi flex items-center justify-between xl:justify-end gap-5 shadow-sm self-stretch xl:self-auto">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">
                Saldo {filterMode === 'diaria' ? 'Caja Diaria' : filterMode === 'fecha' ? 'por Fecha' : 'Histórico Total'}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase">
                {filteredMovimientos.length} {filteredMovimientos.length === 1 ? 'movimiento' : 'movimientos'}
              </span>
            </div>
            <span className={`text-2xl md:text-3xl font-black tracking-tight font-mono ${saldoCaja >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatMoney(saldoCaja)}
            </span>
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN DE INGRESOS, EGRESOS Y SALDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl relative overflow-hidden group">
          <ArrowUpRight className="absolute -right-4 -top-4 w-20 h-20 opacity-5 text-green-500" />
          <p className="text-[10px] text-brand-gray uppercase font-black tracking-widest mb-1">Ingresos</p>
          <p className="text-3xl font-black text-green-500">{formatMoney(totales.ingresos)}</p>
        </div>
        <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl relative overflow-hidden group">
          <ArrowDownRight className="absolute -right-4 -top-4 w-20 h-20 opacity-5 text-red-500" />
          <p className="text-[10px] text-brand-gray uppercase font-black tracking-widest mb-1">Egresos</p>
          <p className="text-3xl font-black text-red-500">{formatMoney(totales.egresos)}</p>
        </div>
        <div className="bg-brand-black p-6 rounded-semi shadow-2xl border-b-4 border-brand-blue relative">
          <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Saldo en Caja</p>
          <p className={`text-4xl font-black ${saldoCaja >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatMoney(saldoCaja)}
          </p>
        </div>
      </div>

      {/* TABLA DE MOVIMIENTOS CON SCROLLBAR VERTICAL ACTIVA */}
      <div className="bg-white rounded-semi shadow-2xl border border-brand-gray/10 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[620px] custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-brand-black shadow-sm">
              <tr className="bg-brand-black text-white text-[10px] uppercase tracking-widest font-bold">
                <th className="p-4 w-36">Fecha/Hora</th>
                <th className="p-4">Concepto / Responsable</th>
                <th className="p-4 text-center">Método</th>
                <th className="p-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-brand-gray font-black uppercase text-xs animate-pulse">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-brand-gray font-black uppercase text-xs italic">
                    No hay movimientos registrados para este filtro
                  </td>
                </tr>
              ) : (
                filteredMovimientos.map(mov => (
                  <tr key={mov.id} className="hover:bg-brand-lightGray/30 transition-all group">
                    <td className="p-4">
                      <p className="text-[10px] font-black text-brand-black">
                        {new Date(mov.fecha_movimiento).toLocaleDateString()}
                      </p>
                      <p className="text-[9px] text-brand-gray font-bold uppercase">
                        {new Date(mov.fecha_movimiento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}hs
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-black text-brand-black text-xs uppercase italic leading-tight">
                        {mov.concepto}
                      </p>
                      <p className="text-[10px] font-bold text-brand-blue uppercase flex items-center gap-1 mt-1">
                        <User size={10} /> {mov.usuario?.nombre || 'Administrador'}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      {mov.metodo_pago === 'tarjeta' ? (
                        <button 
                          onClick={() => setSelectedMov(mov)} 
                          className="px-3 py-1 bg-brand-blue text-white rounded-full text-[9px] font-black uppercase flex items-center gap-1 mx-auto hover:bg-blue-600 shadow-md cursor-pointer"
                        >
                          <CreditCard size={10} /> Detalle
                        </button>
                      ) : (
                        <span className="px-2 py-1 bg-brand-lightGray text-brand-gray rounded text-[9px] font-black uppercase border border-brand-gray/10">
                          {mov.metodo_pago}
                        </span>
                      )}
                    </td>
                    <td className={`p-4 text-right font-black whitespace-nowrap min-w-[150px] ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-sm opacity-70">{mov.tipo === 'ingreso' ? '+' : '-'}</span>
                        <span className="text-base tracking-tighter">{formatMoney(mov.monto)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 bg-brand-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className={`p-6 text-white flex justify-between items-center ${showManualModal === 'ingreso' ? 'bg-green-600' : 'bg-red-600'}`}>
              <h4 className="font-black uppercase italic flex items-center gap-2">Registrar {showManualModal.toUpperCase()}</h4>
              <button onClick={() => setShowManualModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveManual} className="p-8 space-y-6">
              <div className="relative">
                <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Monto</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-brand-gray">$</span>
                  <input 
                    type="text" 
                    value={manualData.monto} 
                    onChange={handleMontoChange} 
                    className="w-full pl-10 pr-4 py-4 bg-brand-lightGray rounded-semi font-black text-2xl outline-none" 
                    placeholder="0" 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Motivo</label>
                <input 
                  type="text" 
                  value={manualData.concepto} 
                  onChange={e => setManualData({...manualData, concepto: e.target.value})} 
                  className="w-full px-4 py-3 bg-brand-lightGray rounded-semi font-black uppercase text-xs outline-none" 
                  placeholder="EJ: LUZ, LIMPIEZA..." 
                  required 
                />
              </div>
              <div>
                <label className="text-xs font-black text-brand-gray uppercase mb-1 block">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setManualData({...manualData, metodo: 'efectivo'})} 
                    className={`py-3 rounded font-black text-[9px] uppercase border-2 flex flex-col items-center gap-1 transition-all ${manualData.metodo === 'efectivo' ? 'border-brand-black bg-brand-black text-white shadow-lg' : 'border-brand-gray/20 text-brand-gray'}`}
                  >
                    <Banknote size={16} /> Efectivo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setManualData({...manualData, metodo: 'transferencia'})} 
                    className={`py-3 rounded font-black text-[9px] uppercase border-2 flex flex-col items-center gap-1 transition-all ${manualData.metodo === 'transferencia' ? 'border-brand-blue bg-blue-50 text-brand-blue shadow-lg' : 'border-brand-gray/20 text-brand-gray'}`}
                  >
                    <Smartphone size={16} /> Transf.
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setManualData({...manualData, metodo: 'tarjeta'})} 
                    className={`py-3 rounded font-black text-[9px] uppercase border-2 flex flex-col items-center gap-1 transition-all ${manualData.metodo === 'tarjeta' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg' : 'border-brand-gray/20 text-brand-gray'}`}
                  >
                    <CreditCard size={16} /> Tarjeta
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={savingManual} 
                className="w-full py-4 bg-brand-black text-white font-black rounded-semi uppercase text-xs tracking-widest shadow-xl cursor-pointer"
              >
                {savingManual ? 'GUARDANDO...' : 'Confirmar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedMov && (
        <div className="fixed inset-0 bg-brand-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 bg-brand-black text-white flex justify-between items-center">
              <h4 className="font-black uppercase italic tracking-tighter flex items-center gap-2 text-brand-blue">
                <CreditCard size={20} /> Detalle de Venta
              </h4>
              <button onClick={() => setSelectedMov(null)}><X size={20} /></button>
            </div>
            <div className="p-8 text-center space-y-6">
              <div>
                <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Responsable</p>
                <p className="text-xl font-black text-brand-black uppercase italic">{selectedMov.usuario?.nombre}</p>
              </div>
              <div className="py-4 border-y border-brand-gray/10">
                <p className="text-[10px] font-black text-brand-gray uppercase mb-2">Plan / Financiación</p>
                <p className="text-2xl font-black text-brand-blue uppercase italic">{selectedMov.concepto.split('-')[1]?.trim() || "Tarjeta Directa"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-brand-gray uppercase mb-1">Total</p>
                <p className="text-4xl font-black text-brand-black">{formatMoney(selectedMov.monto)}</p>
              </div>
              <button 
                onClick={() => setSelectedMov(null)} 
                className="w-full py-3 bg-brand-black text-white font-black rounded-semi uppercase text-xs tracking-widest cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCierreModal && (
        <CierreCajaModal 
          movimientosDia={movimientos}
          onClose={() => setShowCierreModal(false)}
          onSave={() => {
            fetchMovimientos()
            setShowCierreModal(false)
          }}
        />
      )}
    </div>
  )
}
