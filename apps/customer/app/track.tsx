import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  ScrollView,
  Alert,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { useStore } from '../lib/store';
import { DEMO_MODE } from '../lib/supabase';
import { getOrder, subscribeOrder, OrderStatusRow, cancelOrder, getOrderRider, rateOrder, RiderInfo } from '../lib/api';
import { distanceKm } from '../lib/algorithms';
import { RouteMap } from '../lib/RouteMap';

const STEPS = [
  { key: 'confirmed', label: 'Order confirmed', icon: '✅' },
  { key: 'preparing', label: 'Preparing your order', icon: '👨‍🍳' },
  { key: 'ready', label: 'Packed · finding a rider', icon: '📦' },
  { key: 'onway', label: 'On the way to you', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
];

function statusToStep(status: string): number {
  switch (status) {
    case 'placed': return 0;
    case 'accepted': return 1;
    case 'ready': return 2;
    case 'assigned': return 3;
    case 'picked_up': return 3;
    case 'delivered': return 4;
    default: return 0;
  }
}

// Shown only in DEMO mode (no real rider exists). Live mode fetches the real rider.
const DEMO_RIDER: RiderInfo & { vehicle: string; rating: string } = {
  name: 'Rahul (demo rider)', vehicle: 'WB-30 · Scooter', rating: '4.8', phone: null,
};

/** Small looping bike animation (Blinkit/Zepto style) shown while the order is in progress. */
function BikeBar() {
  const x = useRef(new Animated.Value(0)).current;
  const LANE = width - spacing.xl * 2 - spacing.lg * 2;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [-6, Math.max(40, LANE)] });
  return (
    <View style={styles.lane}>
      <View style={styles.laneLine} />
      <Animated.Text style={[styles.laneBike, { transform: [{ translateX: tx }] }]}>🛵</Animated.Text>
    </View>
  );
}

const { width } = Dimensions.get('window');
const PANEL_W = width - spacing.lg * 2;
const PANEL_H = 280;
const SHOP = { x: 28, y: 40 };
const HOME = { x: PANEL_W - 70, y: PANEL_H - 90 };

