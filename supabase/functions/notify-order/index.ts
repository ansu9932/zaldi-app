// Supabase Edge Function: send push notifications for an order.
// Called by the customer/merchant/rider apps after an order's status changes.
// It decides who to notify (customer / merchant / online riders) from the
// order's CURRENT status, then sends via the Expo Push API (no extra secret).
//
// Deploy:  supabase functions deploy notify-order --no-verify-jwt
// Secrets it uses (already set for the webhook):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PushMsg { to: string; title: string; body: string; sound: 'default'; priority: 'high'; channelId: string; data: Record<string, unknown> }

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
      .select('id, status, shop_id, rider_id, push_token')
      .eq('id', order_id)
      .single();
    if (!order) return new Response(JSON.stringify({ error: 'order not found' }), { status: 404, headers: cors });

    const c = code(order.id);
    const messages: PushMsg[] = [];
    const pushTo = (token: string | null | undefined, title: string, body: string) => {
      if (token && String(token).startsWith('ExponentPushToken')) {
        messages.push({ to: token, title, body, sound: 'default', priority: 'high', channelId: 'default', data: { orderId: order.id } });
      }
    };

    // ----- customer messages (one per status) -----
    const customerMsg: Record<string, [string, string]> = {
      placed: ['Order placed ✅', `Your order ${c} has been placed.`],
      accepted: ['Being prepared 👨‍🍳', `The store is preparing order ${c}.`],
      ready: ['Almost there 📦', `Order ${c} is packed — finding a rider.`],
      assigned: ['Rider on the way 🛵', `A rider is heading to pick up order ${c}.`],
      picked_up: ['On the way to you 🛵', `Order ${c} is on the way!`],
      delivered: ['Delivered 🎉', `Order ${c} has been delivered. Enjoy!`],
      cancelled: ['Order cancelled', `Order ${c} was cancelled. Any online payment will be refunded.`],
    };
    if (customerMsg[order.status]) {
      pushTo(order.push_token, customerMsg[order.status][0], customerMsg[order.status][1]);
    }

    // ----- merchant: new order -----
    if (order.status === 'placed' && order.shop_id) {
      const { data: merchants } = await supabase
        .from('staff')
        .select('push_token')
        .eq('role', 'merchant')
        .eq('shop_id', order.shop_id);
      for (const m of merchants ?? []) pushTo(m.push_token, 'New order 🛎️', `New order ${c} received.`);
    }

    // ----- riders: a job is ready to pick up -----
    if (order.status === 'ready') {
      const { data: riders } = await supabase
        .from('staff')
        .select('push_token')
        .eq('role', 'rider')
        .eq('active', true)
        .eq('is_online', true);
      for (const r of riders ?? []) pushTo(r.push_token, 'New delivery job 📦', `Order ${c} is ready for pickup.`);
    }

    if (messages.length === 0) return new Response(JSON.stringify({ sent: 0 }), { headers: { ...cors, 'Content-Type': 'application/json' } });

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await res.json();
    return new Response(JSON.stringify({ sent: messages.length, result }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
