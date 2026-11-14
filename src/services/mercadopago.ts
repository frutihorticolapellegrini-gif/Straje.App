export interface MercadoPagoPreferenceParams {
  empresaId: string
  emailEmpresa: string
  amount: number
  planTitle: string
  planType: 'estandar' | 'premium'
}

/**
 * Crea una preferencia de pago de Mercado Pago con el importe exacto de forma directa.
 * Utiliza el Access Token oficial para garantizar que el precio reflejado en la pasarela
 * sea estrictamente el solicitado ($15.000 ARS promo Estándar / $30.000 ARS promo Premium).
 */
export const createMercadoPagoPreference = async (params: MercadoPagoPreferenceParams): Promise<string> => {
  const { empresaId, emailEmpresa, amount, planTitle } = params

  const MP_TOKEN = (import.meta as any).env.VITE_MP_ACCESS_TOKEN || 'APP_USR-2665665283455782-050117-cfb4e8c821d43b2d3bcf4e88692abae5-671274328'

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const baseUrl = isHttps ? window.location.origin : 'https://strajeapp.com'

  const preferencePayload: any = {
    items: [
      {
        title: planTitle,
        quantity: 1,
        unit_price: Number(amount),
        currency_id: 'ARS',
      },
    ],
    external_reference: empresaId || 'straje-app',
    payer: {
      email: (emailEmpresa && emailEmpresa.includes('@')) ? emailEmpresa : 'contacto@strajeapp.com',
    },
    back_urls: {
      success: `${baseUrl}/dashboard?status=success`,
      failure: `${baseUrl}/dashboard?status=failure`,
      pending: `${baseUrl}/dashboard?status=pending`,
    },
  }

  // auto_return solo es admitido por Mercado Pago cuando la URL de retorno es HTTPS
  if (isHttps) {
    preferencePayload.auto_return = 'approved'
  }

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferencePayload),
  })

  const data = await res.json()
  if (!res.ok || !data?.init_point) {
    console.error('Error en Mercado Pago API:', data)
    throw new Error(data?.message || 'Error al conectar con Mercado Pago')
  }

  return data.init_point
}
