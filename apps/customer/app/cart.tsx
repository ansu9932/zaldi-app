import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import {
  computeFees,
  distanceKm,
  estimatedDeliveryMin,
  MIN_ORDER_AMOUNT,
  SERVICE_CENTER,
} from '../lib/algorithms';
import { SHOPS } from '../lib/demoData';
import { useStore } from '../lib/store';

export default function Cart() {
  const insets = useSafeAreaInsets();
  const { lines, add, remove, subtotal, location, clear } = useStore();
  const [placing, setPlacing] = useState(false);
  const items = Object.values(lines);
  const sub = subtotal();

  // distance from the shop (of first item) to the customer
  const shopToCustomerKm = useMemo(() => {
    const first = items[0];
    if (!first) return 2;
    const shop = SHOPS.find((s) => s.id === first.product.shopId);
    const customer = location ?? SERVICE_CENTER;
    if (!shop) return 2;
    return Math.max(0.5, distanceKm(shop.location, customer));
  }, [items, location]);

  // NOTE: isRaining + surge come live from weather/rider APIs later (demo = false/0)
  const fees = computeFees({
    subtotal: sub,
    shopToCustomerKm,
    isRaining: false,
  });
  const eta = estimatedDeliveryMin(shopToCustomerKm);

  function placeOrder(method: 'upi' | 'cod') {
    if (!fees.meetsMinimum) return;
    setPlacing(true);
    // DEMO: real Razorpay + Supabase order creation is wired in Stage 8.
    setTimeout(() => {
      setPlacing(false);
      Alert.alert(
        'Order placed! 🎉',
        `Payment: ${method === 'upi' ? 'UPI (Razorpay)' : 'Cash on Delivery'}\n` +
          `Total: ₹${fees.total}\nArriving in ~${eta} min.`,
        [
          {
            text: 'Great!',
            onPress: () => {
              clear();
              router.replace('/');
            },
          },
        ]
      );
    }, 700);
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => router.replace('/')}>
          <Text style={styles.shopBtnText}>Start shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 260 }}>
        {/* ETA banner */}
        <View style={styles.etaBanner}>
          <Text style={styles.etaEmoji}>⚡</Text>
          <Text style={styles.etaText}>Arriving in ~{eta} min</Text>
        </View>

        {/* Items */}
        <View style={styles.card}>
          {items.map((l) => (
            <View key={l.product.id} style={styles.itemRow}>
              <Text style={{ fontSize: 24 }}>{l.product.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{l.product.name}</Text>
                <Text style={styles.itemUnit}>{l.product.unit} · ₹{l.product.price}</Text>
              </View>
              <View style={styles.qtyBox}>
                <TouchableOpacity onPress={() => remove(l.product.id)} style={styles.qtyBtn}>
                  <Text style={styles.qtySign}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{l.qty}</Text>
                <TouchableOpacity onPress={() => add(l.product)} style={styles.qtyBtn}>
                  <Text style={styles.qtySign}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Bill */}
        <View style={styles.card}>
          <Text style={styles.billTitle}>Bill details</Text>
          <BillRow label="Item total" value={`₹${fees.subtotal}`} />
          <BillRow
            label={`Delivery fee (${shopToCustomerKm.toFixed(1)} km)`}
            value={`₹${fees.deliveryFee}`}
          />
          {fees.rainFee > 0 && <BillRow label="🌧️ Rain fee" value={`₹${fees.rainFee}`} />}
          {fees.surgeFee > 0 && <BillRow label="Surge fee" value={`₹${fees.surgeFee}`} />}
          <View style={styles.divider} />
          <BillRow label="To pay" value={`₹${fees.total}`} bold />
        </View>

        {!fees.meetsMinimum && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              Minimum order is ₹{MIN_ORDER_AMOUNT}. Add items worth ₹
              {fees.amountToMinimum} more to place your order.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Checkout */}
      <View style={[styles.checkout, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          disabled={!fees.meetsMinimum || placing}
          style={[styles.payBtn, (!fees.meetsMinimum || placing) && styles.payBtnDisabled]}
          onPress={() => placeOrder('upi')}
        >
          <Text style={styles.payBtnText}>Pay ₹{fees.total} via UPI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!fees.meetsMinimum || placing}
          style={[styles.codBtn, (!fees.meetsMinimum || placing) && styles.codBtnDisabled]}
          onPress={() => placeOrder('cod')}
        >
          <Text style={styles.codBtnText}>Cash on Delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BillRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
      <Text style={[styles.billValue, bold && styles.billBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  shopBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill, marginTop: 8 },
  shopBtnText: { color: colors.white, fontWeight: '700' },

  etaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryLight, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  etaEmoji: { fontSize: 18 },
  etaText: { color: colors.primaryDark, fontWeight: '800', fontSize: 15 },

  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8 },
  itemName: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  itemUnit: { color: colors.inkFaint, fontSize: 12, marginTop: 2 },

  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.sm },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qtySign: { color: colors.white, fontWeight: '900', fontSize: 16 },
  qtyNum: { color: colors.white, fontWeight: '800', minWidth: 16, textAlign: 'center' },

  billTitle: { fontWeight: '800', color: colors.ink, fontSize: 15, marginBottom: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  billLabel: { color: colors.inkMuted, fontSize: 14 },
  billValue: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  billBold: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  warnBox: { backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: spacing.md },
  warnText: { color: '#92400E', fontWeight: '600', fontSize: 13 },

  checkout: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.lg, gap: spacing.sm,
  },
  payBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  payBtnDisabled: { backgroundColor: colors.inkFaint },
  payBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  codBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  codBtnDisabled: { backgroundColor: colors.border },
  codBtnText: { color: colors.ink, fontWeight: '800', fontSize: 16 },
});
