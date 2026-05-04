import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 1. Definir los Headers de CORS
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // 2. Responder inmediatamente a las peticiones OPTIONS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { empresa_id, email_empresa } = await req.json();
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

    if (!MP_ACCESS_TOKEN) throw new Error("Falta MP_ACCESS_TOKEN en los Secrets de Supabase");

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [{
          title: "Suscripción Mensual - Straje.App",
          quantity: 1,
          unit_price: 40000,
          currency_id: "ARS"
        }],
        external_reference: empresa_id,
        payer: { email: email_empresa },
        back_urls: {
          success: "https://www.strajeapp.com/dashboard?status=success",
          failure: "https://www.strajeapp.com/dashboard?status=failure"
        },
        auto_return: "approved",
      })
    });

    const data = await response.json();

    return new Response(JSON.stringify({ init_point: data.init_point }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
