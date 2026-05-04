import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  try {
    const body = await req.json();
    const paymentId = body.data?.id || (body.type === "payment" ? body.id : null);
    
    if (paymentId) {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
      });
      
      const paymentData = await mpResponse.json();

      if (paymentData.status === "approved") {
        const empresaId = paymentData.external_reference;
        
        if (empresaId) {
          const nuevaFecha = new Date();
          nuevaFecha.setDate(nuevaFecha.getDate() + 30);

          await supabase
            .from("empresas")
            .update({ 
              plan: "premium", 
              activa: true, 
              fecha_fin_prueba: nuevaFecha.toISOString() 
            })
            .eq("id", empresaId);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
})
