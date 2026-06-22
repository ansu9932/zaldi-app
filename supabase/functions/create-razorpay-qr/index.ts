// Supabase Edge Function: create a Razorpay UPI QR code for a specific order.
// The rider shows this QR; the customer scans & pays the EXACT order amount; Razorpay
// then fires a `qr_code.credited` webhook which marks the order paid automatically.
//
// Deploy:  supabase functions deploy create-razorpay-qr --no-verify-jwt
// Secrets it uses (already set):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// NOTE: the "QR Codes" (UPI QR) product must be enabled on your Razorpay account.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function code(id: string): string {
  return '#' + String(id).replace(/-/g, '').slice(0, 6).toUpperCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  try {
    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: 'order_id required' }), { status: 400, headers: cors });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order } = await supabase
      .from('orders')
      .select('id, total, payment_status, razorpay_qr_id')
      .eq('id', order_id)
      .single();
    if (!order) return new Response(JSON.stringify({ error: 'order not found' }), { status: 404, headers: cors });
    if (order.payment_status === 'paid') {
      return new Response(JSON.stringify({ error: 'already paid' }), { status: 409, headers: cors });
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const auth = 'Basic ' + btoa(`${keyId}:${keySecret}`);
    const paise = Math.round(Number(order.total) * 100);

    const rzpRes = await fetch('https://api.razorpay.com/v1/payments/qr_codes', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'upi_qr',
        name: 'next order ' + code(order.id),
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: paise,
        description: 'Order ' + code(order.id),
        notes: { order_id: order.id },
      }),
    });

    const rzp = await rzpRes.json();
    if (!rzpRes.ok || !rzp?.image_url) {
      return new Response(
        JSON.stringify({ error: rzp?.error?.description ?? 'Could not create Razorpay QR (is the QR Codes product enabled?)' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Remember the QR id so the webhook can match the payment back to this order.
    await supabase.from('orders').update({ razorpay_qr_id: rzp.id }).eq('id', order.id);

    return new Response(JSON.stringify({ qr_id: rzp.id, image_url: rzp.image_url, amount: order.total }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
