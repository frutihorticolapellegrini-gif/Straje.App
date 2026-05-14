import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Save, Search, Trash2, Printer, MessageCircle, CalendarCheck as CalendarCheckIcon, Banknote, CreditCard, Smartphone, Scissors, Package } from 'lucide-react'
import type { Prenda } from '../../pages/dashboard/Stock'
import { formatMoney } from '../../utils/formatters'
import { toPng } from 'html-to-image'

interface AlquilerFormProps {
  onClose: () => void
  onSave: () => void
  prenda?: Prenda
  fecha?: string
}

export const AlquilerForm: React.FC<AlquilerFormProps> = ({ onClose, onSave, prenda, fecha }) => {
  const { profile, empresa } = useAuth()
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ id: string, total: number, abonado: number, prendas: Prenda[], metodo: string } | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [availableStock, setAvailableStock] = useState<Prenda[]>([])
  const [carrito, setCarrito] = useState<Prenda[]>([])

  const [formData, setFormData] = useState({ cliente_nombre: '', cliente_telefono: '', cliente_dni: '', cliente_direccion: '', fecha_retiro: '', fecha_devolucion: '' })
  const [manualDate, setManualDate] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'cta_corriente'>('efectivo')
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null)
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<string>('')
  const [recargoPorcentaje, setRecargoPorcentaje] = useState<string>('')
  const [cuotas, setCuotas] = useState<number>(1)
  const [modoCobro, setModoCobro] = useState<'total' | 'sena'>('total')
  const [senaMonto, setSenaMonto] = useState('')
  const [esCondicional, setEsCondicional] = useState(false)
  const [guardarPedido, setGuardarPedido] = useState(true)

  useEffect(() => { fetchAvailableStock() }, [])

  useEffect(() => {
    if (prenda) {
      setCarrito([prenda])
    }
    if (fecha) {
      handleFechaRetiroChange(fecha)
    }
  }, [prenda, fecha])

  const fetchAvailableStock = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .eq('empresa_id', profile?.empresa_id)
        .eq('estado', 'disponible')
        .gt('precio_alquiler', 0)
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

  const handleFechaRetiroChange = (fecha: string) => {
    setFormData(prev => {
      const newData = { ...prev, fecha_retiro: fecha };
      if (!manualDate && fecha) {
        const date = new Date(fecha + 'T00:00:00');
        date.setDate(date.getDate() + 6); // +6 días para que del 1 al 7 sean 7 días totales
        newData.fecha_devolucion = date.toISOString().split('T')[0];
      }
      return newData;
    });
  }

  const subtotal = carrito.reduce((acc, p) => acc + (p.precio_alquiler || 0), 0)
  const dPorc = parseFloat(descuentoPorcentaje) || 0
  const rPorc = parseFloat(recargoPorcentaje) || 0
  
  let d = 0, r = 0
  if (metodoPago === 'efectivo' || metodoPago === 'transferencia' || metodoPago === 'cta_corriente') d = subtotal * (dPorc / 100)
  else if (metodoPago === 'tarjeta') r = subtotal * (rPorc / 100)
  const total = subtotal - d + r

  const buscarClientes = async (term: string) => {
    if (term.length < 3) { setClientesEncontrados([]); return; }
    const { data } = await supabase.from('clientes').select('*').eq('empresa_id', profile?.empresa_id).ilike('nombre', `%${term}%`).limit(5)
    setClientesEncontrados(data || [])
  }

  useEffect(() => { setSenaMonto(Math.ceil(total / 2).toString()) }, [total])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (carrito.length === 0) return
    if (!formData.cliente_nombre || !formData.fecha_retiro) return
    setLoading(true)
    try {
      const montoAbonado = esCondicional 
        ? (modoCobro === 'sena' ? (Number(senaMonto) || 0) : 0)
        : (modoCobro === 'total' ? total : (Number(senaMonto) || 0))
      const { data: alq, error: alqErr } = await supabase.from('alquileres').insert({
        empresa_id: profile?.empresa_id, cliente_nombre: formData.cliente_nombre, cliente_telefono: formData.cliente_telefono,
        cliente_dni: formData.cliente_dni, cliente_direccion: formData.cliente_direccion, fecha_retiro: formData.fecha_retiro,
        fecha_devolucion: formData.fecha_devolucion, estado: 'reservado', metodo_pago: metodoPago, subtotal, descuento: d,
        recargo: r, monto_total: total, sena_pagada: montoAbonado, cuotas: metodoPago === 'tarjeta' ? cuotas : 1, 
        usuario_id: profile?.id,
        preparacion_estado: guardarPedido ? 'pendiente' : 'retirado'
      }).select().single()
      if (alqErr) throw alqErr

      // Si es Cuenta Corriente, gestionar el cliente y la deuda
      if (metodoPago === 'cta_corriente' || (montoAbonado < total)) {
        let cId = clienteSeleccionado?.id;
        if (!cId) {
          const { data: newC } = await supabase.from('clientes').insert({
            empresa_id: profile?.empresa_id,
            nombre: formData.cliente_nombre,
            dni: formData.cliente_dni,
            telefono: formData.cliente_telefono,
            direccion: formData.cliente_direccion
          }).select().single();
          cId = newC?.id;
        }

        if (cId && (total - montoAbonado > 0)) {
          await supabase.from('cuentas_corrientes').insert({
            empresa_id: profile?.empresa_id,
            cliente_id: cId,
            alquiler_id: alq.id,
            monto_original: total,
            monto_pendiente: total - montoAbonado,
            estado: montoAbonado > 0 ? 'parcial' : 'pendiente',
            es_condicional: esCondicional
          });
        }
      }
      for (const p of carrito) {
        await supabase.from('alquiler_detalles').insert({ alquiler_id: alq.id, prenda_id: p.id, precio_unitario: p.precio_alquiler || 0 })
        
        // Obtener stock actual para restar disponibles con seguridad
        const { data: stockActual } = await supabase.from('stock').select('disponibles, estado').eq('id', p.id).single();
        if (stockActual) {
          const newDisponibles = Math.max(0, stockActual.disponibles - 1);
          const nuevoEstado = newDisponibles === 0 ? 'alquilado' : stockActual.estado;
          await supabase.from('stock').update({ disponibles: newDisponibles, estado: nuevoEstado }).eq('id', p.id);
        }
        await supabase.from('historial_stock').insert({ empresa_id: profile?.empresa_id, prenda_id: p.id, tipo_movimiento: 'salida', cantidad: -1, motivo: `Alquiler: ${formData.cliente_nombre}`, usuario_id: profile?.id })
      }
      
      if (montoAbonado > 0) {
        const detalleMetodo = metodoPago === 'tarjeta' ? `TARJETA (${cuotas} CUOTAS)` : metodoPago.toUpperCase()
        const conceptoPago = modoCobro === 'total' ? 'ALQUILER RESERVA' : 'SEÑA ALQUILER'
        await supabase.from('caja').insert({ 
          empresa_id: profile?.empresa_id, 
          tipo: 'ingreso', 
          monto: montoAbonado, 
          concepto: `${conceptoPago}: ${formData.cliente_nombre.toUpperCase()} - ${detalleMetodo}`, 
          metodo_pago: metodoPago, 
          usuario_id: profile?.id 
        })
      }
      setSuccessData({ id: alq.id, total, abonado: montoAbonado, prendas: carrito, metodo: metodoPago })
      onSave()
    } catch (err: any) { console.error(err) } finally { setLoading(false) }
  }

  const handlePrint = () => {
    const printNum = (parseInt(localStorage.getItem('straje_print_count') || '0') + 1).toString().padStart(2, '0')
    localStorage.setItem('straje_print_count', printNum)
    const nombreNegocio = empresa?.nombre?.toUpperCase() || 'STRAJE.APP'
    const logoUrl = empresa?.logo_url ? `${empresa.logo_url}?v=${Date.now()}` : null
    const logoHtml = logoUrl ? `<img src="${logoUrl}" style="max-height: 80px; display: block; margin: 0 auto 10px auto;">` : `<h1 style="margin:0; text-align:center">${nombreNegocio}</h1>`
    const itemsHtml = carrito.map(p => `<tr><td>[${p.codigo}] ${p.tipo}</td><td style="text-align:right">${formatMoney(p.precio_alquiler)}</td></tr>`).join('')
    const saldo = total - (successData?.abonado || 0)
    
    const html = `<html><head><title>REMITO_${printNum}</title><style>body { font-family: 'Inter', sans-serif; font-size: 11px; padding: 20px; color: #000; } .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; } table { width: 100%; border-collapse: collapse; margin: 15px 0; } th { text-align: left; border-bottom: 1px solid #000; padding: 6px; font-weight: 900; } td { padding: 6px; border-bottom: 1px dotted #ccc; } .totals { font-weight: 900; font-size: 14px; margin-top: 15px; border-top: 2px solid #000; padding-top: 10px; } .footer { text-align: center; margin-top: 40px; font-size: 10px; }</style></head><body><div class="header">${logoHtml}<p style="margin:4px 0; font-size: 14px;"><strong>${nombreNegocio}</strong></p><p style="margin:0">REMITO ALQUILER #${printNum} | ${new Date().toLocaleDateString()}</p></div><p><strong>CLIENTE:</strong> ${formData.cliente_nombre.toUpperCase()}</p><p><strong>RETIRO:</strong> ${new Date(formData.fecha_retiro).toLocaleDateString()} | <strong>DEV:</strong> ${new Date(formData.fecha_devolucion).toLocaleDateString()}</p><table><thead><tr><th>DESCRIPCIÓN</th><th style="text-align:right">PRECIO</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="totals"><div style="display:flex; justify-content:space-between"><span>TOTAL ALQUILER:</span><span>${formatMoney(total)}</span></div><div style="display:flex; justify-content:space-between; color: #444;"><span>PAGADO HOY:</span><span>${formatMoney(successData?.abonado)}</span></div><div style="display:flex; justify-content:space-between; border-top: 1px solid #000; margin-top: 5px; font-size: 18px; padding-top: 5px;"><span>SALDO PENDIENTE:</span><span>${formatMoney(saldo)}</span></div></div><div class="footer"><p><strong>GRACIAS POR ELEGIRNOS</strong></p></div></body></html>`
    const win = window.open('', '', 'width=600,height=800'); win?.document.write(html); win?.document.close(); win?.focus(); setTimeout(() => { win?.print(); }, 500)
  }

  const generateWhatsAppMessage = () => {
    if (!successData) return '';
    const printNum = (parseInt(localStorage.getItem('straje_print_count') || '0')).toString().padStart(2, '0');
    const nombreNegocio = empresa?.nombre?.toUpperCase() || 'STRAJE.APP';
    const saldo = total - (successData?.abonado || 0);
    
    let msg = `*REMITO ALQUILER #${printNum}*\n`;
    msg += `*${nombreNegocio}*\n`;
    msg += `-----------------------------------\n`;
    msg += `*Retiro:* ${new Date(formData.fecha_retiro).toLocaleDateString()}\n`;
    msg += `*Devolución:* ${new Date(formData.fecha_devolucion).toLocaleDateString()}\n`;
    msg += `-----------------------------------\n`;
    msg += `*Detalle:*\n`;
    successData.prendas.forEach(p => {
      msg += `- [${p.codigo}] ${p.tipo}: ${formatMoney(p.precio_alquiler)}\n`;
    });
    msg += `-----------------------------------\n`;
    msg += `*TOTAL ALQUILER:* ${formatMoney(total)}\n`;
    msg += `*PAGADO HOY:* ${formatMoney(successData.abonado)}\n`;
    if (saldo > 0) msg += `*SALDO PENDIENTE:* ${formatMoney(saldo)}\n`;
    msg += `\n_¡Gracias por elegirnos!_`;
    
    return msg;
  }

  const handleCompartirImagenDirecto = async () => {
    const el = document.getElementById(`troquel-directo-capture`);
    if (!el || !successData) return;
    
    try {
      const dataUrl = await toPng(el, { quality: 0.95, backgroundColor: '#fff' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `troquel-${formData.cliente_nombre}.png`, { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Tu Troquel de Retiro',
          text: `Hola ${formData.cliente_nombre}, aquí tienes tu comprobante de retiro.`
        });
      } else {
        const link = document.createElement('a');
        link.download = `troquel-${formData.cliente_nombre}.png`;
        link.href = dataUrl;
        link.click();
        alert("Imagen descargada. Por favor, adjúntala en WhatsApp.");
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleGenerarTroquel = async () => {
    if (!successData) {
      console.warn("INTENTO DE GENERAR TROQUEL SIN DATOS DE ÉXITO");
      return;
    }
    console.log("INICIANDO GENERACIÓN DE TROQUEL PARA ALQUILER:", successData.id);
    setLoading(true);
    try {
      const numAzar = Math.floor(100 + Math.random() * 900).toString();
      const detalle = successData.prendas.map(p => `[${p.codigo}] ${p.tipo}${p.color ? ' ' + p.color : ''}${p.marca ? ' (' + p.marca + ')' : ''}`).join(', ');
      
      const { data, error } = await supabase.from('troqueles').insert({
        empresa_id: profile?.empresa_id,
        alquiler_id: successData.id,
        cliente_nombre: formData.cliente_nombre.toUpperCase(),
        cliente_telefono: formData.cliente_telefono,
        fecha_retiro: formData.fecha_retiro,
        detalle_prendas: detalle,
        numero_azar: numAzar,
        estado: 'pendiente'
      }).select();

      if (error) {
        console.error("ERROR SUPABASE TROQUELES:", error);
        throw error;
      }

      console.log("TROQUEL CREADO EN DB:", data);
      
      // En lugar de waMsg de texto, disparamos la imagen
      await handleCompartirImagenDirecto();

    } catch (err) {
      console.error(err);
      alert("Error al guardar troquel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-md flex items-center justify-center p-2 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-white/20">
        {successData ? (
          <div className="p-10 text-center space-y-6">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-50 shadow-inner"><CalendarCheckIcon size={48} /></div>
            <h2 className="text-4xl font-black text-brand-black uppercase italic tracking-tighter">¡Reserva Exitosa!</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-brand-black text-white font-black py-4 rounded-semi hover:bg-brand-gray transition-all shadow-xl uppercase text-[10px] tracking-widest"><Printer size={18} /> Imprimir Remito</button>
              <button onClick={() => window.open(`https://wa.me/${formData.cliente_telefono?.replace(/\D/g,'')}?text=${encodeURIComponent(generateWhatsAppMessage())}`, '_blank')} className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-black py-4 rounded-semi hover:bg-[#1ebd5a] transition-all shadow-xl uppercase text-[10px] tracking-widest"><MessageCircle size={18} /> WhatsApp</button>
              <button onClick={handleGenerarTroquel} disabled={loading} className="flex items-center justify-center gap-2 bg-violet-600 text-white font-black py-4 rounded-semi hover:bg-violet-700 transition-all shadow-xl uppercase text-[10px] tracking-widest"><Scissors size={18} /> Generar Troquel</button>
            </div>
            <button onClick={onClose} className="px-10 py-3 bg-brand-lightGray text-brand-gray font-black rounded-semi uppercase text-xs">Cerrar</button>

            {/* CAPTURE HIDDEN DIRECTO */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
              <div id={`troquel-directo-capture`} className="w-[400px] bg-white p-8 border-[10px] border-brand-black">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black uppercase italic border-b-4 border-brand-blue pb-2">{empresa?.nombre}</h2>
                  <div>
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Cliente</p>
                    <p className="text-3xl font-black text-brand-black uppercase">{formData.cliente_nombre}</p>
                    <p className="text-sm font-bold text-brand-gray">{formData.cliente_telefono}</p>
                  </div>
                  <div className="bg-brand-lightGray p-4 rounded-semi border-2 border-brand-black">
                    <p className="text-xs font-black uppercase text-brand-gray">Fecha de Retiro</p>
                    <p className="text-4xl font-black text-brand-black italic">{new Date(formData.fecha_retiro).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-brand-black text-white p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Código de Retiro</p>
                    <p className="text-6xl font-black tracking-widest">{successData.id.slice(0,3).toUpperCase()}</p>
                  </div>
                  <div className="text-left border-t-2 border-brand-gray/20 pt-4">
                    <p className="text-xs font-black text-brand-gray uppercase mb-2">Prendas a Retirar:</p>
                    <p className="text-sm font-black text-brand-black leading-tight">
                      {successData.prendas.map(p => `[${p.codigo}] ${p.tipo}${p.color ? ' ' + p.color : ''}`).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 bg-brand-black text-white flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3"><CalendarCheckIcon size={24} className="text-brand-blue" /> Nuevo Alquiler</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 bg-brand-lightGray/30 p-3 rounded-semi border border-brand-gray/10 relative">
                  <div className="col-span-2 relative">
                    <label className="text-xs font-black uppercase text-brand-gray mb-1">Nombre del Cliente</label>
                    <input 
                      type="text" 
                      placeholder="REQUERIDO" 
                      value={formData.cliente_nombre} 
                      onChange={e => {
                        setFormData({...formData, cliente_nombre: e.target.value});
                        buscarClientes(e.target.value);
                      }} 
                      className="w-full px-4 py-3 bg-white border border-brand-gray/20 rounded-semi font-bold uppercase text-xs outline-none" 
                    />
                    {clientesEncontrados.length > 0 && (
                      <div className="absolute left-0 right-0 top-full bg-white shadow-2xl rounded-semi border border-brand-gray/10 z-30 overflow-hidden mt-1">
                        {clientesEncontrados.map(c => (
                          <button 
                            key={c.id} 
                            onClick={() => {
                              setClienteSeleccionado(c);
                              setFormData({
                                ...formData,
                                cliente_nombre: c.nombre,
                                cliente_dni: c.dni || '',
                                cliente_telefono: c.telefono || '',
                                cliente_direccion: c.direccion || ''
                              });
                              setClientesEncontrados([]);
                            }}
                            className="w-full p-3 text-left hover:bg-brand-blue/5 border-b last:border-0"
                          >
                            <p className="font-black text-[10px] uppercase">{c.nombre}</p>
                            <p className="text-[8px] text-brand-gray uppercase">DNI: {c.dni || 'S/N'} | TEL: {c.telefono || 'S/N'}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div><label className="text-xs font-black uppercase text-brand-gray mb-1">WhatsApp</label><input type="text" placeholder="CELULAR" value={formData.cliente_telefono} onChange={e => setFormData({...formData, cliente_telefono: e.target.value})} className="w-full px-4 py-3 bg-white border border-brand-gray/20 rounded-semi font-bold text-xs outline-none" /></div>
                  <div><label className="text-xs font-black uppercase text-brand-gray mb-1">DNI</label><input type="text" placeholder="DNI" value={formData.cliente_dni} onChange={e => setFormData({...formData, cliente_dni: e.target.value})} className="w-full px-4 py-3 bg-white border border-brand-gray/20 rounded-semi font-bold text-xs outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-brand-blue mb-1">Fecha Retiro</label><input type="date" value={formData.fecha_retiro} onChange={e => handleFechaRetiroChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-brand-blue/20 rounded font-black text-xs" /></div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-blue mb-1">Fecha Devolución</label>
                    <div className="flex gap-1">
                      <input 
                        type="date" 
                        value={formData.fecha_devolucion} 
                        onChange={e => {
                          setFormData({...formData, fecha_devolucion: e.target.value});
                          setManualDate(true);
                        }} 
                        readOnly={!manualDate}
                        className={`flex-1 px-3 py-2 bg-white border border-brand-blue/20 rounded font-black text-xs ${!manualDate ? 'text-red-600 border-red-200' : ''}`} 
                      />
                      <button 
                        type="button"
                        onClick={() => setManualDate(!manualDate)}
                        className={`px-2 rounded text-[10px] font-black uppercase transition-all ${manualDate ? 'bg-brand-blue text-white' : 'bg-brand-lightGray text-brand-gray border border-brand-gray/20'}`}
                        title={manualDate ? "Volver a automático" : "Cambiar fecha manualmente"}
                      >
                        {manualDate ? 'Auto' : 'Man.'}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-brand-gray uppercase mb-2 block tracking-widest">Buscar Artículo de Alquiler</label>
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
                        <button key={prenda.id} onClick={() => addToCart(prenda)} className="w-full p-4 flex justify-between items-center hover:bg-brand-blue/5 border-b last:border-0 transition-colors"><div className="text-left"><p className="font-black text-xs uppercase">{prenda.codigo} - {prenda.tipo}</p></div><p className="font-black text-brand-blue text-lg">{formatMoney(prenda.precio_alquiler)}</p></button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col bg-brand-lightGray/40 p-4 rounded-semi border border-brand-gray/10 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-black mb-2 border-b pb-2">Resumen de Alquiler</h4>
                <div className="flex-1 space-y-2 max-h-[130px] overflow-y-auto pr-2 custom-scrollbar">
                  {carrito.map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-4 rounded-semi shadow-md border border-brand-gray/5"><div><p className="font-black text-xs uppercase italic">{p.codigo} - {p.tipo}</p><p className="text-xs text-brand-blue font-black">{formatMoney(p.precio_alquiler)}</p></div><button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded-full"><Trash2 size={18} /></button></div>
                  ))}
                </div>
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <button type="button" onClick={() => setMetodoPago('efectivo')} className={`p-3 rounded-semi border-2 font-black text-[9px] flex flex-col items-center gap-1 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700 shadow-lg scale-105' : 'border-brand-gray/20 text-brand-gray'}`}><Banknote size={16} /> EFECTIVO</button>
                    <button type="button" onClick={() => setMetodoPago('transferencia')} className={`p-3 rounded-semi border-2 font-black text-[9px] flex flex-col items-center gap-1 transition-all ${metodoPago === 'transferencia' ? 'border-brand-blue bg-blue-50 text-brand-blue shadow-lg scale-105' : 'border-brand-gray/20 text-brand-gray'}`}><Smartphone size={16} /> TRANSF.</button>
                    <button type="button" onClick={() => setMetodoPago('tarjeta')} className={`p-3 rounded-semi border-2 font-black text-[9px] flex flex-col items-center gap-1 transition-all ${metodoPago === 'tarjeta' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg scale-105' : 'border-brand-gray/20 text-brand-gray'}`}><CreditCard size={16} /> TARJETA</button>
                    <button type="button" onClick={() => { setMetodoPago('cta_corriente'); setEsCondicional(false); }} className={`p-3 rounded-semi border-2 font-black text-[9px] flex flex-col items-center gap-1 transition-all shadow-sm ${metodoPago === 'cta_corriente' && !esCondicional ? 'border-orange-500 bg-orange-50 text-orange-700 scale-105 z-10' : 'border-brand-gray/20 bg-white text-brand-gray hover:bg-brand-lightGray opacity-100'}`}><MessageCircle size={16} /> CTA. CTE.</button>
                    <button type="button" onClick={() => { setMetodoPago('cta_corriente'); setEsCondicional(true); }} className={`p-3 rounded-semi border-2 font-black text-[9px] flex flex-col items-center gap-1 transition-all shadow-sm ${metodoPago === 'cta_corriente' && esCondicional ? 'border-violet-500 bg-violet-50 text-violet-700 scale-105 z-10' : 'border-brand-gray/20 bg-white text-brand-gray hover:bg-brand-lightGray opacity-100'}`}><Smartphone size={16} className={esCondicional ? "text-violet-600" : ""} /> EN CONDICIONAL</button>
                  </div>
                  
                  {metodoPago === 'tarjeta' ? (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1">
                      <div><label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Cuotas</label><select value={cuotas} onChange={e => setCuotas(Number(e.target.value))} className="w-full p-3 bg-white border border-brand-gray/30 rounded-semi font-black text-xs outline-none"><option value="1">1 Pago</option><option value="3">3 Cuotas</option><option value="6">6 Cuotas</option><option value="12">12 Cuotas</option><option value="18">18 Cuotas</option><option value="24">24 Cuotas</option></select></div>
                      <div><label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Recargo %</label><input type="number" value={recargoPorcentaje} onChange={e => setRecargoPorcentaje(e.target.value)} className="w-full p-3 bg-white border border-brand-gray/30 rounded-semi font-black text-xs outline-none text-red-600" placeholder="Ej: 10" /></div>
                    </div>
                  ) : (
                    <>
                      <div className="animate-in slide-in-from-top-1">
                        <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Descuento %</label>
                        <input type="number" value={descuentoPorcentaje} onChange={e => setDescuentoPorcentaje(e.target.value)} className="w-full p-3 bg-white border border-brand-gray/30 rounded-semi font-black text-xs outline-none text-green-600" placeholder="Ej: 15" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded border border-brand-gray/10">
                        {metodoPago === 'cta_corriente' ? (
                          <>
                            <button 
                              type="button" 
                              onClick={() => { setModoCobro('sena'); setSenaMonto('0'); }} 
                              className={`py-2 rounded font-black text-[10px] uppercase transition-all ${modoCobro === 'sena' && (Number(senaMonto) === 0 || !senaMonto) ? 'bg-orange-600 text-white shadow-md' : 'text-brand-gray bg-brand-lightGray/50'}`}
                            >
                              Va Todo a Cuenta
                            </button>
                            <button 
                              type="button" 
                              onClick={() => { setModoCobro('sena'); setSenaMonto(Math.ceil(total/2).toString()); }} 
                              className={`py-2 rounded font-black text-[10px] uppercase transition-all ${modoCobro === 'sena' && Number(senaMonto) > 0 ? 'bg-brand-blue text-white shadow-md' : 'text-brand-gray bg-brand-lightGray/50'}`}
                            >
                              Entrega Seña
                            </button>
                          </>
                        ) : (
                          <>
                            {!esCondicional && (
                              <button type="button" onClick={() => setModoCobro('total')} className={`py-2 rounded font-black text-[10px] uppercase transition-all ${modoCobro === 'total' ? 'bg-brand-black text-white shadow-md' : 'text-brand-gray'}`}>Pagar Total</button>
                            )}
                            <button type="button" onClick={() => setModoCobro('sena')} className={`py-2 rounded font-black text-[10px] uppercase transition-all ${modoCobro === 'sena' || esCondicional ? (esCondicional && modoCobro === 'total' ? 'text-brand-gray' : 'bg-brand-blue text-white shadow-md') : 'text-brand-gray'}`}>
                              {esCondicional ? 'Entregar Seña' : 'Pagar Seña'}
                            </button>
                          </>
                        )}
                        {esCondicional && modoCobro === 'total' && (
                          <div className="col-span-2 text-center py-2 bg-violet-50 rounded text-[9px] font-black text-violet-600 uppercase border border-violet-100 italic">Prenda se lleva a probar - Sin pago</div>
                        )}
                      </div>
                    </>
                  )}

                  {(modoCobro === 'sena' || esCondicional) && (
                    <div className="relative animate-in zoom-in-95 duration-200">
                      <input 
                        type="text" 
                        value={senaMonto ? formatMoney(Number(senaMonto)) : ''} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          setSenaMonto(val);
                        }} 
                        className="w-full p-3 bg-white border-2 border-brand-blue rounded-semi font-black text-2xl text-brand-blue outline-none shadow-lg text-center" 
                        placeholder="Monto seña..." 
                      />
                      <div className="absolute top-0 left-0 p-1 text-[10px] font-black text-brand-blue uppercase bg-blue-50 rounded-br">Abono Inicial</div>
                    </div>
                  )}

                  <div className={`p-5 rounded-semi flex justify-between items-center shadow-2xl relative overflow-hidden transition-all ${esCondicional && modoCobro === 'total' ? 'bg-brand-gray/30 text-brand-gray' : 'bg-brand-black text-white'}`}>
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest ${esCondicional && modoCobro === 'total' ? 'text-brand-gray' : 'text-brand-blue'}`}>
                        {esCondicional && modoCobro === 'total' ? 'A PAGAR DESPUÉS' : 'Total'}
                      </p>
                      {esCondicional && modoCobro === 'total' && <p className="text-[10px] font-bold italic opacity-70">En Condicional</p>}
                    </div>
                    <p className={`text-3xl font-black italic tracking-tighter ${esCondicional && modoCobro === 'total' ? 'line-through opacity-50' : ''}`}>
                      {formatMoney(total)}
                    </p>
                  </div>

                  {/* OPCIÓN PREPARAR PEDIDO */}
                  <div className="flex items-center gap-3 p-3 bg-white/50 rounded-semi border border-brand-gray/10 mt-2">
                    <input 
                      type="checkbox" 
                      id="guardarPedido"
                      checked={guardarPedido}
                      onChange={(e) => setGuardarPedido(e.target.checked)}
                      className="w-5 h-5 accent-brand-blue cursor-pointer"
                    />
                    <label htmlFor="guardarPedido" className="text-[10px] font-black text-brand-black uppercase cursor-pointer select-none">
                      ¿Aparecer en "Pedidos a Preparar"? <span className="text-brand-gray font-bold italic lowercase">(para agenda de taller)</span>
                    </label>
                  </div>

                  {guardarPedido && (
                    <div className="bg-brand-blue/10 p-3 rounded border border-brand-blue/20 flex items-center gap-2 mt-2 animate-pulse">
                      <Package className="text-brand-blue" size={24} />
                      <p className="text-[10px] font-black text-brand-blue uppercase tracking-tighter leading-tight">
                        ESTE ALQUILER SE REGISTRARÁ EN "PEDIDOS A PREPARAR" (FECHA: {formData.fecha_retiro ? new Date(formData.fecha_retiro).toLocaleDateString() : 'A DEFINIR'})
                      </p>
                    </div>
                  )}

                  <button onClick={handleSubmit} disabled={loading || carrito.length === 0} className="w-full py-3 bg-brand-blue text-white font-black rounded-semi shadow-xl hover:bg-blue-600 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3">{loading ? 'PROCESANDO...' : <><Save size={20} /> Confirmar Reserva</>}</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
