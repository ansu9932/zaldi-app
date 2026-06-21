import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { computeFees, distanceKm, estimatedDeliveryMin, SERVICE_CENTER } from '../lib/algorithms';
import { shopById } from '../lib/catalog';
import { useStore } from '../lib/store';
import { createOrder } from '../lib/api';

export default function Cart() {
  const insets = useSafeAreaInsets();
  const { lines, add, remove, subtotal, location, clear, selectedAddress, setLastOrder, addToHistory, name, phone } = useStore();
  const [placing, setPlacing] = useState(false);
  const items = Object.values(lines);
  const sub = subtotal();
  const address = selectedAddress();

  // distance from shop to the delivery address (falls back to device location)
  const shopLoc = useMemo(() => {
    const first = items[0];
    const shop = first ? shopById(first.product.shopId) : undefined;
    return shop?.location ?? SERVICE_CENTER;
  }, [items]);

  const shopToCustomerKm = useMemo(() => {
    const dest = address ? { lat: address.lat, lng: address.lng } : location ?? SERVICE_CENTER;
    return Math.max(0.5, distanceKm(shopLoc, dest));
  }, [shopLoc, address, location]);

  const fees = computeFees({ subtotal: sub, shopToCustomerKm, isRaining: false });
  const eta = estimatedDeliveryMin(shopToCustomerKm);
  const canOrder = items.length > 0 && !!address && !placing;

  function placeOrder(method: 'upi' | 'cod') {
    if (!address || items.length === 0) return;
    setPlacing(true);
    const itemCount = items.reduce((s, l) => s + l.qty, 0);
    const shopLocalId = items[0].product.shopId;

    createOrder({
      items,
      shopLocalId,
      name: name ?? address.name,
      phone: phone ?? address.phone,
      address,
      distanceKm: shopToCustomerKm,
      subtotal: fees.subtotal,
      deliveryFee: fees.deliveryFee,
      rainFee: fees.rainFee,
      surgeFee: fees.surgeFee,
      total: fees.total,
      eta,
      paymentMethod: method,
    }).then((res) => {
      if (!res.ok) {
        setPlacing(false);
        Alert.alert(
          'Could not place order',
          (res.error ?? 'Unknown error') +
            '\n\nTip: make sure live_setup.sql was run in Supabase and the app .env has your keys.',
        );
        return;
      }
      setLastOrder({ id: res.id, total: fees.total, eta, paymentMethod: method, address, shop: shopLoc });
      addToHistory({
        id: res.id,
        total: fees.total,
        paymentMethod: method,
        createdAt: Date.now(),
        itemCount,
        addressLabel: address.label,
        status: 'Delivered',
      });
      clear();
      setPlacing(false);
      router.replace('/track');
    });
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => router.replace('/home')}>
          <Text style={styles.shopBtnText}>Start shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 280 }}>
        <View style={styles.etaBanner}>
          <Text style={styles.etaEmoji}>⚡</Text>
          <Text style={styles.etaText}>Arriving in ~{eta} min</Text>
        </View>

        {/* Delivery address */}
        <TouchableOpacity style={styles.addrCard} onPress={() => router.push('/address')}>
          {address ? (
            <>
              <View style={styles.addrHead}>
                <Text style={styles.addrLabel}>
                  {address.label === 'Home' ? '🏠' : address.label === 'Work' ? '🏢' : '📍'} Deliver to {address.label}
                </Text>
                <Text style={styles.changeText}>Change</Text>
              </View>
              <Text style={styles.addrName}>{address.name} · {address.phone}</Text>
              <Text style={styles.addrLine}>{address.line}{address.landmark ? `, ${address.landmark}` : ''}</Text>
            </>
          ) : (
            <View style={styles.addrHead}>
              <Text style={styles.addrAddText}>📍 Add delivery address & name</Text>
              <Text style={styles.changeText}>Add</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Items */}
        <View style={styles.card}>
          {items.map((l) => (
            <View key={l.product.id} style={styles.itemRow}>
              <Text style={{ fontSize: 26 }}>{l.product.emoji}</Text>
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
          <BillRow label={`Delivery fee (${shopToCustomerKm.toFixed(1)} km)`} value={`₹${fees.deliveryFee}`} />
          {fees.rainFee > 0 && <BillRow label="🌧️ Rain fee" value={`₹${fees.rainFee}`} />}
          {fees.surgeFee > 0 && <BillRow label="Surge fee" value={`₹${fees.surgeFee}`} />}
          <View style={styles.divider} />
          <BillRow label="To pay" value={`₹${fees.total}`} bold />
        </View>
      </ScrollView>

      {/* Checkout */}
      <View style={[styles.checkout, { paddingBottom: insets.bottom + 12 }]}>
        {!address && (
          <Text style={styles.needAddr}>Add a delivery address to place your order.</Text>
        )}
        <TouchableOpacity
          disabled={!canOrder}
          style={[styles.payBtn, !canOrder && styles.payBtnDisabled]}
          onPress={() => placeOrder('upi')}
        >
          <Text style={styles.payBtnText}>Pay ₹{fees.total} via UPI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!canOrder}
          style={[styles.codBtn, !canOrder && styles.codBtnDisabled]}
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

  etaBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  etaEmoji: { fontSize: 18 },
  etaText: { color: colors.primaryDark, fontWeight: '800', fontSize: 15 },

  addrCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  addrHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addrLabel: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  addrAddText: { fontWeight: '800', color: colors.primaryDark, fontSize: 14 },
  changeText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  addrName: { color: colors.inkMuted, fontSize: 13, marginTop: 6 },
  addrLine: { color: colors.inkMuted, fontSize: 13, marginTop: 2 },

  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
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

  checkout: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  needAddr: { color: colors.error, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  payBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  payBtnDisabled: { backgroundColor: colors.inkFaint },
  payBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  codBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  codBtnDisabled: { backgroundColor: colors.border },
  codBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
