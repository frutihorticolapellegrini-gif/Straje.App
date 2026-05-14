import React, { useState } from 'react'
import { X, Printer, CheckSquare, Square } from 'lucide-react'
import type { Prenda } from '../../pages/dashboard/Stock'

interface Props {
  prendas: Prenda[]
  onClose: () => void
}

export const ImpresionPreciosModal: React.FC<Props> = ({ prendas, onClose }) => {
  const [descuento, setDescuento] = useState(15)
  const [selectedTipos, setSelectedTipos] = useState<string[]>([])
  
  const tiposUnicos = Array.from(new Set(prendas.map(p => p.tipo))).sort()

  const toggleTipo = (tipo: string) => {
    setSelectedTipos(prev => 
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    )
  }

  const handleImprimir = () => {
    // Filtrar prendas
    const aImprimir = prendas
      .filter(p => selectedTipos.length === 0 || selectedTipos.includes(p.tipo))
      .filter(p => p.precio_venta && p.precio_venta > 0)
      .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.codigo.localeCompare(b.codigo))

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <html>
        <head>
          <title>LISTA DE PRECIOS - STRAJE.APP</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; text-transform: uppercase; font-size: 10px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { bg-color: #f0f0f0; font-weight: 900; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 20px; font-style: italic; }
            .header p { margin: 5px 0; font-weight: bold; }
            .price-lista { font-weight: bold; }
            .price-contado { font-weight: 900; color: #000; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>STRAJE.APP</h1>
            <p>LISTA DE PRECIOS - ${new Date().toLocaleDateString()}</p>
            ${selectedTipos.length > 0 ? `<p>SECTORES: ${selectedTipos.join(', ')}</p>` : '<p>LISTA GENERAL DE PRECIOS</p>'}
          </div>
          <table>
            <thead>
              <tr>
                <th width="10%">COD.</th>
                <th width="35%">ARTICULO / DESCRIPCION</th>
                <th width="10%" class="text-center">TALLE</th>
                <th width="10%" class="text-center">CANT.</th>
                <th width="12%" class="text-right">P. LISTA</th>
                <th width="10%" class="text-center">% DESC.</th>
                <th width="13%" class="text-right">P. CONTADO</th>
              </tr>
            </thead>
            <tbody>
              ${aImprimir.map(p => {
                const precioLista = p.precio_venta || 0
                const precioContado = precioLista * (1 - descuento / 100)
                return `
                  <tr>
                    <td class="text-center"><strong>${p.codigo}</strong></td>
                    <td>${p.tipo} ${p.marca || ''} ${p.color || ''}</td>
                    <td class="text-center">${p.talle}</td>
                    <td class="text-center">${p.disponibles}</td>
                    <td class="text-right">$${precioLista.toLocaleString()}</td>
                    <td class="text-center">${descuento}%</td>
                    <td class="text-right"><strong>$${precioContado.toLocaleString()}</strong></td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          <p style="margin-top: 20px; font-size: 8px; text-align: center; opacity: 0.6;">
            LISTA GENERADA POR EL SISTEMA STRAJE.APP - ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-semi shadow-2xl max-w-lg w-full overflow-hidden border-t-8 border-brand-blue">
        <div className="p-6 border-b border-brand-gray/10 flex justify-between items-center bg-brand-lightGray/50">
          <h3 className="text-xl font-black text-brand-black uppercase italic flex items-center gap-2">
            <Printer className="text-brand-blue" /> Configurar Lista de Precios
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-brand-gray/10 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Descuento */}
          <div className="bg-brand-blue/5 p-4 rounded-semi border border-brand-blue/10">
            <label className="block text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2">Descuento Pago Contado (%)</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="0" max="50" step="5"
                value={descuento}
                onChange={(e) => setDescuento(Number(e.target.value))}
                className="flex-1 accent-brand-blue"
              />
              <span className="text-2xl font-black text-brand-blue w-16 text-right">{descuento}%</span>
            </div>
          </div>

          {/* Seleccion de Sectores */}
          <div>
            <label className="block text-[10px] font-black text-brand-gray uppercase tracking-widest mb-3">Seleccionar Sectores / Familias</label>
            <p className="text-[9px] text-brand-gray mb-4 italic uppercase">Si no seleccionas ninguno, se imprimirá la lista completa.</p>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {tiposUnicos.map(tipo => (
                <button 
                  key={tipo}
                  onClick={() => toggleTipo(tipo)}
                  className={`flex items-center gap-2 p-3 rounded-semi border transition-all text-left ${selectedTipos.includes(tipo) ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-brand-gray border-brand-gray/20 hover:border-brand-blue'}`}
                >
                  {selectedTipos.includes(tipo) ? <CheckSquare size={16} /> : <Square size={16} />}
                  <span className="text-[10px] font-black uppercase truncate">{tipo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-brand-lightGray/50 border-t border-brand-gray/10 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 font-black text-xs text-brand-gray uppercase tracking-widest hover:text-brand-black transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleImprimir}
            className="flex-1 bg-brand-black text-white py-4 rounded-semi font-black text-xs uppercase tracking-widest hover:bg-brand-gray shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Printer size={18} /> GENERAR A4
          </button>
        </div>
      </div>
    </div>
  )
}
