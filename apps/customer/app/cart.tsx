import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { computeFees, distanceKm, estimatedDeliveryMin, isServiceable, SERVICE_CENTER, SERVICE_RADIUS_KM } from '../lib/algorithms';
import { useStore } from '../lib/store';
import { createOrder } from '../lib/api';
import { DEMO_MODE } from '../lib/supabase';
import { fetchIsRaining } from '../lib/weather';
import { applyCoupon, discountFor, Coupon } from '../lib/coupons';

const TIP_OPTIONS = [0, 10, 20, 30];

export default function Cart() {
  const insets = useSafeAreaInsets();
  const { lines, add, remove, subtotal, location, clear, selectedAddress, setLastOrder, addToHistory, name, phone, pushToken, setPendingCheckout } = useStore();
  const [placing, setPlacing] = useState(false);
  const [raining, setRaining] = useState(false);
  const [tip, setTip] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const items = Object.values(lines);
  const sub = subtotal();
  const address = selectedAddress();

  // Check live weather for the delivery point to auto-apply the rain fee.
  useEffect(() => {
    const dest = address ? { lat: address.lat, lng: address.lng } : location;
    if (!dest) return;
    fetchIsRaining(dest.lat, dest.lng).then(setRaining);
  }, [address?.id, location?.lat]);

  // distance from shop to the delivery address (falls back to device location)
  const shopLoc = useMemo(() => {
    const first = items[0];
    if (first?.product.shopLat != null && first?.product.shopLng != null) {
      return { lat: first.product.shopLat, lng: first.product.shopLng };
    }
    return SERVICE_CENTER;
  }, [items]);

  const shopToCustomerKm = useMemo(() => {
    const dest = address ? { lat: address.lat, lng: address.lng } : location ?? SERVICE_CENTER;
    return Math.max(0.5, distanceKm(shopLoc, dest));
  }, [shopLoc, address, location]);

  const fees = computeFees({ subtotal: sub, shopToCustomerKm, isRaining: raining });

  // Re-evaluate the applied coupon whenever the cart total changes (it may drop
  // below the minimum, or the free-delivery amount may change).
  const discount = coupon ? discountFor(coupon, fees.subtotal, fees.deliveryFee) : 0;
  useEffect(() => {
    if (coupon && discount <= 0) {
      setCoupon(null);
      setCouponMsg('Coupon removed — your cart no longer qualifies.');
    }
  }, [discount, coupon]);

  const finalTotal = Math.max(0, fees.total - discount + tip);
  const eta = estimatedDeliveryMin(shopToCustomerKm);

  // Checkout-time delivery-area validation against the actual delivery address.
  const addrCheck = address ? isServiceable({ lat: address.lat, lng: address.lng }) : null;
  const addrServiceable = !addrCheck || addrCheck.ok;
  const canOrder = items.length > 0 && !!address && addrServiceable && !placing;

  async function onApplyCoupon() {
    setCheckingCoupon(true);
    setCouponMsg(null);
    const res = await applyCoupon(couponInput, fees.subtotal, fees.deliveryFee);
    setCheckingCoupon(false);
    if (res.ok && res.coupon) {
      setCoupon(res.coupon);
      setCouponMsg(`${res.coupon.code} applied · you save ₹${res.discount}`);
    } else {
      setCoupon(null);
      setCouponMsg(res.error ?? 'Could not apply coupon.');
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput('');
    setCouponMsg(null);
  }

  function placeOrder(method: 'upi' | 'cod') {
    if (!address || items.length === 0) return;
    if (!addrServiceable) {
      Alert.alert('Outside delivery area', `This address is about ${addrCheck?.distanceKm} km away. next delivers only within ${SERVICE_RADIUS_KM} km of Contai.`);
      return;
    }
    setPlacing(true);
    const itemCount = items.reduce((s, l) => s + l.qty, 0);
    const shopId = items[0].product.shopId;

    createOrder({
      items,
      shopId,
      name: name ?? address.name,
      phone: phone ?? address.phone,
      address,
      distanceKm: shopToCustomerKm,
      subtotal: fees.subtotal,
      deliveryFee: fees.deliveryFee,
      rainFee: fees.rainFee,
      surgeFee: fees.surgeFee,
      discount,
      tip,
      couponCode: coupon?.code ?? null,
      pushToken,
      isRaining: raining,
      total: finalTotal,
      eta,
      paymentMethod: method,
    }).then((res) => {
      if (!res.ok) {
        setPlacing(false);
        Alert.alert(
          'Could not place order',
          (res.error ?? 'Unknown error') +
            '\n\nTip: make sure live_setup.sql + secure_setup_v2.sql were run in Supabase and the app .env has your keys.',
        );
        return;
      }
      // The server is the source of truth for the amount (it re-prices the cart).
      const serverTotal = res.total ?? finalTotal;
      const last = { id: res.id, total: serverTotal, eta: res.eta ?? eta, paymentMethod: method, address, shop: shopLoc, discount, tip, couponCode: coupon?.code ?? null, otp: res.otp ?? null };
      const history = {
        id: res.id,
        total: serverTotal,
        paymentMethod: method,
        createdAt: Date.now(),
        itemCount,
        addressLabel: address.label,
        status: 'Placed',
        discount,
        tip,
        items: items.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price, productId: l.product.id })),
        reorder: items.map((l) => ({ product: l.product, qty: l.qty })),
      };

      setPlacing(false);

      if (method === 'upi' && !DEMO_MODE) {
        // Defer: only commit (clear cart + add history + set active order) AFTER
        // the payment succeeds, so abandoning the payment screen leaves no ghost order.
        setPendingCheckout({ last, history });
        router.replace(`/pay?orderId=${encodeURIComponent(res.id)}&amount=${serverTotal}`);
      } else {
        setLastOrder(last);
        addToHistory(history);
        clear();
        router.replace('/track');
      }
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

        {/* Coupon */}
        <View style={styles.card}>
          <Text style={styles.billTitle}>🎟️ Apply coupon</Text>
          {coupon ? (
            <View style={styles.couponApplied}>
              <View style={{ flex: 1 }}>
                <Text style={styles.couponCode}>{coupon.code}</Text>
                <Text style={styles.couponDesc}>{coupon.label}</Text>
              </View>
              <TouchableOpacity onPress={removeCoupon}><Text style={styles.couponRemove}>Remove</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                placeholder="Enter promo code"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="characters"
                value={couponInput}
                onChangeText={setCouponInput}
              />
              <TouchableOpacity style={styles.couponBtn} onPress={onApplyCoupon} disabled={checkingCoupon || !couponInput.trim()}>
                {checkingCoupon ? <ActivityIndicator color={colors.white} /> : <Text style={styles.couponBtnText}>Apply</Text>}
              </TouchableOpacity>
            </View>
          )}
          {couponMsg && <Text style={[styles.couponMsg, { color: coupon ? colors.success : colors.error }]}>{couponMsg}</Text>}
        </View>

        {/* Tip the rider */}
        <View style={styles.card}>
          <Text style={styles.billTitle}>💚 Tip your delivery partner</Text>
          <Text style={styles.tipSub}>100% of the tip goes to your rider.</Text>
          <View style={styles.tipRow}>
            {TIP_OPTIONS.map((t) => (
              <TouchableOpacity key={t} style={[styles.tipChip, tip === t && styles.tipChipActive]} onPress={() => setTip(t)}>
                <Text style={[styles.tipText, tip === t && styles.tipTextActive]}>{t === 0 ? 'No tip' : `₹${t}`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bill */}
        <View style={styles.card}>
          <Text style={styles.billTitle}>Bill details</Text>
          <BillRow label="Item total" value={`₹${fees.subtotal}`} />
          <BillRow label={`Delivery fee (${shopToCustomerKm.toFixed(1)} km)`} value={`₹${fees.deliveryFee}`} />
          {fees.rainFee > 0 && <BillRow label="🌧️ Rain fee" value={`₹${fees.rainFee}`} />}
          {fees.surgeFee > 0 && <BillRow label="Surge fee" value={`₹${fees.surgeFee}`} />}
          {discount > 0 && <BillRow label={`Coupon (${coupon?.code})`} value={`−₹${discount}`} green />}
          {tip > 0 && <BillRow label="Rider tip" value={`₹${tip}`} />}
          <View style={styles.divider} />
          <BillRow label="To pay" value={`₹${finalTotal}`} bold />
        </View>
      </ScrollView>

      {/* Checkout */}
      <View style={[styles.checkout, { paddingBottom: insets.bottom + 12 }]}>
        {!address && (
          <Text style={styles.needAddr}>Add a delivery address to place your order.</Text>
        )}
        {address && !addrServiceable && (
          <Text style={styles.needAddr}>This address is ~{addrCheck?.distanceKm} km away — outside our {SERVICE_RADIUS_KM} km delivery area.</Text>
        )}
        <TouchableOpacity
          disabled={!canOrder}
          style={[styles.payBtn, !canOrder && styles.payBtnDisabled]}
          onPress={() => placeOrder('upi')}
        >
          <Text style={styles.payBtnText}>Pay ₹{finalTotal} via UPI</Text>
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

function BillRow({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
      <Text style={[styles.billValue, bold && styles.billBold, green && { color: colors.success }]}>{value}</Text>
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
  couponRow: { flexDirection: 'row', gap: spacing.sm },
  couponInput: { flex: 1, backgroundColor: colors.bgSoft, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: colors.ink, borderWidth: 1, borderColor: colors.border },
  couponBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  couponBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  couponApplied: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md },
  couponCode: { fontWeight: '900', color: colors.primaryDark, fontSize: 14 },
  couponDesc: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  couponRemove: { color: colors.error, fontWeight: '800', fontSize: 13 },
  couponMsg: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  tipSub: { color: colors.inkMuted, fontSize: 12, marginTop: -4, marginBottom: 10 },
  tipRow: { flexDirection: 'row', gap: spacing.sm },
  tipChip: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tipChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tipText: { fontWeight: '800', color: colors.inkMuted, fontSize: 13 },
  tipTextActive: { color: colors.white },
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
