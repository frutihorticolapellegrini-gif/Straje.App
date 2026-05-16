import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { 
  MessageCircle, 
  Search, 
  User, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  History,
  Smartphone,
  ChevronRight,
  ArrowLeft,
  Eye,
  Edit3,
  AlertTriangle,
  Info
} from 'lucide-react'
import { formatMoney } from '../../utils/formatters'

export const CuentaCorriente = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [clienteDetalle, setClienteDetalle] = useState<any | null>(null)
  const [cuentas, setCuentas] = useState<any[]>([])
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<any | null>(null)
  const [fechaProximoPago, setFechaProximoPago] = useState('')
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  
  // Nuevos estados
  const [showNewDebtModal, setShowNewDebtModal] = useState(false)
  const [showEditClientModal, setShowEditClientModal] = useState(false)
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false)
  const [selectedMovementDetails, setSelectedMovementDetails] = useState<any | null>(null)
  
  const [newDebtData, setNewDebtData] = useState({ 
    nombre: '', 
    dni: '', 
    telefono: '', 
    monto: '', 
    concepto: '',
    es_condicional: false 
  })
  const [editClientData, setEditClientData] = useState({ descripcion: '' })
  
  const [activeTab, setActiveTab] = useState<'all' | 'condicional'>('all')

  useEffect(() => {
    fetchClientesConDeuda()
  }, [])

  const fetchClientesConDeuda = async () => {
    setLoading(true)
    try {
      // Obtener clientes que tengan cuentas corrientes pendientes
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id, nombre, dni, telefono, direccion,
          cuentas_corrientes(id, monto_original, monto_pendiente, estado, es_condicional, fecha_proximo_pago)
        `)
        .eq('empresa_id', profile?.empresa_id)
      
      if (error) throw error
      
      // Filtrar clientes que tengan al menos una cuenta (sin importar si está pendiente o saldada)
      const clientesConHistorial = (data || []).filter(cliente => 
        cliente.cuentas_corrientes && cliente.cuentas_corrientes.length > 0
      )

      setClientes(clientesConHistorial)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const verDetalleCliente = async (cliente: any) => {
    setClienteDetalle(cliente)
    try {
      const { data, error } = await supabase
        .from('cuentas_corrientes')
        .select(`
          *,
          alquileres (cliente_nombre, creado_en),
          ventas (cliente_nombre, creado_en),
          pagos_cuenta_corriente (*)
        `)
        .eq('cliente_id', cliente.id)
        .order('creado_en', { ascending: false })

      if (error) throw error
      setCuentas(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cuentaSeleccionada || !montoPago) return
    const monto = Number(montoPago)
    if (monto <= 0 || monto > cuentaSeleccionada.monto_pendiente) {
      alert("Monto inválido")
      return
    }

    try {
      // 1. Registrar el pago
      const { error: pagoErr } = await supabase.from('pagos_cuenta_corriente').insert({
        cuenta_corriente_id: cuentaSeleccionada.id,
        monto: monto,
        metodo_pago: metodoPago,
        usuario_id: profile?.id
      })
      if (pagoErr) throw pagoErr

      // 2. Actualizar la deuda
      const nuevoMontoPendiente = cuentaSeleccionada.monto_pendiente - monto
      const nuevoEstado = nuevoMontoPendiente <= 0 ? 'saldado' : 'pendiente'
      
      const { error: updateErr } = await supabase
        .from('cuentas_corrientes')
        .update({ 
          monto_pendiente: nuevoMontoPendiente,
          estado: nuevoEstado,
          fecha_proximo_pago: fechaProximoPago || cuentaSeleccionada.fecha_proximo_pago
        })
        .eq('id', cuentaSeleccionada.id)
      
      if (updateErr) throw updateErr

      // 3. Registrar en Caja
      await supabase.from('caja').insert({
        empresa_id: profile?.empresa_id,
        tipo: 'ingreso',
        monto: monto,
        concepto: `PAGO CTA. CTE.: ${clienteDetalle.nombre.toUpperCase()}`,
        metodo_pago: metodoPago,
        usuario_id: profile?.id
      })

      // NOVEDAD PUNTO 3: Sincronizar con Alquileres (Si es un condicional/alquiler)
      // "Si confirmo ahí que entregó y pagó una deuda... automáticamente en alquileres el botón de devolver se tendría que ir"
      if (cuentaSeleccionada.alquiler_id) {
        const { data: alq } = await supabase.from('alquileres')
          .select('id, sena_pagada')
          .eq('id', cuentaSeleccionada.alquiler_id)
          .single()
          
        if (alq) {
          const nuevaSena = (alq.sena_pagada || 0) + monto
          const updateAlq: any = { sena_pagada: nuevaSena }
          
          if (nuevoEstado === 'saldado') {
             updateAlq.estado = 'devuelto'
             
             // Actualizar stock de las prendas a lavandería (ya que se devolvieron)
             const { data: alqDet } = await supabase.from('alquiler_detalles').select('prenda_id').eq('alquiler_id', alq.id)
             if (alqDet && alqDet.length > 0) {
               for (const det of alqDet) {
                 await supabase.from('stock').update({ estado: 'lavanderia' }).eq('id', det.prenda_id)
                 await supabase.from('historial_stock').insert({
                   empresa_id: profile?.empresa_id,
                   prenda_id: det.prenda_id,
                   tipo_movimiento: 'entrada',
                   cantidad: 0,
                   motivo: `Devolución Condicional desde Cta. Corriente`,
                   usuario_id: profile?.id
                 })
               }
             }
          }

          await supabase.from('alquileres').update(updateAlq).eq('id', alq.id)
        }
      }

      // Sincronizar con Ventas
      if (cuentaSeleccionada.venta_id && nuevoEstado === 'saldado') {
        const { error: ventaErr } = await supabase
          .from('ventas')
          .update({ estado: 'completada' })
          .eq('id', cuentaSeleccionada.venta_id)
          
        if (ventaErr) {
          console.error("Error al actualizar estado de la venta:", ventaErr)
        }
      }

      setShowPagoModal(false)
      setMontoPago('')
      setFechaProximoPago('')
      verDetalleCliente(clienteDetalle)
      fetchClientesConDeuda()
    } catch (err) {
      console.error(err)
      alert("Error al procesar el pago")
    }
  }

  const handleCreateManualDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDebtData.nombre || !newDebtData.monto) return
    setLoading(true)
    try {
      // 1. Buscar o Crear cliente
      let cId;
      const { data: existingC } = await supabase.from('clientes').select('id').eq('empresa_id', profile?.empresa_id).eq('nombre', newDebtData.nombre.toUpperCase()).maybeSingle()
      
      if (existingC) {
        cId = existingC.id
      } else {
        const { data: newC, error: cErr } = await supabase.from('clientes').insert({
          empresa_id: profile?.empresa_id,
          nombre: newDebtData.nombre.toUpperCase(),
          dni: newDebtData.dni,
          telefono: newDebtData.telefono
        }).select().single()
        if (cErr) throw cErr
        cId = newC.id
      }

      // 2. Crear deuda en cuenta corriente
      const { error: dErr } = await supabase.from('cuentas_corrientes').insert({
        empresa_id: profile?.empresa_id,
        cliente_id: cId,
        monto_original: Number(newDebtData.monto),
        monto_pendiente: Number(newDebtData.monto),
        estado: 'pendiente',
        es_condicional: newDebtData.es_condicional,
        fecha_proximo_pago: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días default
      })
      if (dErr) throw dErr

      setShowNewDebtModal(false)
      setNewDebtData({ nombre: '', dni: '', telefono: '', monto: '', concepto: '', es_condicional: false })
      fetchClientesConDeuda()
    } catch (err) {
      console.error(err)
      alert("Error al crear deuda")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateClientDescription = async () => {
    if (!clienteDetalle) return
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ descripcion: editClientData.descripcion })
        .eq('id', clienteDetalle.id)
      
      if (error) throw error
      setClienteDetalle({ ...clienteDetalle, descripcion: editClientData.descripcion })
      setShowEditClientModal(false)
    } catch (err) {
      console.error(err)
      alert("Error al actualizar descripción")
    }
  }

  const getDaysPassed = (date: string) => {
    const created = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dni?.includes(searchTerm)
  )

  const isVencido = (fecha: string) => {
    if (!fecha) return false
    return new Date(fecha) < new Date()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-3 uppercase tracking-tighter italic">
            <MessageCircle className="text-brand-orange" size={32} /> Cuenta Corriente
          </h2>
          <p className="text-brand-gray font-bold text-sm uppercase tracking-widest mt-1">Gestión de deudas y pagos de clientes.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchClientesConDeuda()}
            className="bg-white text-brand-black border border-brand-gray/10 px-6 py-4 rounded-semi font-black uppercase text-[10px] tracking-widest hover:bg-brand-lightGray transition-all shadow-xl flex items-center gap-3"
          >
            <History size={18} /> Refrescar
          </button>
          <button 
            onClick={() => setShowNewDebtModal(true)}
            className="bg-brand-black text-white px-8 py-4 rounded-semi font-black uppercase text-xs tracking-widest hover:bg-brand-gray transition-all shadow-xl flex items-center gap-3"
          >
            <Plus size={20} /> Carga Manual / Nuevo Cliente
          </button>
        </div>
      </header>

      {!clienteDetalle ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={20} />
              <input 
                type="text" 
                placeholder="BUSCAR CLIENTE POR NOMBRE O DNI..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white shadow-xl rounded-semi border-none font-black uppercase text-xs outline-none focus:ring-2 focus:ring-brand-orange"
              />
            </div>

            <div className="flex bg-white p-1 rounded-semi shadow-lg border border-brand-gray/5">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 rounded-semi font-black text-[10px] uppercase transition-all ${activeTab === 'all' ? 'bg-brand-black text-white' : 'text-brand-gray hover:bg-brand-lightGray'}`}
              >
                Todos los Clientes
              </button>
              <button 
                onClick={() => setActiveTab('condicional')}
                className={`px-6 py-3 rounded-semi font-black text-[10px] uppercase transition-all flex items-center gap-2 ${activeTab === 'condicional' ? 'bg-violet-600 text-white' : 'text-brand-gray hover:bg-brand-lightGray'}`}
              >
                <Smartphone size={14} /> Solo Condicionales
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center text-brand-gray font-black uppercase tracking-widest animate-pulse">Cargando Clientes...</div>
            ) : filteredClientes.length === 0 ? (
              <div className="col-span-full py-20 bg-white rounded-semi border-2 border-dashed border-brand-gray/20 text-center">
                <p className="text-brand-gray font-black uppercase tracking-widest">No hay clientes con deuda pendiente.</p>
              </div>
            ) : (
              filteredClientes
                .filter(c => {
                  if (activeTab === 'condicional') {
                    const hasCondicional = (c.cuentas_corrientes || []).some((cc: any) => 
                      (cc.es_condicional === true || cc.es_condicional === 'true')
                    )
                    return hasCondicional
                  }
                  return true
                })
                .map(cliente => {
                  const cuentasActivas = cliente.cuentas_corrientes.filter((cc: any) => cc.estado !== 'saldado')
                  const totalDeuda = cuentasActivas.reduce((acc: number, curr: any) => acc + (curr.monto_pendiente || 0), 0)
                  const tieneVencidos = cuentasActivas.some((c: any) => isVencido(c.fecha_proximo_pago))
                  const tieneCondicional = cuentasActivas.some((c: any) => c.es_condicional)

                return (
                  <button 
                    key={cliente.id}
                    onClick={() => verDetalleCliente(cliente)}
                    className={`bg-white p-6 rounded-semi shadow-xl hover:shadow-2xl transition-all text-left border-t-4 ${tieneCondicional ? 'border-violet-500' : tieneVencidos ? 'border-red-500' : 'border-brand-orange'} relative overflow-hidden group`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-brand-lightGray p-3 rounded-full text-brand-gray group-hover:bg-brand-orange/10 group-hover:text-brand-orange transition-colors">
                        <User size={24} />
                      </div>
                      <ChevronRight size={20} className="text-brand-gray opacity-30 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-black text-lg uppercase tracking-tighter truncate">{cliente.nombre}</h3>
                    <p className="text-[10px] font-bold text-brand-gray uppercase mb-4">DNI: {cliente.dni || 'S/N'}</p>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-brand-gray uppercase opacity-50">Deuda Pendiente</p>
                        <p className={`text-2xl font-black italic tracking-tighter ${totalDeuda === 0 ? 'text-green-600' : tieneVencidos ? 'text-red-600' : 'text-brand-orange'}`}>
                          {formatMoney(totalDeuda)}
                        </p>
                      </div>
                      {totalDeuda === 0 && (
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-[8px] font-black uppercase">Saldado</div>
                      )}
                      {tieneVencidos && totalDeuda > 0 && (
                        <div className="bg-red-100 text-red-600 px-2 py-1 rounded text-[8px] font-black uppercase animate-bounce">Vencido</div>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
          <button 
            onClick={() => setClienteDetalle(null)}
            className="flex items-center gap-2 text-brand-gray hover:text-brand-black font-black uppercase text-xs transition-colors"
          >
            <ArrowLeft size={16} /> Volver al listado
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-8 rounded-semi shadow-2xl border-t-8 border-brand-orange">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-brand-lightGray rounded-full flex items-center justify-center text-brand-gray"><User size={40} /></div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-tight">{clienteDetalle.nombre}</h3>
                    <p className="text-xs font-bold text-brand-gray uppercase tracking-widest">{clienteDetalle.dni || 'Sin DNI'}</p>
                  </div>
                </div>
                <div className="mt-8 space-y-4 pt-8 border-t">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-brand-gray uppercase">Celular:</span>
                    <span className="text-xs font-bold">{clienteDetalle.telefono || 'S/N'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-brand-gray uppercase">Dirección:</span>
                    <span className="text-xs font-bold">{clienteDetalle.direccion || 'S/N'}</span>
                  </div>
                  {clienteDetalle.descripcion && (
                    <div className="bg-brand-blue/5 p-3 rounded border border-brand-blue/10">
                      <p className="text-[10px] font-black text-brand-blue uppercase mb-1 flex items-center gap-1"><Info size={10}/> Notas:</p>
                      <p className="text-xs font-medium italic text-brand-gray">"{clienteDetalle.descripcion}"</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => window.open(`https://wa.me/${clienteDetalle.telefono?.replace(/\D/g,'')}`, '_blank')}
                      className="py-4 bg-[#25D366] text-white font-black rounded-semi shadow-xl hover:bg-[#1ebd5a] transition-all uppercase text-[8px] tracking-widest flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                    <button 
                      onClick={() => {
                        setEditClientData({ descripcion: clienteDetalle.descripcion || '' })
                        setShowEditClientModal(true)
                      }}
                      className="py-4 bg-brand-lightGray text-brand-gray font-black rounded-semi shadow-md hover:bg-brand-gray/10 transition-all uppercase text-[8px] tracking-widest flex items-center justify-center gap-2"
                    >
                      <Edit3 size={14} /> Editar Notas
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-brand-gray flex justify-between items-center">
                <span className="flex items-center gap-2"><History size={16} /> Movimientos Pendientes</span>
                <div className="flex bg-brand-lightGray p-1 rounded border border-brand-gray/10 scale-90">
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded font-black text-[8px] uppercase transition-all ${activeTab === 'all' ? 'bg-brand-black text-white' : 'text-brand-gray'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setActiveTab('condicional')}
                    className={`px-4 py-2 rounded font-black text-[8px] uppercase transition-all ${activeTab === 'condicional' ? 'bg-violet-600 text-white' : 'text-brand-gray'}`}
                  >
                    Condicionales
                  </button>
                </div>
              </h4>
              <div className="space-y-4">
                {cuentas
                  .filter(c => c.estado !== 'saldado')
                  .filter(c => {
                    if (activeTab === 'condicional') {
                      return c.es_condicional === true || c.es_condicional === 'true'
                    }
                    return true
                  })
                  .length === 0 ? (
                  <div className="bg-white p-12 rounded-semi text-center border-2 border-dashed border-brand-gray/10">
                    <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                    <p className="font-black text-brand-gray uppercase tracking-widest">No hay {activeTab === 'condicional' ? 'condicionales' : 'deudas'} pendientes.</p>
                  </div>
                ) : (
                  cuentas
                    .filter(c => c.estado !== 'saldado')
                    .filter(c => {
                      if (activeTab === 'condicional') {
                        return c.es_condicional === true || c.es_condicional === 'true'
                      }
                      return true
                    })
                    .map(cuenta => {
                    const dias = getDaysPassed(cuenta.creado_en)
                    const esVencidoLocal = isVencido(cuenta.fecha_proximo_pago) || (cuenta.es_condicional && dias >= 3)

                    return (
                    <div key={cuenta.id} className={`bg-white p-6 rounded-semi shadow-xl border-2 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden transition-all ${cuenta.es_condicional ? 'border-violet-200 bg-violet-50/10' : esVencidoLocal ? 'border-red-200' : 'border-brand-gray/5'}`}>
                      {cuenta.es_condicional && (
                        <div className="absolute top-0 right-0 bg-violet-500 text-white px-3 py-1 text-[8px] font-black uppercase rounded-bl-semi shadow-md">EN CONDICIONAL</div>
                      )}
                      {esVencidoLocal && !cuenta.es_condicional && (
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                      )}
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${cuenta.es_condicional ? 'bg-violet-600 text-white' : cuenta.alquiler_id ? 'bg-brand-blue/10 text-brand-blue' : 'bg-purple-100 text-purple-700'}`}>
                            {cuenta.es_condicional ? 'CONDICIONAL' : cuenta.alquiler_id ? 'Alquiler' : 'Venta'}
                          </span>
                          <span className="text-[10px] font-bold text-brand-gray flex items-center gap-1">
                            <Calendar size={12} /> {new Date(cuenta.creado_en).toLocaleDateString()}
                          </span>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded font-black text-[9px] uppercase ${dias >= 3 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                            {dias >= 3 ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />} Día {dias === 0 ? 1 : dias}
                          </div>
                        </div>

                        {cuenta.es_condicional && (
                          <div className="bg-violet-100 text-violet-700 px-3 py-2 rounded-semi border border-violet-200 flex items-center gap-2">
                            <AlertCircle size={16} />
                            <p className="text-xs font-black uppercase tracking-tighter">FALTA PAGAR - SE LLEVÓ A PROBAR</p>
                          </div>
                        )}

                        <p className="font-black text-base uppercase tracking-tighter">
                          {cuenta.alquiler_id ? `Alquiler de ${cuenta.alquileres?.cliente_nombre}` : cuenta.ventas?.cliente_nombre ? `Venta Directa: ${cuenta.ventas.cliente_nombre}` : `Carga Manual`}
                        </p>
                        <div className="flex gap-6">
                          <div>
                            <p className="text-[8px] font-black text-brand-gray uppercase opacity-50">Total</p>
                            <p className="font-bold text-sm text-brand-black">{formatMoney(cuenta.monto_original)}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-brand-gray uppercase opacity-50 font-bold">Saldo Pendiente</p>
                            <p className={`font-black text-2xl tracking-tighter ${cuenta.es_condicional ? 'text-violet-600' : esVencidoLocal ? 'text-red-600' : 'text-brand-orange'}`}>
                              {formatMoney(cuenta.monto_pendiente)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end gap-4 min-w-[150px]">
                        <div className="text-right">
                          <p className="text-[8px] font-black text-brand-gray uppercase">Compromiso de Pago</p>
                          <p className={`font-black text-sm ${esVencidoLocal ? 'text-red-600' : 'text-brand-black'}`}>
                            {cuenta.fecha_proximo_pago ? new Date(cuenta.fecha_proximo_pago).toLocaleDateString() : 'NO DEFINIDO'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setSelectedMovementDetails(cuenta)
                              setShowViewDetailsModal(true)
                            }}
                            className="bg-brand-lightGray text-brand-gray p-3 rounded-semi hover:bg-brand-blue hover:text-white transition-all shadow-md"
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              setCuentaSeleccionada(cuenta)
                              setMontoPago(cuenta.monto_pendiente.toString())
                              setShowPagoModal(true)
                            }}
                            className={`${cuenta.es_condicional ? 'bg-violet-600' : 'bg-brand-black'} text-white px-5 py-3 rounded-semi font-black text-[10px] uppercase hover:opacity-80 transition-all shadow-xl flex items-center gap-2`}
                          >
                            <Plus size={14} /> Saldar / Abonar
                          </button>
                        </div>
                      </div>
                    </div>
                    )
                  })
                )}

                {cuentas.some(c => c.estado === 'saldado') && (
                  <div className="mt-12 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gray">Historial Saldado</h4>
                    {cuentas.filter(c => c.estado === 'saldado').map(cuenta => (
                      <div key={cuenta.id} className="bg-brand-lightGray/50 p-4 rounded-semi flex justify-between items-center grayscale hover:grayscale-0 transition-all cursor-pointer" onClick={() => { setSelectedMovementDetails(cuenta); setShowViewDetailsModal(true); }}>
                         <div className="flex items-center gap-3">
                           <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${cuenta.es_condicional ? 'bg-violet-600 text-white' : cuenta.alquiler_id ? 'bg-brand-blue/10 text-brand-blue' : 'bg-purple-100 text-purple-700'}`}>
                             {cuenta.es_condicional ? 'CONDICIONAL' : cuenta.alquiler_id ? 'Alquiler' : 'Venta'}
                           </span>
                           <p className="font-bold text-xs uppercase truncate">{new Date(cuenta.creado_en).toLocaleDateString()}</p>
                         </div>
                         <p className="font-black text-xs text-green-700">{formatMoney(cuenta.monto_original)} - SALDADO</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Abonar / Saldar */}
      {showPagoModal && cuentaSeleccionada && (
        <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-brand-black text-white flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">Registrar Pago</h3>
              <button onClick={() => setShowPagoModal(false)} className="text-white/50 hover:text-white transition-colors uppercase font-black text-xs">Cerrar</button>
            </div>
            <form onSubmit={handlePagar} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-brand-lightGray/50 p-4 rounded-semi border border-brand-gray/10">
                  <p className="text-[10px] font-black text-brand-gray uppercase">Saldo Pendiente Actual</p>
                  <p className="text-xl font-black text-brand-orange">{formatMoney(cuentaSeleccionada.monto_pendiente)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setMontoPago(cuentaSeleccionada.monto_pendiente.toString())}
                    className="py-2 bg-brand-black text-white font-black rounded-semi uppercase text-[10px] shadow-md hover:bg-brand-gray transition-all"
                  >
                    Pagar Total
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMontoPago(Math.ceil(cuentaSeleccionada.monto_pendiente / 2).toString())}
                    className="py-2 bg-brand-blue text-white font-black rounded-semi uppercase text-[10px] shadow-md hover:bg-blue-600 transition-all"
                  >
                    Pagar Mitad
                  </button>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Monto a Cobrar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-brand-black">$</span>
                    <input 
                      type="text" 
                      value={montoPago ? new Intl.NumberFormat('es-AR').format(Number(montoPago.toString().replace(/\D/g, ''))) : ''} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (Number(val) <= cuentaSeleccionada.monto_pendiente) {
                          setMontoPago(val);
                        }
                      }} 
                      className="w-full pl-10 pr-4 py-4 bg-white border-2 border-brand-blue rounded-semi font-black text-3xl text-brand-black outline-none shadow-lg"
                      placeholder="0"
                      required 
                    />
                  </div>
                </div>

                {montoPago && Number(montoPago) > 0 && (
                  <div className="flex justify-between items-center p-4 bg-orange-50 border border-orange-200 rounded-semi">
                    <p className="text-[10px] font-black text-orange-700 uppercase">Resto a Pagar en Cuenta</p>
                    <p className="text-lg font-black text-orange-700 italic">{formatMoney(cuentaSeleccionada.monto_pendiente - Number(montoPago))}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Método de Pago</label>
                <select 
                  value={metodoPago} 
                  onChange={e => setMetodoPago(e.target.value)}
                  className="w-full p-4 bg-brand-lightGray border-none rounded-semi font-black text-xs uppercase"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              {montoPago && Number(montoPago) < cuentaSeleccionada.monto_pendiente && (
                <div>
                  <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Próximo Compromiso (Opcional)</label>
                  <input 
                    type="date" 
                    value={fechaProximoPago} 
                    onChange={e => setFechaProximoPago(e.target.value)} 
                    className="w-full p-4 bg-brand-lightGray border-none rounded-semi font-black text-xs"
                  />
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-brand-black text-white font-black rounded-semi uppercase text-xs tracking-widest shadow-xl hover:bg-brand-gray transition-all">Confirmar Pago</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Deuda Manual */}
      {showNewDebtModal && (
        <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-semi shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-brand-black text-white flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2"><Plus className="text-brand-orange" /> Carga Manual</h3>
              <button onClick={() => setShowNewDebtModal(false)} className="text-white/50 hover:text-white transition-colors uppercase font-black text-xs">Cerrar</button>
            </div>
            <form onSubmit={handleCreateManualDebt} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Nombre Cliente</label>
                  <input type="text" value={newDebtData.nombre} onChange={e => setNewDebtData({...newDebtData, nombre: e.target.value})} className="w-full p-4 bg-brand-lightGray border-none rounded-semi font-black uppercase text-xs" placeholder="NOMBRE COMPLETO" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">DNI (Opcional)</label>
                  <input type="text" value={newDebtData.dni} onChange={e => setNewDebtData({...newDebtData, dni: e.target.value})} className="w-full p-3 bg-brand-lightGray border-none rounded-semi font-black uppercase text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">WhatsApp</label>
                  <input type="text" value={newDebtData.telefono} onChange={e => setNewDebtData({...newDebtData, telefono: e.target.value})} className="w-full p-3 bg-brand-lightGray border-none rounded-semi font-black uppercase text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-brand-gray uppercase mb-1 block">Monto Deuda</label>
                  <input type="number" value={newDebtData.monto} onChange={e => setNewDebtData({...newDebtData, monto: e.target.value})} className="w-full p-4 bg-brand-lightGray border-none rounded-semi font-black text-xl text-brand-orange" placeholder="$ 0.00" required />
                </div>
                <div className="col-span-2 flex items-center gap-3 bg-violet-50 p-4 rounded-semi border border-violet-100">
                  <input type="checkbox" checked={newDebtData.es_condicional} onChange={e => setNewDebtData({...newDebtData, es_condicional: e.target.checked})} className="w-5 h-5 accent-violet-600" />
                  <label className="text-xs font-black text-violet-700 uppercase">Marcar como "EN CONDICIONAL" (Prenda a probar)</label>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-brand-black text-white font-black rounded-semi uppercase text-xs tracking-widest mt-4">Guardar Deuda</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Notas Cliente */}
      {showEditClientModal && (
        <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-semi shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-brand-black text-white flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2"><Edit3 className="text-brand-blue" /> Editar Notas</h3>
              <button onClick={() => setShowEditClientModal(false)} className="text-white/50 hover:text-white transition-colors uppercase font-black text-xs">Cerrar</button>
            </div>
            <div className="p-8 space-y-4">
              <textarea 
                value={editClientData.descripcion}
                onChange={e => setEditClientData({ descripcion: e.target.value })}
                className="w-full p-4 bg-brand-lightGray border-none rounded-semi font-medium text-sm h-32 outline-none"
                placeholder="Escribe una descripción o nota sobre este cliente..."
              />
              <button onClick={handleUpdateClientDescription} className="w-full py-4 bg-brand-blue text-white font-black rounded-semi uppercase text-xs tracking-widest">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalles Movimiento */}
      {showViewDetailsModal && selectedMovementDetails && (
        <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-semi shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="p-6 bg-brand-black text-white flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2"><Eye className="text-brand-blue" /> Detalle de Movimiento</h3>
              <button onClick={() => setShowViewDetailsModal(false)} className="text-white/50 hover:text-white transition-colors uppercase font-black text-xs">Cerrar</button>
            </div>
            <div className="p-8 space-y-6">
               <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <p className="text-[10px] font-black text-brand-gray uppercase">Tipo de Operación</p>
                    <p className="font-black text-lg text-brand-black uppercase italic tracking-tighter">
                      {selectedMovementDetails.es_condicional ? 'Prenda en Condicional' : selectedMovementDetails.alquiler_id ? 'Alquiler de Ropa' : 'Venta Directa'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-brand-gray uppercase">Fecha</p>
                    <p className="font-bold text-xs">{new Date(selectedMovementDetails.creado_en).toLocaleString()}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="bg-brand-lightGray p-4 rounded-semi">
                    <p className="text-[10px] font-black text-brand-gray uppercase mb-2">Resumen Financiero</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div><p className="text-[8px] font-black uppercase opacity-50">Total Original</p><p className="font-bold text-brand-black">{formatMoney(selectedMovementDetails.monto_original)}</p></div>
                       <div><p className="text-[8px] font-black uppercase opacity-50">Saldo Pendiente</p><p className="font-black text-brand-orange">{formatMoney(selectedMovementDetails.monto_pendiente)}</p></div>
                    </div>
                  </div>

                  {selectedMovementDetails.pagos_cuenta_corriente && selectedMovementDetails.pagos_cuenta_corriente.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase mb-2 flex items-center gap-1"><History size={12}/> Historial de Pagos:</p>
                      <div className="space-y-2">
                        {selectedMovementDetails.pagos_cuenta_corriente.map((p: any) => (
                          <div key={p.id} className="flex justify-between items-center text-[10px] p-2 bg-green-50 rounded border border-green-100">
                             <span className="font-bold">{new Date(p.creado_en).toLocaleDateString()} - {p.metodo_pago.toUpperCase()}</span>
                             <span className="font-black text-green-700">{formatMoney(p.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </div>

               <button onClick={() => setShowViewDetailsModal(false)} className="w-full py-4 bg-brand-black text-white font-black rounded-semi uppercase text-xs tracking-widest mt-4">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
