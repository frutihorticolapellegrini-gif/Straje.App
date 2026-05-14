import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Edit, BarChart2, Package } from 'lucide-react'
import { StockForm } from '../../components/stock/StockForm'
import { StockTotalsModal } from '../../components/stock/StockTotalsModal'
import { PedidoSugeridoModal } from '../../components/stock/PedidoSugeridoModal'
import { ImpresionPreciosModal } from '../../components/stock/ImpresionPreciosModal'
import { AjustePrecioModal } from '../../components/stock/AjustePrecioModal'
import { formatMoney } from '../../utils/formatters'
import { Printer, TrendingUp } from 'lucide-react'

export interface Prenda {
  id: string
  codigo: string
  tipo: string
  marca: string | null
  talle: string
  color: string | null
  costo: number
  precio_alquiler: number
  precio_venta: number | null
  estado: string
  atributos_extra: Record<string, any>
  unidades: number
  disponibles: number // Punto 8
  creado_en: string
}

export const Stock = () => {
  const { profile } = useAuth()
  const isDueno = profile?.rol === 'dueño' || profile?.rol === 'programador'

  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('Todos')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isTotalsOpen, setIsTotalsOpen] = useState(false)
  const [isPedidoSugeridoOpen, setIsPedidoSugeridoOpen] = useState(false)
  const [isPrintPreciosOpen, setIsPrintPreciosOpen] = useState(false)
  const [isAjustePrecioOpen, setIsAjustePrecioOpen] = useState(false)
  const [editingPrenda, setEditingPrenda] = useState<Prenda | null>(null)

  useEffect(() => {
    fetchStock()
  }, [])

  const fetchStock = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .eq('empresa_id', profile?.empresa_id)
        .order('creado_en', { ascending: false })

      if (error) throw error
      setPrendas(data as Prenda[])
    } catch (err) {
      console.error(err)
      alert('Error cargando inventario')
    } finally {
      setLoading(false)
    }
  }

  const tiposUnicos = Array.from(new Set(prendas.map(p => p.tipo))).filter(Boolean)
  const tabs = ['Todos', ...tiposUnicos]

  const filteredStock = prendas.filter(p => {
    const matchesSearch = p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.marca?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = activeTab === 'Todos' || p.tipo === activeTab
    return matchesSearch && matchesTab
  })

  const handleMarcarDisponible = async (prenda: Prenda) => {
    const confirmar = window.confirm(`¿Confirmas que el traje ${prenda.codigo} regresó de la lavandería?`);
    if (!confirmar) return;

    try {
      // Punto 15: Al volver de lavandería, se suma a disponibles
      const newDisp = Math.min(prenda.unidades, (prenda.disponibles || 0) + 1);
      
      const { error } = await supabase.from('stock').update({ 
        estado: 'disponible',
        disponibles: newDisp
      }).eq('id', prenda.id)
      
      if (error) throw error

      await supabase.from('historial_stock').insert({
        empresa_id: profile?.empresa_id,
        prenda_id: prenda.id,
        tipo_movimiento: 'lavanderia',
        cantidad: 1,
        motivo: 'Regreso de lavandería - Unidad disponible',
        usuario_id: profile?.id
      })

      fetchStock()
    } catch (err) {
      console.error(err)
      alert('Error al actualizar el estado')
    }
  }

  const handleImprimirInventario = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <html>
        <head>
          <title>INVENTARIO - STRAJE.APP</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; text-transform: uppercase; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            h1 { margin: 0; font-size: 18px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>STRAJE.APP - REPORTE DE INVENTARIO</h1>
            <p>FECHA: ${new Date().toLocaleDateString()} - FILTRO: ${activeTab}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>COD.</th>
                <th>TIPO</th>
                <th>MARCA</th>
                <th>TALLE</th>
                <th>ESTADO</th>
                <th>DISP.</th>
                <th>ALQUILER</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStock.map(p => `
                <tr>
                  <td>${p.codigo}</td>
                  <td>${p.tipo}</td>
                  <td>${p.marca || ''}</td>
                  <td>${p.talle}</td>
                  <td>${p.estado}</td>
                  <td>${p.disponibles}</td>
                  <td>$${p.precio_alquiler.toLocaleString()}</td>
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-2 uppercase tracking-tighter italic">
            <Package size={32} className="text-brand-blue" /> Gestión de Inventario
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-widest">Control centralizado de todas tus prendas y stock.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {isDueno && (
            <>
              <button 
                onClick={() => setIsTotalsOpen(true)}
                className="flex-1 md:flex-none px-6 py-3 bg-brand-black text-white rounded-semi font-black flex items-center justify-center gap-2 hover:bg-brand-gray transition-all uppercase text-xs tracking-widest shadow-xl border-b-4 border-brand-blue"
              >
                <BarChart2 size={18} /> Balance Total
              </button>
              <button 
                onClick={() => setIsPedidoSugeridoOpen(true)}
                className="flex-1 md:flex-none px-6 py-3 bg-[#009EE3] text-white rounded-semi font-black flex items-center justify-center gap-2 hover:bg-blue-600 transition-all uppercase text-xs tracking-widest shadow-xl border-b-4 border-blue-800"
              >
                Armar Pedido
              </button>
            </>
          )}
          <button 
            onClick={() => { setEditingPrenda(null); setIsFormOpen(true) }}
            className="flex-1 md:flex-none px-4 py-2 bg-brand-blue text-white rounded-semi font-black flex items-center justify-center gap-1 hover:bg-blue-600 shadow-xl shadow-brand-blue/30 transition-all uppercase text-[10px] tracking-tighter"
          >
            <Plus size={14} /> Nueva
          </button>
          <button 
            onClick={() => setIsPrintPreciosOpen(true)}
            className="flex-1 md:flex-none px-4 py-2 bg-white text-brand-black border-2 border-brand-black rounded-semi font-black flex items-center justify-center gap-1 hover:bg-brand-lightGray transition-all uppercase text-[10px] tracking-tighter"
          >
            <Printer size={14} /> Precios
          </button>
          {isDueno && (
            <button 
              onClick={() => setIsAjustePrecioOpen(true)}
              className="flex-1 md:flex-none px-4 py-2 bg-amber-500 text-white rounded-semi font-black flex items-center justify-center gap-1 hover:bg-amber-600 transition-all uppercase text-[10px] tracking-tighter shadow-lg border-b-2 border-amber-700"
            >
              <TrendingUp size={14} /> Aumento/Baja
            </button>
          )}
          <button 
            onClick={handleImprimirInventario}
            className="flex-1 md:flex-none p-2 bg-brand-lightGray text-brand-black rounded-semi hover:bg-brand-gray/20 transition-all"
            title="Imprimir Tabla Actual"
          >
            <Printer size={14} />
          </button>
        </div>
      </header>

      {/* Buscador y Tabs */}
      <div className="bg-white p-4 rounded-semi shadow-xl border border-brand-gray/10 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={20} />
          <input 
            type="text"
            placeholder="BUSCAR POR CÓDIGO, TIPO O MARCA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase tracking-tighter"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-semi font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-brand-black text-white shadow-lg' : 'bg-brand-lightGray text-brand-gray hover:text-brand-black'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Pro */}
      <div className="bg-white rounded-semi shadow-2xl border border-brand-gray/10 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-black text-white text-[10px] uppercase tracking-widest font-bold">
              <th className="p-4">Cód.</th>
              <th className="p-4">Prenda</th>
              <th className="p-4">Talle/Color</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Disponibles</th>
              <th className="p-4 text-right">Alquiler</th>
              {isDueno && <th className="p-4 text-right">Costo</th>}
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray/10">
            {loading ? (
              <tr><td colSpan={8} className="p-12 text-center text-brand-gray animate-pulse font-black uppercase text-xs tracking-widest">Cargando Inventario...</td></tr>
            ) : filteredStock.length === 0 ? (
              <tr><td colSpan={8} className="p-12 text-center text-brand-gray font-black uppercase text-xs tracking-widest italic">No se encontraron prendas</td></tr>
            ) : (
              filteredStock.map(prenda => {
                const stockMinimo = prenda.atributos_extra?.stock_minimo || 0;
                const isAlertaStock = stockMinimo > 0 && prenda.disponibles <= stockMinimo;

                return (
                <tr key={prenda.id} className={`hover:bg-brand-lightGray/30 transition-all group ${isAlertaStock ? 'bg-red-50/50' : ''}`}>
                  <td className="p-4 font-black text-brand-black font-mono text-sm uppercase tracking-tighter">
                    {prenda.codigo}
                  </td>
                  <td className="p-4">
                    <p className="font-black text-brand-dark uppercase text-xs">{prenda.tipo}</p>
                    <p className="text-[10px] text-brand-gray font-bold uppercase">{prenda.marca}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-black text-brand-black bg-brand-lightGray px-2 py-1 rounded-semi">T{prenda.talle}</span>
                    <span className="text-[10px] text-brand-gray font-bold uppercase ml-2">{prenda.color}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-semi text-[10px] font-black uppercase tracking-tighter border ${
                      prenda.estado === 'disponible' ? 'bg-green-50 text-green-600 border-green-200' : 
                      prenda.estado === 'alquilado' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      {prenda.estado}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-black text-lg tracking-tighter ${prenda.disponibles === 0 || isAlertaStock ? 'text-red-600' : 'text-brand-black'}`}>
                        {prenda.disponibles}
                      </span>
                      <p className="text-[9px] text-brand-gray font-black uppercase tracking-tighter">de {prenda.unidades} tot.</p>
                      {isAlertaStock && <p className="text-[9px] text-red-600 font-black uppercase tracking-widest mt-1 animate-pulse">¡Stock Bajo!</p>}
                    </div>
                  </td>
                  <td className="p-4 text-right font-black text-brand-blue text-sm">
                    {prenda.precio_alquiler === 0 ? 'SOLO VENTA' : formatMoney(prenda.precio_alquiler)}
                  </td>
                  {isDueno && (
                    <td className="p-4 text-right text-brand-gray font-bold text-xs italic">
                      {formatMoney(prenda.costo)}
                    </td>
                  )}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {prenda.estado === 'lavanderia' && (
                        <button onClick={() => handleMarcarDisponible(prenda)} className="p-1 px-3 text-[10px] font-black text-blue-600 hover:text-white border-2 border-blue-600 hover:bg-blue-600 rounded-semi transition-all uppercase tracking-widest shadow-md shadow-blue-500/20">
                          Limpiado
                        </button>
                      )}
                      {isDueno && (
                        <button onClick={() => { setEditingPrenda(prenda); setIsFormOpen(true) }} className="p-2 text-brand-gray hover:text-brand-blue hover:bg-blue-50 rounded-semi transition-colors">
                          <Edit size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <StockForm prenda={editingPrenda} categoriasExistentes={tiposUnicos} onClose={() => setIsFormOpen(false)} onSave={fetchStock} />
      )}
      
      {isTotalsOpen && (
        <StockTotalsModal prendas={prendas} onClose={() => setIsTotalsOpen(false)} />
      )}
      
      {isPedidoSugeridoOpen && (
        <PedidoSugeridoModal prendas={prendas} onClose={() => setIsPedidoSugeridoOpen(false)} />
      )}
      
      {isPrintPreciosOpen && (
        <ImpresionPreciosModal prendas={prendas} onClose={() => setIsPrintPreciosOpen(false)} />
      )}

      {isAjustePrecioOpen && (
        <AjustePrecioModal 
          prendas={prendas} 
          empresaId={profile?.empresa_id || ''} 
          onClose={() => setIsAjustePrecioOpen(false)} 
          onSuccess={fetchStock} 
        />
      )}
    </div>
  )
}
