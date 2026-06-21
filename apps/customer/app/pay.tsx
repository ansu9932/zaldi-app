import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { colors, spacing, radius } from '../lib/brand';
import { createRazorpayOrder, attachRazorpayOrder, markOrderPaid } from '../lib/api';
import { useStore } from '../lib/store';

const KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

export default function Pay() {
  const { orderId, amount } = useLocalSearchParams<{ orderId: string; amount: string }>();
  const { name, phone } = useStore();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const amt = Number(amount ?? 0);

  useEffect(() => {
    (async () => {
      if (!KEY_ID) {
        setError('Razorpay key not set. Add EXPO_PUBLIC_RAZORPAY_KEY_ID to the app .env.');
        return;
      }
      const rzp = await createRazorpayOrder(amt, `rcpt_${orderId}`);
      if (!rzp) {
        setError('Could not start payment. Make sure the create-razorpay-order function is deployed (see GO_LIVE.md, Step 3).');
        return;
      }
      await attachRazorpayOrder(String(orderId), rzp.id);
      setHtml(buildHtml(KEY_ID, rzp.id, amt, name ?? '', phone ?? ''));
    })();
  }, []);

  async function onMessage(raw: string) {
    try {
      const msg = JSON.parse(raw);
      if (msg.status === 'success') {
        await markOrderPaid(String(orderId), msg.resp?.razorpay_payment_id ?? '');
        router.replace('/track');
      } else if (msg.status === 'dismiss' || msg.status === 'error') {
        Alert.alert('Payment cancelled', 'Your order was not paid. You can try again.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch {}
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Payment' }} />
        <Text style={{ fontSize: 40 }}>⚠️</Text>
        <Text style={styles.errTitle}>Payment unavailable</Text>
        <Text style={styles.errText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!html) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Payment' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loading}>Starting secure payment…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Pay securely' }} />
      <WebView
        source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
        onMessage={(e) => onMessage(e.nativeEvent.data)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
    </View>
  );
}

function buildHtml(key: string, rzpOrderId: string, amount: number, name: string, phone: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:sans-serif;background:#0F172A;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div>Opening payment…</div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = {
    key: "${key}",
    amount: ${Math.round(amount * 100)},
    currency: "INR",
    name: "next",
    description: "Order payment",
    order_id: "${rzpOrderId}",
    prefill: { name: "${name}", contact: "${phone}" },
    theme: { color: "#00D16B" },
    handler: function (resp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: "success", resp: resp }));
    },
    modal: { ondismiss: function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: "dismiss" }));
    }}
  };
  try { var rzp = new Razorpay(options); rzp.open(); }
  catch (e) { window.ReactNativeWebView.postMessage(JSON.stringify({ status: "error", error: String(e) })); }
</script>
</body></html>`;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  loading: { marginTop: 16, color: colors.inkMuted, fontWeight: '600' },
  errTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 12 },
  errText: { color: colors.inkMuted, textAlign: 'center', marginTop: 8, fontSize: 14, lineHeight: 20 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 28, paddingVertical: 14, marginTop: 20 },
  btnText: { color: colors.white, fontWeight: '800' },
});
