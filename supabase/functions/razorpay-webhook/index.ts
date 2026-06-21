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
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    // Match by the razorpay order id we stored when creating the order.
    await supabase
      .from('orders')
      .update({ payment_status: 'paid', razorpay_payment_id: payment.id, status: 'placed' })
      .eq('razorpay_order_id', payment.order_id);
  }

  return new Response('ok', { status: 200 });
});
