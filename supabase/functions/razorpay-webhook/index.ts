// Supabase Edge Function: Razorpay webhook receiver.
// Verifies the signature and marks the order as paid in the database.
//
// Deploy:  supabase functions deploy razorpay-webhook --no-verify-jwt
// Secrets: supabase secrets set RAZORPAY_WEBHOOK_SECRET=... \
//                              SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
// Then in Razorpay Dashboard -> Webhooks, add this function's URL and the secret,
// subscribe to event: payment.captured

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function verify(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === signature;
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;

  const ok = await verify(body, signature, secret);
  if (!ok) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(body);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let paidOrderId: string | null = null;
  let paymentId: string | null = null;

  if (event.event === 'payment.captured') {
    // Customer pre-paid UPI flow (checkout screen): matched by razorpay_order_id.
    const payment = event.payload.payment.entity;
    paymentId = payment.id;
    const { data: updated } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', razorpay_payment_id: payment.id, status: 'placed' })
      .eq('razorpay_order_id', payment.order_id)
      .select('id')
      .maybeSingle();
    paidOrderId = updated?.id ?? null;
  } else if (event.event === 'qr_code.credited') {
    // Rider "collect via Razorpay QR" flow: matched by the QR id / order_id note.
    const qr = event.payload.qr_code?.entity;
    const payment = event.payload.payment?.entity;
    paymentId = payment?.id ?? null;
    const orderId = qr?.notes?.order_id ?? null;
    const query = supabase
      .from('orders')
      .update({ payment_status: 'paid', payment_method: 'upi', razorpay_payment_id: payment?.id ?? null });
    const { data: updated } = orderId
      ? await query.eq('id', orderId).select('id').maybeSingle()
      : await query.eq('razorpay_qr_id', qr?.id).select('id').maybeSingle();
    paidOrderId = updated?.id ?? null;
  }

  // Notify the relevant parties once an order has been paid.
  if (paidOrderId) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/notify-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ order_id: paidOrderId }),
      });
    } catch (_e) {
      /* best-effort: never fail the webhook because a push didn't send */
    }
  }

  return new Response('ok', { status: 200 });
});
