import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, ExternalLink, Users, Sparkles } from 'lucide-react'

// Diccionario de coordenadas para ciudades y provincias de Argentina y región
const COORDENADAS_CONOCIDAS: Record<string, [number, number]> = {
  // CABA y GBA
  'buenos aires': [-34.6037, -58.3816],
  'caba': [-34.6037, -58.3816],
  'capital federal': [-34.6037, -58.3816],
  'la plata': [-34.9214, -57.9545],
  'mar del plata': [-38.0055, -57.5562],
  'quilmes': [-34.7242, -58.2606],
  'lanus': [-34.7071, -58.3968],
  'lanús': [-34.7071, -58.3968],
  'lomas de zamora': [-34.7600, -58.4000],
  'san isidro': [-34.4716, -58.5283],
  'vicente lopez': [-34.5269, -58.4839],
  'vicente lópez': [-34.5269, -58.4839],
  'moron': [-34.6534, -58.6198],
  'morón': [-34.6534, -58.6198],
  'tigre': [-34.4260, -58.5796],
  'tandil': [-37.3217, -59.1332],
  'bahia blanca': [-38.7183, -62.2663],
  'bahía blanca': [-38.7183, -62.2663],
  'san martin': [-34.5775, -58.5369],
  'san martín': [-34.5775, -58.5369],

  // Santa Fe
  'rosario': [-32.9468, -60.6393],
  'santa fe': [-31.6333, -60.7000],
  'rafaela': [-31.2503, -61.4867],
  'venado tuerto': [-33.7456, -61.9688],

  // Córdoba
  'cordoba': [-31.4201, -64.1888],
  'córdoba': [-31.4201, -64.1888],
  'villa maria': [-32.4075, -63.2403],
  'villa maría': [-32.4075, -63.2403],
  'rio cuarto': [-33.1307, -64.3499],
  'río cuarto': [-33.1307, -64.3499],
  'villa carlos paz': [-31.4241, -64.4978],

  // Mendoza & Cuyo
  'mendoza': [-32.8895, -68.8458],
  'san rafael': [-34.6177, -68.3301],
  'godoy cruz': [-32.9197, -68.8475],
  'san juan': [-31.5375, -68.5364],
  'san luis': [-33.2950, -66.3356],
  'villa mercedes': [-33.6758, -65.4578],

  // Norte
  'salta': [-24.7821, -65.4232],
  'san salvador de jujuy': [-24.1858, -65.2995],
  'jujuy': [-24.1858, -65.2995],
  'tucuman': [-26.8083, -65.2176],
  'tucumán': [-26.8083, -65.2176],
  'san miguel de tucuman': [-26.8083, -65.2176],
  'santiago del estero': [-27.7951, -64.2615],
  'catamarca': [-28.4696, -65.7852],
  'la rioja': [-29.4135, -66.8565],

  // Litoral
  'parana': [-31.7333, -60.5333],
  'paraná': [-31.7333, -60.5333],
  'concordia': [-31.3930, -58.0209],
  'corrientes': [-27.4692, -58.8306],
  'goya': [-29.1444, -59.2636],
  'posadas': [-27.3621, -55.8961],
  'resistencia': [-27.4514, -58.9867],
  'formosa': [-26.1775, -58.1781],

  // Patagonia y Sur
  'neuquen': [-38.9516, -68.0591],
  'neuquén': [-38.9516, -68.0591],
  'bariloche': [-41.1335, -71.3103],
  'san carlos de bariloche': [-41.1335, -71.3103],
  'cipolletti': [-38.9405, -67.9906],
  'santa rosa': [-36.6167, -64.2833],
  'general roca': [-39.0333, -67.5833],
  'comodoro rivadavia': [-45.8656, -67.4966],
  'trelew': [-43.2490, -65.3051],
  'puerto madryn': [-42.7692, -65.0385],
  'rio gallegos': [-51.6226, -69.2181],
  'río gallegos': [-51.6226, -69.2181],
  'ushuaia': [-54.8019, -68.3030],

  // Otros países vecinos
  'montevideo': [-34.9011, -56.1645],
  'santiago': [-33.4489, -70.6693],
  'asuncion': [-25.2637, -57.5759],
  'asunción': [-25.2637, -57.5759],
}

// Función helper para encontrar coordenadas
export const getCoordenadasPorLocalidad = (localidad?: string): [number, number] => {
  if (!localidad) return [-34.6037, -58.3816] // Buenos Aires por defecto
  const clean = localidad.toLowerCase().trim()

  // Buscar coincidencia exacta
  if (COORDENADAS_CONOCIDAS[clean]) {
    return COORDENADAS_CONOCIDAS[clean]
  }

  // Buscar coincidencia parcial
  for (const [key, coords] of Object.entries(COORDENADAS_CONOCIDAS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords
    }
  }

  // Generar pequeña variación determinística en base al texto para no superponer
  let hash = 0
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash)
  }
  const jitterLat = ((hash % 100) / 100) * 1.5
  const jitterLng = (((hash >> 3) % 100) / 100) * 1.5

  return [-34.6037 + jitterLat, -58.3816 + jitterLng]
}

