import { supabase } from './supabase'

interface GeoLocationData {
  city?: string
  region?: string
  country?: string
  ip?: string
  latitude?: number
  longitude?: number
}

// Obtener geolocalización aproximada rápida por IP (timeout de 2.5s para no demorar)
export const getClientGeoLocation = async (): Promise<GeoLocationData> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)

    // Intentamos primero con ipapi
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return {
        city: data.city || '',
        region: data.region || '',
        country: data.country_name || 'Argentina',
        ip: data.ip || '',
        latitude: data.latitude,
        longitude: data.longitude,
      }
    }
  } catch (e) {
    // Silencioso: si falla la API externa, no afecta la experiencia del usuario
  }

  return { country: 'Argentina' }
}

// Registrar evento de Login
export const recordLoginEvent = async (params: {
  userId?: string
  email?: string
  nombre?: string
  empresaId?: string
  localidad?: string
}) => {
  try {
    // Evitar registrar loops constantes en la misma sesión
    const lastTrackKey = `last_login_track_${params.userId || params.email}`
    const lastTrack = sessionStorage.getItem(lastTrackKey)
    const now = Date.now()
    if (lastTrack && now - Number(lastTrack) < 1000 * 60 * 15) {
      // Si ya se registró en los últimos 15 minutos en esta pestaña/sesión, no duplicar
      return
    }
    sessionStorage.setItem(lastTrackKey, String(now))

    const geo = await getClientGeoLocation()
    const ciudad = geo.city || params.localidad || 'Buenos Aires'
    const provincia = geo.region || ''
    const pais = geo.country || 'Argentina'

    // 1. Guardar en tabla actividad_logins
    try {
      await supabase.from('actividad_logins').insert({
        usuario_id: params.userId || null,
        empresa_id: params.empresaId || null,
        email: params.email || '',
        nombre: params.nombre || '',
        ciudad,
        provincia,
        pais,
        ip: geo.ip || '',
        tipo: 'login',
        fecha: new Date().toISOString()
      })
    } catch (dbErr) {
      // Ignorar si la tabla aún no fue creada
    }

    // 2. Incrementar contador en empresa si corresponde
    if (params.empresaId) {
      try {
        const { data: emp } = await supabase
          .from('empresas')
          .select('cantidad_logins')
          .eq('id', params.empresaId)
          .single()

        const currentCount = Number(emp?.cantidad_logins) || 0
        await supabase
          .from('empresas')
          .update({
            ultimo_login: new Date().toISOString(),
            cantidad_logins: currentCount + 1
          })
          .eq('id', params.empresaId)
      } catch (empErr) {
        // Ignorar si las columnas no existen aún
      }
    }
  } catch (err) {
    console.error('Error no crítico registrando login:', err)
  }
}

// Registrar evento de Registro
export const recordRegisterEvent = async (params: {
  userId?: string
  email?: string
  nombre?: string
  empresaId?: string
  localidad?: string
  telefono?: string
  nombreEmpresa?: string
}) => {
  try {
    const geo = await getClientGeoLocation()
    const ciudad = params.localidad || geo.city || 'Buenos Aires'

    try {
      await supabase.from('actividad_logins').insert({
        usuario_id: params.userId || null,
        empresa_id: params.empresaId || null,
        email: params.email || '',
        nombre: params.nombre || params.nombreEmpresa || '',
        ciudad,
        provincia: geo.region || '',
        pais: geo.country || 'Argentina',
        ip: geo.ip || '',
        tipo: 'registro',
        fecha: new Date().toISOString()
      })
    } catch (e) {
      // Silencioso
    }
  } catch (err) {
    console.error('Error registrando registro:', err)
  }
}
