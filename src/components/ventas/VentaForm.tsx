import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Save, Search, Trash2, Printer, ShoppingBag, Banknote, CreditCard, ArrowRightLeft, MessageCircle } from 'lucide-react'
import type { Prenda } from '../../pages/dashboard/Stock'
import { formatMoney } from '../../utils/formatters'

interface VentaFormProps {
  onClose: () => void
  onSave: () => void
}

export const VentaForm: React.FC<VentaFormProps> = ({ onClose, onSave }) => {
  const { profile, empresa } = useAuth()
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ id: string, total: number, prendas: Prenda[] } | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [availableStock, setAvailableStock] = useState<Prenda[]>([])
  const [carrito, setCarrito] = useState<Prenda[]>([])

  const [formData, setFormData] = useState({ cliente_nombre: '', cliente_telefono: '', cliente_dni: '', cliente_direccion: '' })
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo')
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<string>('')
  const [recargoPorcentaje, setRecargoPorcentaje] = useState<string>('')
  const [cuotas, setCuotas] = useState<number>(1)

  useEffect(() => { fetchAvailableStock() }, [])

  const fetchAvailableStock = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .eq('empresa_id', profile?.empresa_id)
        .eq('estado', 'disponible')
        .gt('precio_venta', 0)
        .gt('disponibles', 0)
      
      if (error) throw error
      setAvailableStock(data as Prenda[])
    } catch (err) { console.error(err) }
  }

  const addToCart = (prenda: Prenda) => { 
    const qtyInCart = carrito.filter(p => p.id === prenda.id).length;
    if (qtyInCart >= (prenda.disponibles || 0)) {
      alert("No hay más stock disponible de esta prenda");
      return;
    }
    setCarrito([...carrito, prenda]); 
    setSearchTerm('');
  }
  
  const removeFromCart = (indexToRemove: number) => { 
    setCarrito(carrito.filter((_, i) => i !== indexToRemove));
  }

  const subtotal = carrito.reduce((acc, p) => acc + (p.precio_venta || 0), 0)
  const dPorc = parseFloat(descuentoPorcentaje) || 0
  const rPorc = parseFloat(recargoPorcentaje) || 0
  
  let d = 0, r = 0
  if (metodoPago === 'efectivo' || metodoPago === 'transferencia') d = subtotal * (dPorc / 100)
  else if (metodoPago === 'tarjeta') r = subtotal * (rPorc / 100)
  const total = subtotal - d + r

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (carrito.length === 0) return
    setLoading(true)
    try {
      const { data: venta, error: vErr } = await supabase.from('ventas').insert({
        empresa_id: profile?.empresa_id, cliente_nombre: formData.cliente_nombre || 'CONSUMIDOR FINAL',
        cliente_telefono: formData.cliente_telefono, cliente_dni: formData.cliente_dni, cliente_direccion: formData.cliente_direccion,
        metodo_pago: metodoPago, subtotal, descuento: d, recargo: r, precio_total: total, cuotas: metodoPago === 'tarjeta' ? cuotas : 1, usuario_id: profile?.id
      }).select().single()
      if (vErr) throw vErr
      for (const p of carrito) {
        await supabase.from('venta_detalles').insert({ venta_id: venta.id, prenda_id: p.id, precio_unitario: p.precio_venta || 0 })
        
        // Obtener stock actual para restar con seguridad
        const { data: stockActual } = await supabase.from('stock').select('unidades, disponibles').eq('id', p.id).single();
        if (stockActual) {
          const newUnidades = Math.max(0, stockActual.unidades - 1);
          const newDisponibles = Math.max(0, stockActual.disponibles - 1);
          await supabase.from('stock').update({ unidades: newUnidades, disponibles: newDisponibles }).eq('id', p.id);
        }

        await supabase.from('historial_stock').insert({ empresa_id: profile?.empresa_id, prenda_id: p.id, tipo_movimiento: 'venta', cantidad: -1, motivo: `Venta Directa: ${venta.cliente_nombre}`, usuario_id: profile?.id })
      }
      
      const detalleMetodo = metodoPago === 'tarjeta' ? `TARJETA (${cuotas} CUOTAS)` : metodoPago.toUpperCase()
      await supabase.from('caja').insert({ 
        empresa_id: profile?.empresa_id, 
        tipo: 'ingreso', 
        monto: total, 
        concepto: `VENTA DIRECTA: ${venta.cliente_nombre.toUpperCase()} - ${detalleMetodo}`, 
        metodo_pago: metodoPago, 
        usuario_id: profile?.id 
      })

      setSuccessData({ id: venta.id, total, prendas: carrito })
      onSave()
    } catch (err: any) { console.error(err) } finally { setLoading(false) }
  }

  const handlePrint = () => {
    const printNum = (parseInt(localStorage.getItem('straje_print_count_v') || '0') + 1).toString().padStart(2, '0')
    localStorage.setItem('straje_print_count_v', printNum)
    const nombreNegocio = empresa?.nombre?.toUpperCase() || 'STRAJE.APP'
    const logoUrl = empresa?.logo_url ? `${empresa.logo_url}?v=${Date.now()}` : null
    const logoHtml = logoUrl ? `<img src="${logoUrl}" style="max-height: 80px; display: block; margin: 0 auto 10px auto;">` : `<h1 style="margin:0; text-align:center">${nombreNegocio}</h1>`
    const itemsHtml = carrito.map(p => `<tr><td>[${p.codigo}] ${p.tipo}</td><td style="text-align:right">${formatMoney(p.precio_venta)}</td></tr>`).join('')
    const aviso = (empresa as any).aviso_legal || 'GRACIAS POR TU COMPRA'

    const html = `<html><head><title>VENTA_${printNum}</title><style>body { font-family: 'Inter', sans-serif; font-size: 11px; padding: 20px; color: #000; } .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; } table { width: 100%; border-collapse: collapse; margin: 10px 0; } th { text-align: left; border-bottom: 1px solid #000; padding: 6px; font-weight: 900; } td { padding: 6px; border-bottom: 1px dotted #ccc; } .totals { font-weight: 900; font-size: 14px; margin-top: 15px; border-top: 2px solid #000; padding-top: 8px; } .footer { text-align: center; margin-top: 40px; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }</style></head><body><div class="header">${logoHtml}<p style="margin:2px 0; font-size: 14px;"><strong>${nombreNegocio}</strong></p><p style="margin:0">VENTA #${printNum} | ${new Date().toLocaleDateString()}</p></div><p><strong>CLIENTE:</strong> ${formData.cliente_nombre.toUpperCase() || 'CONSUMIDOR FINAL'}</p><table><thead><tr><th>DESCRIPCIÓN</th><th style="text-align:right">PRECIO</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="totals"><div style="display:flex; justify-content:space-between"><span>SUBTOTAL:</span><span>${formatMoney(subtotal)}</span></div>${d > 0 ? `<div style="display:flex; justify-content:space-between; color: green"><span>DESCUENTO:</span><span>-${formatMoney(d)}</span></div>` : ''}${r > 0 ? `<div style="display:flex; justify-content:space-between; color: red"><span>RECARGO (${cuotas} CUOTAS):</span><span>+${formatMoney(r)}</span></div>` : ''}<div style="display:flex; justify-content:space-between; margin-top: 5px; font-size: 18px; border-top: 1px solid #000; padding-top: 5px;"><span>TOTAL:</span><span>${formatMoney(total)}</span></div></div><div class="footer"><p><strong>${aviso.toUpperCase()}</strong></p></div></body></html>`
    const win = window.open('', '', 'width=600,height=800'); win?.document.write(html); win?.document.close(); win?.focus(); setTimeout(() => { win?.print(); }, 500)
  }

  const generateWhatsAppMessage = () => {
    if (!successData) return '';
    const printNum = (parseInt(localStorage.getItem('straje_print_count_v') || '0')).toString().padStart(2, '0');
    const nombreNegocio = empresa?.nombre?.toUpperCase() || 'STRAJE.APP';
    const aviso = (empresa as any).aviso_legal || '¡Gracias por tu compra!';
    
    let msg = `*COMPROBANTE DE VENTA #${printNum}*\n`;
    msg += `*${nombreNegocio}*\n`;
    msg += `-----------------------------------\n`;
    msg += `*Detalle:*\n`;
    successData.prendas.forEach(p => {
      msg += `- [${p.codigo}] ${p.tipo}: ${formatMoney(p.precio_venta)}\n`;
    });
    msg += `-----------------------------------\n`;
    if (subtotal !== total) {
      msg += `*Subtotal:* ${formatMoney(subtotal)}\n`;
      if (d > 0) msg += `*Descuento:* -${formatMoney(d)}\n`;
      if (r > 0) msg += `*Recargo:* +${formatMoney(r)}\n`;
    }
    msg += `*TOTAL:* ${formatMoney(total)}\n\n`;
    msg += `_${aviso}_`;
    return msg;
  }

  return (
    <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-md flex items-center justify-center p-2 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-white/20">
        {successData ? (
          <div className="p-10 text-center space-y-6">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-50 shadow-inner"><ShoppingBag size={48} /></div>
            <h2 className="text-4xl font-black text-brand-black uppercase italic tracking-tighter">¡Venta Exitosa!</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto">
              <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-brand-black text-white font-black py-4 rounded-semi hover:bg-brand-gray transition-all shadow-xl uppercase text-xs tracking-widest"><Printer size={20} /> Imprimir Remito</button>
              <button onClick={() => window.open(`https://wa.me/${formData.cliente_telefono?.replace(/\D/g,'')}?text=${encodeURIComponent(generateWhatsAppMessage())}`, '_blank')} className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-black py-4 rounded-semi hover:bg-[#1ebd5a] transition-all shadow-xl uppercase text-xs tracking-widest"><MessageCircle size={20} /> WhatsApp</button>
            </div>
            <button onClick={onClose} className="px-10 py-3 bg-brand-lightGray text-brand-gray font-black rounded-semi uppercase text-xs">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="p-5 bg-brand-black text-white flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3"><ShoppingBag size={24} className="text-brand-blue" /> Venta Directa</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-brand-gray uppercase mb-2 block tracking-widest">Buscar Artículo de Venta</label>
                  <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={22} /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-brand-lightGray border-none rounded-semi font-black outline-none uppercase text-sm shadow-inner" placeholder="CÓDIGO O TIPO..." /></div>
                  {searchTerm && (
                    <div className="bg-white shadow-2xl rounded-semi mt-2 border border-brand-gray/10 z-20 overflow-hidden">
                      {availableStock
                        .filter(p => {
                          const qtyInCart = carrito.filter(c => c.id === p.id).length;
                          return (p.disponibles || 0) > qtyInCart && 
                                 (p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || p.tipo.toLowerCase().includes(searchTerm.toLowerCase()));
                        })
                        .slice(0, 5)
                        .map(prenda => (
                        <button key={prenda.id} onClick={() => addToCart(prenda)} className="w-full p-4 flex justify-between items-center hover:bg-brand-blue/5 border-b last:border-0 transition-colors"><div className="text-left"><p className="font-black text-brand-black uppercase text-xs">{prenda.codigo} - {prenda.tipo}</p></div><p className="font-black text-brand-blue text-lg">{formatMoney(prenda.precio_venta)}</p></button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 bg-brand-lightGray/30 p-3 rounded-semi">
                  <div className="col-span-2"><label className="text-[10px] font-black uppercase text-brand-gray mb-1">Nombre del Cliente</label><input type="text" placeholder="CONSUMIDOR FINAL" value={formData.cliente_nombre} onChange={e => setFormData({...formData, cliente_nombre: e.target.value})} className="w-full px-4 py-3 bg-white border border-brand-gray/20 rounded-semi font-bold uppercase text-xs outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-brand-gray mb-1">WhatsApp</label><input type="text" placeholder="CELULAR" value={formData.cliente_telefono} onChange={e => setFormData({...formData, cliente_telefono: e.target.value})} className="w-full px-4 py-3 bg-white border border-brand-gray/20 rounded-semi font-bold uppercase text-xs outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-brand-gray mb-1">DNI</label><input type="text" placeholder="DNI..." value={formData.cliente_dni} onChange={e => setFormData({...formData, cliente_dni: e.target.value})} className="w-full px-4 py-3 bg-white border border-brand-gray/20 rounded-semi font-bold uppercase text-xs outline-none" /></div>
                </div>
              </div>
              <div className="flex flex-col bg-brand-lightGray/40 p-4 rounded-semi border border-brand-gray/10 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-black mb-2 border-b pb-2">Artículos en Ticket</h4>
                <div className="flex-1 space-y-2 max-h-[130px] overflow-y-auto pr-2 custom-scrollbar">
                  {carrito.map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-4 rounded-semi shadow-md border border-brand-gray/5"><div><p className="font-black text-xs uppercase italic">{p.codigo} - {p.tipo}</p><p className="text-xs text-brand-blue font-black">{formatMoney(p.precio_venta)}</p></div><button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded-full"><Trash2 size={18} /></button></div>
                  ))}
                </div>
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setMetodoPago('efectivo')} className={`p-3 rounded-semi border-2 font-black text-[10px] flex flex-col items-center gap-1 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700 shadow-lg scale-105' : 'border-brand-gray/20 text-brand-gray'}`}><Banknote size={18} /> EFECTIVO</button>
                    <button type="button" onClick={() => setMetodoPago('transferencia')} className={`p-3 rounded-semi border-2 font-black text-[10px] flex flex-col items-center gap-1 transition-all ${metodoPago === 'transferencia' ? 'border-brand-blue bg-blue-50 text-brand-blue shadow-lg scale-105' : 'border-brand-gray/20 text-brand-gray'}`}><ArrowRightLeft size={18} /> TRANSF.</button>
                    <button type="button" onClick={() => setMetodoPago('tarjeta')} className={`p-3 rounded-semi border-2 font-black text-[10px] flex flex-col items-center gap-1 transition-all ${metodoPago === 'tarjeta' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg scale-105' : 'border-brand-gray/20 text-brand-gray'}`}><CreditCard size={18} /> TARJETA</button>
                  </div>
                  
                  {metodoPago === 'tarjeta' ? (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1">
                      <div><label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Cuotas</label><select value={cuotas} onChange={e => setCuotas(Number(e.target.value))} className="w-full p-3 bg-white border border-brand-gray/30 rounded-semi font-black text-xs outline-none"><option value="1">1 Pago</option><option value="3">3 Cuotas</option><option value="6">6 Cuotas</option><option value="12">12 Cuotas</option><option value="18">18 Cuotas</option><option value="24">24 Cuotas</option></select></div>
                      <div><label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Recargo %</label><input type="number" value={recargoPorcentaje} onChange={e => setRecargoPorcentaje(e.target.value)} className="w-full p-3 bg-white border border-brand-gray/30 rounded-semi font-black text-xs outline-none text-red-600" placeholder="Ej: 10" /></div>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-top-1">
                      <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Descuento %</label>
                      <input type="number" value={descuentoPorcentaje} onChange={e => setDescuentoPorcentaje(e.target.value)} className="w-full p-3 bg-white border border-brand-gray/30 rounded-semi font-black text-xs outline-none text-green-600" placeholder="Ej: 15" />
                    </div>
                  )}

                  <div className="bg-brand-black p-5 rounded-semi text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                    <p className="text-xs font-black uppercase text-brand-blue tracking-widest">Total</p>
                    <p className="text-3xl font-black italic tracking-tighter">{formatMoney(total)}</p>
                  </div>
                  <button onClick={handleSubmit} disabled={loading || carrito.length === 0} className="w-full py-3 bg-brand-blue text-white font-black rounded-semi shadow-xl hover:bg-blue-600 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3">{loading ? 'PROCESANDO...' : <><Save size={20} /> Confirmar Venta</>}</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