export interface UsuarioMapaItem {
  id: string
  nombreNegocio: string
  nombreContacto: string
  email: string
  telefono?: string
  localidad?: string
  direccion?: string
  fechaRegistro: string
  loginsCount: number
  plan: string
  esNuevo: boolean // Registrado hace menos de 7 días
}

interface Props {
  usuarios: UsuarioMapaItem[]
}

export const MapaUsuarios: React.FC<Props> = ({ usuarios }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  // Agrupar usuarios por localidad
  const gruposLocalidad: Record<string, UsuarioMapaItem[]> = {}
  usuarios.forEach(u => {
    const loc = (u.localidad || 'Buenos Aires').trim().toUpperCase()
    if (!gruposLocalidad[loc]) gruposLocalidad[loc] = []
    gruposLocalidad[loc].push(u)
  })

  const localidadesOrdenadas = Object.entries(gruposLocalidad)
    .sort((a, b) => b[1].length - a[1].length)

  const totalNuevos = usuarios.filter(u => u.esNuevo).length

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Limpiar mapa previo si existe
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Inicializar mapa de Leaflet
    const map = L.map(mapContainerRef.current, {
      center: [-34.6037, -64.0],
      zoom: 4.5,
      scrollWheelZoom: true,
      zoomControl: true,
    })

    // CartoDB Voyager / Positron para un mapa limpio y moderno
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map

    // Agregar pines por localidad
    localidadesOrdenadas.forEach(([locNombre, lista]) => {
      const [lat, lng] = getCoordenadasPorLocalidad(locNombre)
      const tieneNuevos = lista.some(u => u.esNuevo)
      const totalLogins = lista.reduce((acc, u) => acc + (u.loginsCount || 1), 0)

      // Crear icono pulsante personalizado en HTML SVG
      const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          ${tieneNuevos ? `
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(34, 197, 94, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          ` : `
            <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(37, 99, 235, 0.25);"></div>
          `}
          <div style="
            position: relative; 
            width: 26px; 
            height: 26px; 
            border-radius: 50%; 
            background: ${tieneNuevos ? '#16a34a' : '#2563eb'}; 
            color: white; 
            font-weight: 900; 
            font-size: 11px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${lista.length}
          </div>
        </div>
      `

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-map-pin',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)

      // Contenido del popup
      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 220px; padding: 4px;">
          <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 8px;">
            <div style="font-weight: 900; font-size: 13px; text-transform: uppercase; color: #111827;">📍 ${locNombre}</div>
            <div style="font-size: 10px; font-weight: bold; color: #6b7280; text-transform: uppercase;">
              ${lista.length} ${lista.length === 1 ? 'Usuario / Negocio' : 'Usuarios / Negocios'} · ${totalLogins} Inicios
            </div>
            ${tieneNuevos ? `
              <span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #dcfce7; color: #166534; font-weight: 900; font-size: 9px; border-radius: 4px; text-transform: uppercase;">
                ✨ ¡Público Nuevo Aquí!
              </span>
            ` : ''}
          </div>
          <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
            ${lista.map(u => {
              const cleanPhone = u.telefono ? u.telefono.replace(/\D/g, '') : ''
              const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('54') ? cleanPhone : '549' + cleanPhone}?text=Hola%20${encodeURIComponent(u.nombreContacto || u.nombreNegocio)},%20te%20escribo%20del%20equipo%20de%20Straje.App.` : null

              return `
                <div style="background: #f9fafb; padding: 6px 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
                  <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1f2937;">${u.nombreNegocio}</div>
                  <div style="font-size: 10px; color: #4b5563;">👤 ${u.nombreContacto || 'Titular'}</div>
                  <div style="font-size: 9px; color: #6b7280;">📧 ${u.email}</div>
                  <div style="font-size: 9px; font-weight: bold; color: #2563eb; margin-top: 2px;">⚡ ${u.loginsCount || 1} Inicios de sesión</div>
                  ${waLink ? `
                    <a href="${waLink}" target="_blank" rel="noopener noreferrer" style="
                      display: inline-flex; 
                      align-items: center; 
                      gap: 4px; 
                      margin-top: 6px; 
                      padding: 4px 8px; 
                      background: #22c55e; 
                      color: white; 
                      font-size: 10px; 
                      font-weight: bold; 
                      text-decoration: none; 
                      border-radius: 4px; 
                      text-transform: uppercase;
                    ">
                      💬 WhatsApp
                    </a>
                  ` : ''}
                </div>
              `
            }).join('')}
          </div>
        </div>
      `

      marker.bindPopup(popupHtml)
    })

    // Si hay ubicaciones, ajustar el mapa para que abarque todas
    if (localidadesOrdenadas.length > 0) {
      const bounds = L.latLngBounds(
        localidadesOrdenadas.map(([loc]) => getCoordenadasPorLocalidad(loc))
      )
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [usuarios])

  return (
    <div className="space-y-6">
      {/* TARJETA DE CONTROL GEOGRÁFICO Y PROPAGANDA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-brand-blue to-blue-700 text-white p-5 rounded-semi shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Ciudades con Clientes</p>
            <p className="text-3xl font-black italic mt-1">{localidadesOrdenadas.length}</p>
            <p className="text-[10px] font-bold text-blue-100 uppercase mt-1">Presencia territorial activa</p>
          </div>
          <div className="p-3 bg-white/10 rounded-full">
            <MapPin size={28} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white p-5 rounded-semi shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Público Nuevo (Últimos 7d)</p>
            <p className="text-3xl font-black italic mt-1">{totalNuevos}</p>
            <p className="text-[10px] font-bold text-emerald-100 uppercase mt-1">Nuevos registros para seguimiento</p>
          </div>
          <div className="p-3 bg-white/10 rounded-full">
            <Sparkles size={28} />
          </div>
        </div>

        <div className="bg-brand-black text-white p-5 rounded-semi shadow-xl flex items-center justify-between border-b-4 border-emerald-500">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Objetivo Propaganda</p>
            <p className="text-base font-black uppercase tracking-tight mt-1 truncate max-w-[200px]">
              {localidadesOrdenadas[0] ? localidadesOrdenadas[0][0] : 'Sin datos'}
            </p>
            <p className="text-[10px] font-bold text-gray-300 uppercase mt-1">Zona con mayor densidad y tracción</p>
          </div>
          <div className="p-3 bg-white/10 rounded-full">
            <Users size={28} className="text-emerald-400" />
          </div>
        </div>
      </div>

      {/* MAPA Y RANKING TERRITORIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CONTENEDOR DEL MAPA LEAFLET */}
        <div className="lg:col-span-2 bg-white rounded-semi shadow-xl border border-brand-gray/10 p-4 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="text-base font-black uppercase tracking-tight text-brand-black flex items-center gap-2">
                <MapPin className="text-brand-blue" size={18} />
                Mapa de Distribución de Registros y Accesos
              </h4>
              <p className="text-[11px] text-brand-gray font-bold uppercase">
                Haz clic en los pines para ver los negocios y enviar WhatsApp
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase">
              <span className="flex items-center gap-1 text-green-600">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block"></span> Nuevo
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Registrado
              </span>
            </div>
          </div>

          <div 
            ref={mapContainerRef} 
            className="w-full h-[450px] rounded-semi border border-brand-gray/20 shadow-inner z-0"
          />
        </div>

        {/* RANKING DE ZONAS PARA PROPAGANDA */}
        <div className="bg-white rounded-semi shadow-xl border border-brand-gray/10 p-5 flex flex-col">
          <h4 className="text-sm font-black uppercase tracking-widest text-brand-black mb-1 flex items-center gap-2">
            <ExternalLink size={16} className="text-brand-blue" />
            Control de Propaganda y Zonas
          </h4>
          <p className="text-[10px] text-brand-gray font-bold uppercase mb-4">
            Distribución geográfica de clientes para pauta publicitaria
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
            {localidadesOrdenadas.length === 0 ? (
              <p className="text-xs text-brand-gray text-center py-8 font-bold uppercase">No hay localidades registradas</p>
            ) : (
              localidadesOrdenadas.map(([loc, list], idx) => {
                const pct = Math.round((list.length / usuarios.length) * 100)
                const nuevosEnLoc = list.filter(u => u.esNuevo).length

                return (
                  <div key={loc} className="p-3 bg-brand-lightGray/60 rounded-semi border border-brand-gray/5 hover:bg-brand-lightGray transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black w-4 text-brand-gray">#{idx + 1}</span>
                        <span className="text-xs font-black uppercase text-brand-black">{loc}</span>
                        {nuevosEnLoc > 0 && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded uppercase">
                            +{nuevosEnLoc} nuevos
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-brand-blue">{list.length} {list.length === 1 ? 'cliente' : 'clientes'}</span>
                    </div>

                    {/* Barra de porcentaje */}
                    <div className="w-full bg-brand-gray/15 h-2 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          nuevosEnLoc > 0 ? 'bg-green-500' : 'bg-brand-blue'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[9px] text-brand-gray font-bold uppercase">
                      <span>{pct}% del total</span>
                      <span>{list.reduce((acc, u) => acc + (u.loginsCount || 1), 0)} logins</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
