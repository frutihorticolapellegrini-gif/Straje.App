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
    const { empresa_id, email_empresa, amount, plan_title, plan_type } = await req.json();
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

    if (!MP_ACCESS_TOKEN) throw new Error("Falta MP_ACCESS_TOKEN en los Secrets de Supabase");

    // Lógica de Precios con soporte oficial de planes y descuento del 50%:
    // - Si el frontend envía `amount` explícito mayor a 0, se respeta estrictamente
    // - En caso contrario, se determina según el plan (Estándar $15.000 / $30.000, Premium $30.000 / $60.000)
    let unit_price = 15000;
    const requestedAmount = Number(amount);

    if (requestedAmount > 0) {
      unit_price = requestedAmount;
    } else if (plan_type === 'premium') {
      unit_price = 30000; // Promo por defecto para nuevos usuarios
    } else {
      unit_price = 15000; // Promo Estándar por defecto
    }

    const title = plan_title || (plan_type === 'premium' ? "Suscripción Premium (-50%) - Straje.App" : "Suscripción Estándar (-50%) - Straje.App");

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [{
          title: title,
          quantity: 1,
          unit_price: unit_price,
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

    if (!response.ok) {
      console.error("Error Mercado Pago API:", data);
      throw new Error(data.message || "Error al crear preferencia en Mercado Pago");
    }

    return new Response(
      JSON.stringify({ init_point: data.init_point, id: data.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error en function mercadopago:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