export default function Track() {
  const insets = useSafeAreaInsets();
  const { lastOrder } = useStore();
  const setLastOrderStatus = useStore((s) => s.setLastOrderStatus);
  const clearLastOrder = useStore((s) => s.clearLastOrder);
  const markRated = useStore((s) => s.markRated);
  const [step, setStep] = useState(0);
  const [riderDist, setRiderDist] = useState<number | null>(null);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [riderInfo, setRiderInfo] = useState<RiderInfo | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const t = useRef(new Animated.Value(0)).current;
  const animatedOnce = useRef(false);

  // ----- progress: real status when live, simulated when demo -----
  useEffect(() => {
    if (DEMO_MODE || !lastOrder?.id) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      timers.push(setTimeout(() => setStep(1), 2500));
      timers.push(setTimeout(() => setStep(2), 5500));
      timers.push(setTimeout(() => setStep(3), 8000));
      timers.push(setTimeout(() => setStep(4), 20000));
      return () => timers.forEach(clearTimeout);
    }
    let mounted = true;
    const applyRow = (row: OrderStatusRow) => {
      if (!mounted) return;
      setStep(statusToStep(row.status));
      setLastOrderStatus(row.status);
      if (row.status === 'cancelled') setCancelled(true);
      if ((row.status === 'assigned' || row.status === 'picked_up') && lastOrder) {
        getOrderRider(lastOrder.id).then((r) => { if (mounted && r) setRiderInfo(r); });
      }
      if (row.rider_lat != null && row.rider_lng != null && lastOrder) {
        const rider = { lat: row.rider_lat, lng: row.rider_lng };
        setRiderPos(rider);
        const home = { lat: lastOrder.address.lat, lng: lastOrder.address.lng };
        const dRemain = distanceKm(rider, home);
        setRiderDist(dRemain);
        const total = distanceKm(lastOrder.shop, home) || 1;
        const prog = Math.max(0, Math.min(1, 1 - dRemain / total));
        Animated.timing(t, { toValue: prog, duration: 1500, useNativeDriver: true }).start();
      }
    };
    getOrder(lastOrder.id).then((o) => o && applyRow(o));
    const unsub = subscribeOrder(lastOrder.id, applyRow);
    const poll = setInterval(() => getOrder(lastOrder.id).then((o) => o && applyRow(o)), 6000);
    return () => { mounted = false; unsub(); clearInterval(poll); };
  }, []);

  function onCancel() {
    if (!lastOrder?.id) return;
    Alert.alert('Cancel this order?', 'You can cancel only before the store accepts it. Any online payment will be refunded.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          const res = await cancelOrder(lastOrder.id);
          setCancelling(false);
          if (res.ok) { setCancelled(true); setLastOrderStatus('cancelled'); }
          else Alert.alert('Cannot cancel', 'The store has already accepted this order, so it can no longer be cancelled. Please contact support.');
        },
      },
    ]);
  }

  async function submitRating(stars: number) {
    if (!lastOrder?.id) return;
    setRating(stars);
    await rateOrder(lastOrder.id, stars);
    markRated(lastOrder.id);
    setRatingDone(true);
  }

  const rider = DEMO_MODE ? DEMO_RIDER : riderInfo;

  // animate rider marker once we reach "on the way" (DEMO only; live uses real GPS)
  useEffect(() => {
    if (DEMO_MODE && step >= 3 && !animatedOnce.current) {
      animatedOnce.current = true;
      Animated.timing(t, { toValue: 1, duration: 10000, useNativeDriver: true }).start();
    }
  }, [step]);

  const riderLeft = t.interpolate({ inputRange: [0, 1], outputRange: [SHOP.x, HOME.x] });
  const riderTop = t.interpolate({ inputRange: [0, 1], outputRange: [SHOP.y, HOME.y] });
  const delivered = step >= 4;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <Stack.Screen options={{ title: 'Track order', headerShown: !delivered && !cancelled }} />

      {cancelled ? (
        <View style={[styles.doneWrap, { paddingTop: insets.top + 40 }]}>
          <View style={[styles.doneCircle, { backgroundColor: '#FEE2E2' }]}><Text style={{ fontSize: 56 }}>❌</Text></View>
          <Text style={styles.doneTitle}>Order cancelled</Text>
          <Text style={styles.doneSub}>Sorry, the store could not accept this order. Any online payment will be refunded.</Text>
          <TouchableOpacity style={styles.homeBtn} onPress={() => { clearLastOrder(); router.replace('/home'); }}>
            <Text style={styles.homeBtnText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      ) : delivered ? (
        <ScrollView contentContainerStyle={[styles.doneWrap, { paddingTop: insets.top + 40, paddingBottom: 40 }]}>
          <View style={styles.doneCircle}><Text style={{ fontSize: 60 }}>🎉</Text></View>
          <Text style={styles.doneTitle}>Order delivered!</Text>
          <Text style={styles.doneSub}>Delivered by {rider?.name ?? 'your rider'}. Thank you for ordering on next!</Text>
          <View style={styles.doneCard}>
            <Text style={styles.doneRow}>Order total: ₹{lastOrder?.total ?? '--'}</Text>
            <Text style={styles.doneRow}>Paid via: {lastOrder?.paymentMethod === 'upi' ? 'UPI (Razorpay)' : 'Cash on Delivery'}</Text>
          </View>

          <View style={styles.rateCard}>
            <Text style={styles.rateTitle}>{ratingDone ? 'Thanks for your feedback! 🙏' : 'How was your delivery?'}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} disabled={ratingDone} onPress={() => submitRating(s)} hitSlop={6}>
                  <Text style={styles.star}>{s <= rating ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/home')}>
            <Text style={styles.homeBtnText}>Back to home</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          <View style={styles.etaCard}>
            <Text style={styles.etaLabel}>ARRIVING IN</Text>
            <Text style={styles.etaValue}>~{lastOrder?.eta ?? 25} min</Text>
            <Text style={styles.etaStatus}>{STEPS[step].icon} {STEPS[step].label}</Text>
            <BikeBar />
          </View>

          {lastOrder ? (
            <View style={{ marginBottom: spacing.lg }}>
              <RouteMap
                shop={lastOrder.shop}
                home={{ lat: lastOrder.address.lat, lng: lastOrder.address.lng }}
                rider={riderPos}
              />
            </View>
          ) : null}

          <View style={styles.riderCard}>
            <View style={styles.avatar}><Text style={{ fontSize: 26 }}>🧑‍✈️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>{step >= 3 ? (rider?.name ?? 'Your rider') : 'Assigning a rider…'}</Text>
              <Text style={styles.riderMeta}>
                {step >= 3
                  ? `${rider?.vehicle ? '🛵 ' + rider.vehicle : '🛵 Scooter'}${riderDist != null ? ' · ' + riderDist.toFixed(1) + ' km away' : ''}`
                  : 'We will assign the nearest rider'}
              </Text>
            </View>
            {step >= 3 && rider?.phone && (
              <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${rider.phone}`)}>
                <Text style={styles.callText}>📞 Call</Text>
              </TouchableOpacity>
            )}
          </View>

          {step === 0 && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={cancelling}>
              <Text style={styles.cancelText}>{cancelling ? 'Cancelling…' : 'Cancel order'}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.timeline}>
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <View key={s.key} style={styles.tlRow}>
                  <View style={[styles.tlDot, { backgroundColor: done ? colors.success : active ? colors.primary : colors.border }]}>
                    <Text style={{ fontSize: 12 }}>{done || active ? s.icon : ''}</Text>
                  </View>
                  <Text style={[styles.tlLabel, { color: active ? colors.ink : colors.inkMuted, fontWeight: active ? '800' : '600' }]}>{s.label}</Text>
                </View>
              );
            })}
          </View>

          {lastOrder?.address && (
            <View style={styles.addrCard}>
              <Text style={styles.addrTitle}>Delivering to</Text>
              <Text style={styles.addrName}>{lastOrder.address.label} · {lastOrder.address.name}</Text>
              <Text style={styles.addrLine}>{lastOrder.address.line}{lastOrder.address.landmark ? `, ${lastOrder.address.landmark}` : ''}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  etaCard: { backgroundColor: colors.ink, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg },
  etaLabel: { color: colors.inkFaint, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  etaValue: { color: colors.white, fontSize: 38, fontWeight: '900', marginVertical: 2 },
  etaStatus: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  lane: { width: '100%', height: 30, marginTop: 14, justifyContent: 'center' },
  laneLine: { position: 'absolute', left: 0, right: 0, top: 20, height: 0, borderTopWidth: 2, borderColor: 'rgba(255,255,255,0.18)', borderStyle: 'dashed' },
  laneBike: { fontSize: 24 },
  map: { width: PANEL_W, height: PANEL_H, backgroundColor: '#EAF2EC', borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.lg },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(15,23,42,0.05)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(15,23,42,0.05)' },
  routeDot: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, opacity: 0.5 },
  pin: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  pinEmoji: { fontSize: 20 },
  rider: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  mapBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  mapBadgeText: { fontSize: 11, fontWeight: '800', color: colors.success },
  riderCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center' },
  riderName: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  riderMeta: { color: colors.inkMuted, fontSize: 13, marginTop: 2 },
  callBtn: { backgroundColor: colors.primaryLight, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  callText: { color: colors.primaryDark, fontWeight: '800' },
  timeline: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: 14, marginBottom: spacing.lg },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tlDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tlLabel: { fontSize: 14 },
  addrCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  addrTitle: { fontSize: 12, fontWeight: '700', color: colors.inkFaint, marginBottom: 6 },
  addrName: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  addrLine: { color: colors.inkMuted, fontSize: 13, marginTop: 2 },
  doneWrap: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl },
  doneCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  doneTitle: { fontSize: 26, fontWeight: '900', color: colors.ink },
  doneSub: { color: colors.inkMuted, textAlign: 'center', marginTop: 8, fontSize: 14, lineHeight: 20 },
  doneCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl, width: '100%', gap: 6 },
  doneRow: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  homeBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: spacing.xl, width: '100%' },
  homeBtnText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  rateCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg, width: '100%', alignItems: 'center' },
  rateTitle: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  starsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  star: { fontSize: 30 },
  cancelBtn: { borderWidth: 1.5, borderColor: colors.error, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.lg },
  cancelText: { color: colors.error, fontWeight: '800', fontSize: 15 },
});
