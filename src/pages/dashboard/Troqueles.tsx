import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Scissors, Printer, History, LayoutGrid, Search, MessageCircle, Clock } from 'lucide-react'
import { toPng } from 'html-to-image'

interface Troquel {
  id: string
  cliente_nombre: string
  cliente_telefono?: string
  fecha_retiro: string
  fecha_alquiler: string
  detalle_prendas: string
  numero_azar: string
  estado: string
}

export const Troqueles = () => {
  const { profile, empresa } = useAuth()
  const [troqueles, setTroqueles] = useState<Troquel[]>([])
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [showImpresos, setShowImpresos] = useState(false)

  useEffect(() => {
    fetchTroqueles()
  }, [])

  const fetchTroqueles = async () => {
    setLoading(true)
    try {
      // Traemos todos para el historial
      const { data, error } = await supabase
        .from('troqueles')
        .select('*')
        .eq('empresa_id', profile?.empresa_id)
        .order('creado_en', { ascending: false })

      if (error) throw error
      setTroqueles(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleImprimirHoja = async (troquelesAImprimir: Troquel[]) => {
    if (troquelesAImprimir.length === 0) return
    setPrinting(true)

    const html = `
      <html>
        <head>
          <title>HOJA_TROQUELES_${new Date().getTime()}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 0;
              width: 210mm;
              height: 297mm;
            }
            .grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              grid-template-rows: repeat(4, 1fr); 
              gap: 2mm; 
              padding: 10mm;
              height: 297mm;
              box-sizing: border-box;
            }
            .troquel {
              border: 1px solid #000;
              padding: 10px;
              display: flex;
              flex-direction: column;
              height: 65mm; /* Ajuste para que 4 entren en 297mm */
              box-sizing: border-box;
              text-align: center;
              position: relative;
              background: #fff;
              overflow: hidden;
            }
            .name { font-size: 18px; font-weight: 900; line-height: 1; text-transform: uppercase; margin-bottom: 2px; }
            .phone { font-size: 10px; font-weight: 700; color: #333; margin-bottom: 5px; }
            .box-date { border: 2px solid #000; padding: 4px; margin: 2px 0; }
            .box-date .label { font-size: 7px; font-weight: 900; background: #000; color: #fff; display: inline-block; padding: 1px 4px; margin-bottom: 2px; }
            .box-date .val { font-size: 16px; font-weight: 900; }
            .azar-code { background: #000; color: #fff; font-size: 36px; font-weight: 900; padding: 2px 0; margin-top: 2px; line-height: 1; }
            .date-rental { font-size: 6px; color: #666; position: absolute; bottom: 2px; right: 5px; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${troquelesAImprimir.map(t => `
              <div class="troquel">
                <div class="name">${t.cliente_nombre}</div>
                <div class="phone">${t.cliente_telefono || 'S/N'}</div>
                <div class="box-date">
                  <div class="label">FECHA DE RETIRO</div>
                  <div class="val">${new Date(t.fecha_retiro).toLocaleDateString()}</div>
                </div>
                <div class="azar-code">${t.numero_azar}</div>
                <div class="box-date" style="margin-top: 5px; border-width: 3px;">
                  <div class="label" style="background: #000;">DETALLE PRENDA</div>
                  <div class="val" style="font-size: 16px; padding: 5px; line-height: 1.1;">${t.detalle_prendas}</div>
                </div>
                <div class="date-rental">RESERVA: ${new Date(t.fecha_alquiler).toLocaleDateString()}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `

    const win = window.open('', '', 'width=800,height=1000')
    win?.document.write(html)
    win?.document.close()
    
    setTimeout(async () => {
      win?.print()
      const ids = troquelesAImprimir.map(t => t.id)
      await supabase.from('troqueles').update({ estado: 'impreso' }).in('id', ids)
      fetchTroqueles()
      setPrinting(false)
    }, 1000)
  }

  const handleCompartirTroquel = async (t: Troquel) => {
    const el = document.getElementById(`troquel-capture-${t.id}`);
    if (!el) return;
    
    try {
      const dataUrl = await toPng(el, { quality: 0.95, backgroundColor: '#fff' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `troquel-${t.cliente_nombre}.png`, { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Troquel de Retiro',
          text: `Hola ${t.cliente_nombre}, este es tu comprobante de retiro.`
        });
      } else {
        const link = document.createElement('a');
        link.download = `troquel-${t.cliente_nombre}.png`;
        link.href = dataUrl;
        link.click();
        alert("Imagen descargada. Por favor, adjúntala en WhatsApp.");
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredTroqueles = troqueles.filter(t => 
    t.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.numero_azar.includes(searchTerm)
  )

  const troquelesFiltradosA4 = troqueles.filter(t => t.estado === (showImpresos ? 'impreso' : 'pendiente'))
  const totalPages = Math.ceil(troquelesFiltradosA4.length / 8)
  const troquelesAImprimir = troquelesFiltradosA4.slice(currentPage * 8, (currentPage * 8) + 8)

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-3 uppercase tracking-tighter italic">
            <Scissors className="text-violet-600" size={32} /> Gestión de Troqueles
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-widest mt-1">
            {showImpresos ? 'Revisando Troqueles ya Impresos' : 'Listos para Imprimir'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setShowImpresos(!showImpresos); setCurrentPage(0); }}
            className={`px-6 py-4 rounded-semi font-black uppercase text-[10px] tracking-widest transition-all border-2 ${showImpresos ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white border-brand-gray/20 text-brand-gray hover:border-brand-black hover:text-brand-black'}`}
          >
            {showImpresos ? 'Ver Pendientes' : 'Ver Últimos Impresos'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* LADO IZQUIERDO: VISTA PREVIA A4 */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-semi border border-brand-gray/10 shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter italic flex items-center gap-2">
                  <LayoutGrid className="text-brand-blue" /> Hoja A4 - {showImpresos ? 'RE-IMPRESIÓN' : 'PÁGINA'} {currentPage + 1}
                </h3>
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentPage(i)}
                      className={`w-6 h-6 rounded text-[10px] font-black transition-all ${currentPage === i ? 'bg-brand-black text-white' : 'bg-brand-lightGray text-brand-gray hover:bg-brand-gray/50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {totalPages > 1 && (
                    <span className="text-[10px] font-black text-brand-blue uppercase ml-2 animate-pulse">¡HAY MÁS HOJAS!</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleImprimirHoja(troquelesAImprimir)}
                disabled={troquelesAImprimir.length === 0 || printing}
                className={`px-8 py-4 rounded-semi font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 transition-all ${showImpresos ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-brand-black text-white hover:bg-brand-gray'} disabled:opacity-30`}
              >
                <Printer size={20} /> {printing ? 'PROCESANDO...' : showImpresos ? 'RE-IMPRIMIR HOJA' : 'IMPRIMIR HOJA'}
              </button>
            </div>

            <div className="bg-brand-lightGray/30 p-6 rounded border-2 border-dashed border-brand-gray/20">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => {
                  const t = troquelesAImprimir[i];
                  return (
                    <div key={i} className={`h-[200px] border-2 border-dashed rounded-semi flex flex-col p-4 transition-all duration-500 ${t ? 'bg-white border-brand-black shadow-lg' : 'bg-brand-lightGray/50 border-brand-gray/10'}`}>
                      {t ? (
                        <>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[7px] font-black bg-brand-black text-white px-1.5 py-0.5 rounded uppercase italic">RESERVA</span>
                            <span className="text-[8px] font-bold text-brand-gray">{new Date(t.fecha_alquiler).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[14px] font-black text-brand-black uppercase leading-none tracking-tighter truncate">{t.cliente_nombre}</p>
                          <p className="text-[9px] font-bold text-brand-gray mb-1">{t.cliente_telefono || 'S/N'}</p>
                          <div className="bg-white border-2 border-brand-black p-1 rounded-sm text-center mb-1">
                            <p className="text-[6px] font-black uppercase text-brand-gray">FECHA DE RETIRO</p>
                            <p className="text-[14px] font-black text-brand-black leading-none">{new Date(t.fecha_retiro).toLocaleDateString()}</p>
                          </div>
                          <div className="bg-brand-black text-white py-1 rounded-sm text-center">
                            <p className="text-2xl font-black tracking-widest">{t.numero_azar}</p>
                          </div>
                          <div className="bg-white border-2 border-brand-black p-1 rounded-sm text-center mt-1">
                            <p className="text-[6px] font-black uppercase text-brand-gray">DETALLE PRENDA</p>
                            <p className="text-[12px] font-black text-brand-black leading-tight line-clamp-2">{t.detalle_prendas}</p>
                          </div>
                        </>
                      ) : (
                        <div className="m-auto opacity-20 text-center uppercase font-black text-[10px]">Vacío</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: HISTORIAL COMPLETO */}
        <div className="xl:col-span-4 h-full">
          <div className="bg-white p-6 rounded-semi border border-brand-gray/10 shadow-xl flex flex-col h-[750px] sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <History className="text-brand-gray" />
              <h3 className="font-black uppercase tracking-tighter text-brand-black">Historial Completo</h3>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
              <input 
                type="text" 
                placeholder="BUSCAR CLIENTE O CÓDIGO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-brand-lightGray border-none rounded-semi font-bold outline-none focus:ring-2 focus:ring-brand-blue uppercase text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {loading ? (
                <div className="p-12 text-center animate-pulse uppercase font-black text-brand-gray text-[10px]">Cargando Historial...</div>
              ) : filteredTroqueles.map(t => (
                <div key={t.id} className="bg-brand-lightGray/20 p-4 rounded-semi border border-brand-gray/5 hover:border-brand-blue/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-black text-brand-black uppercase text-xs truncate max-w-[150px]">{t.cliente_nombre}</p>
                    <span className="text-xs font-black text-violet-600">#{t.numero_azar}</span>
                  </div>
                  <div className="text-[9px] font-bold text-brand-gray uppercase mb-3 flex items-center gap-2">
                    <Clock size={10} /> Retiro: {new Date(t.fecha_retiro).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCompartirTroquel(t)}
                      className="flex-1 bg-brand-blue/10 text-brand-blue py-2 rounded font-black text-[8px] uppercase hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={12} /> Imagen WhatsApp
                    </button>
                    <button 
                      onClick={() => handleImprimirHoja([t])}
                      className="p-2 bg-brand-black text-white rounded hover:bg-brand-gray transition-all"
                    >
                      <Printer size={12} />
                    </button>
                  </div>

                  {/* CAPTURE HIDDEN */}
                  <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <div id={`troquel-capture-${t.id}`} className="w-[400px] bg-white p-8 border-[10px] border-brand-black">
                      <div className="text-center space-y-4">
                        <h2 className="text-4xl font-black uppercase italic border-b-4 border-brand-blue pb-2">{empresa?.nombre}</h2>
                        <div>
                          <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Cliente</p>
                          <p className="text-3xl font-black text-brand-black uppercase">{t.cliente_nombre}</p>
                        </div>
                        <div className="bg-brand-lightGray p-4 rounded-semi border-2 border-brand-black">
                          <p className="text-xs font-black uppercase text-brand-gray">Fecha de Retiro</p>
                          <p className="text-4xl font-black text-brand-black">{new Date(t.fecha_retiro).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-brand-black text-white p-6">
                          <p className="text-6xl font-black tracking-widest">{t.numero_azar}</p>
                        </div>
                        <div className="text-left border-t-2 border-brand-gray/20 pt-4">
                          <p className="text-xs font-black text-brand-gray uppercase">Detalle:</p>
                          <p className="text-sm font-black text-brand-black">{t.detalle_prendas}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && filteredTroqueles.length === 0 && (
                <div className="p-12 text-center text-brand-gray font-bold uppercase text-[10px]">No se encontraron resultados</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
