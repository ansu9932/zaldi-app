import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch, Linking, RefreshControl, Modal, Image, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors, radius, spacing } from '../lib/brand';
import { DEMO_MODE } from '../lib/supabase';
import { Job, fetchJobs, acceptJob, advanceJob, subscribeOrders, updateRiderLocation, updateRiderPresence, deliverOrder, fetchTodayStats, setRiderOnline, savePushToken, createRazorpayQr, getPaymentStatus } from '../lib/api';
import { useAuth } from '../lib/auth';
import { LoginScreen } from '../lib/LoginScreen';
import { registerForPush } from '../lib/push';

export default function RiderHome() {
  const session = useAuth((s) => s.session);
  if (!session) return <LoginScreen />;
  return <Dashboard />;
}

function Dashboard() {
  const insets = useSafeAreaInsets();
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const [online, setOnline] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [deliveries, setDeliveries] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrErr, setQrErr] = useState<string | null>(null);
  const [qrPaid, setQrPaid] = useState(false);
  const [otpModal, setOtpModal] = useState<{ open: boolean; paidOnline: boolean }>({ open: false, paidOnline: false });
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [riderLoc, setRiderLoc] = useState<{ lat: number; lng: number } | null>(null);

  const load = useCallback(async () => setJobs(await fetchJobs(session?.id, riderLoc)), [session?.id, riderLoc]);

  // Track the rider's own position (even when idle) so the nearest-rider router
  // can offer new orders to whoever is closest to the pickup store.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    async function start() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (cancelled) return;
      setRiderLoc({ lat: first.coords.latitude, lng: first.coords.longitude });
      if (online) updateRiderPresence(session?.id, first.coords.latitude, first.coords.longitude);
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 80 },
        (pos) => {
          setRiderLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (online) updateRiderPresence(session?.id, pos.coords.latitude, pos.coords.longitude);
        },
      );
    }
    start();
    return () => { cancelled = true; if (sub) sub.remove(); };
  }, [session?.id, online]);

  useEffect(() => {
    load();
    fetchTodayStats(session?.id).then((s) => { setEarnings(s.earnings); setDeliveries(s.deliveries); });
    registerForPush().then((token) => { if (token) savePushToken(session?.id, token); });
    const unsub = subscribeOrders(load);
    const poll = setInterval(load, 8000);
    return () => { unsub(); clearInterval(poll); };
  }, [load]);

  function toggleOnline(v: boolean) {
    setOnline(v);
    setRiderOnline(session?.id, v);
  }

  const current = jobs.find((j) => j.status === 'assigned' || j.status === 'picked_up') ?? null;
  const offers = jobs.filter((j) => j.status === 'ready');

  // Stream live GPS to the active order so the customer can track the rider.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    async function start() {
      if (!current) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 15 },
        (pos) => updateRiderLocation(current.id, pos.coords.latitude, pos.coords.longitude),
      );
    }
    start();
    return () => { if (sub) sub.remove(); };
  }, [current?.id]);

  function openMaps(lat: number | null, lng: number | null) {
    if (lat == null || lng == null) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {});
  }

  async function onAccept(id: string) {
    const res = await acceptJob(id, session?.id ?? '');
    if (!res.ok) Alert.alert('Already taken', 'Another rider just accepted this order.');
    load();
  }
  async function onAdvance(j: Job) {
    await advanceJob(j.id, j.status);
    load();
  }
  async function finishDelivery(j: Job, paidOnline: boolean) {
    // In demo there's no real OTP — complete immediately. In live mode, require
    // the customer's 4-digit delivery OTP as proof of handover.
    if (DEMO_MODE) {
      await deliverOrder(j.id, paidOnline);
      setEarnings((e) => e + j.payout);
      setDeliveries((d) => d + 1);
      setShowQR(false);
      load();
      return;
    }
    setShowQR(false);
    setOtpInput('');
    setOtpError(null);
    setOtpModal({ open: true, paidOnline });
  }

  async function confirmOtp() {
    if (!current) return;
    if (otpInput.trim().length < 4) { setOtpError('Enter the 4-digit code.'); return; }
    setVerifying(true);
    const res = await deliverOrder(current.id, otpModal.paidOnline, otpInput.trim());
    setVerifying(false);
    if (!res.ok) { setOtpError(res.error ?? 'Could not mark delivered.'); return; }
    setEarnings((e) => e + current.payout);
    setDeliveries((d) => d + 1);
    setOtpModal({ open: false, paidOnline: false });
    setOtpInput('');
    load();
  }

  async function openCollectQr() {
    if (!current) return;
    setShowQR(true);
    setQrUrl(null);
    setQrErr(null);
    setQrPaid(false);
    setQrLoading(true);
    const res = await createRazorpayQr(current.id);
    setQrLoading(false);
    if (res.imageUrl) setQrUrl(res.imageUrl);
    else setQrErr(res.error ?? 'Could not create the payment QR.');
  }

  // While the Razorpay QR is on screen, poll until the webhook marks the order paid.
  useEffect(() => {
    if (!showQR || !current || qrPaid) return;
    const t = setInterval(async () => {
      const st = await getPaymentStatus(current.id);
      if (st === 'paid') setQrPaid(true);
    }, 4000);
    return () => clearInterval(t);
  }, [showQR, current?.id, qrPaid]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.name}>Hi, {useAuth.getState().session?.name ?? 'Rider'} 👋</Text>
            <Text style={styles.sub}>next Rider · Contai {DEMO_MODE ? '· DEMO' : '· LIVE'}</Text>
          </View>
          <View style={styles.onlineBox}>
            <Text style={[styles.onlineText, { color: online ? colors.white : 'rgba(255,255,255,0.65)' }]}>{online ? 'Online' : 'Offline'}</Text>
            <Switch value={online} onValueChange={toggleOnline} trackColor={{ true: colors.ink, false: 'rgba(255,255,255,0.35)' }} thumbColor={colors.white} ios_backgroundColor="rgba(255,255,255,0.35)" />
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>₹{earnings}</Text><Text style={styles.statLabel}>Earnings today</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{deliveries}</Text><Text style={styles.statLabel}>Deliveries</Text></View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {current ? (
          <>
            <Text style={styles.section}>🛵 Active delivery</Text>
            <View style={styles.activeCard}>
              <Text style={styles.code}>{current.code}</Text>
              <Step active={current.status === 'assigned'} done={current.status === 'picked_up'} title="Pick up from store" sub={`${current.shopName} · ${current.shopAddress}`} onNav={() => openMaps(current.shopLat, current.shopLng)} />
              <Step active={current.status === 'picked_up'} done={false} title="Deliver to customer" sub={`${current.customer} · ${current.dropAddress}`} onNav={() => openMaps(current.dropLat, current.dropLng)} />
              {current.status === 'assigned' ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => onAdvance(current)}>
                  <Text style={styles.primaryBtnText}>Picked up order</Text>
                </TouchableOpacity>
              ) : current.paymentMethod === 'cod' && current.paymentStatus !== 'paid' ? (
                <>
                  <View style={styles.collectRow}>
                    <Text style={styles.collectLabel}>Collect</Text>
                    <Text style={styles.collectAmount}>₹{current.total}</Text>
                  </View>
                  <TouchableOpacity style={styles.upiBtn} onPress={openCollectQr}>
                    <Text style={styles.upiBtnText}>📲 Collect via UPI (Razorpay QR)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cashBtn} onPress={() => finishDelivery(current, false)}>
                    <Text style={styles.cashBtnText}>💵 Cash received · Mark delivered</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => finishDelivery(current, false)}>
                  <Text style={styles.primaryBtnText}>Mark as delivered (paid)</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.section}>📦 New job offers</Text>
            {offers.length === 0 && <Text style={styles.empty}>No jobs right now. When a merchant marks an order ready, it appears here.</Text>}
            {offers.map((j) => (
              <View key={j.id} style={[styles.card, j.preferredForMe && styles.cardPreferred]}>
                {j.preferredForMe && (
                  <View style={styles.preferredBanner}>
                    <Text style={styles.preferredText}>🎯 Nearest to you · reserved first</Text>
                  </View>
                )}
                <View style={styles.cardTop}>
                  <Text style={styles.code}>{j.code}</Text>
                  <View style={styles.payoutPill}>
                    <Text style={styles.payoutText}>Earn ₹{j.payout}</Text>
                  </View>
                </View>
                <Text style={styles.route}>📍 {j.customer}</Text>
                <Text style={styles.routeSub}>{j.dropAddress}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{j.distanceKm} km</Text>
                  <Text style={styles.meta}>·</Text>
                  <Text style={styles.meta}>{j.items} items</Text>
                  <Text style={styles.meta}>·</Text>
                  <Text style={styles.meta}>₹{j.total}</Text>
                </View>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(j.id)}>
                  <Text style={styles.acceptText}>Accept · ₹{j.payout}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Razorpay UPI QR collection modal */}
      <Modal visible={showQR} transparent animationType="slide" onRequestClose={() => setShowQR(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Collect ₹{current?.total}</Text>
            <Text style={styles.modalSub}>Razorpay UPI QR · customer scans to pay the exact amount</Text>
            <View style={styles.qrBox}>
              {qrLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : qrErr ? (
                <Text style={styles.qrWarn}>{qrErr}</Text>
              ) : qrUrl ? (
                <Image source={{ uri: qrUrl }} style={{ width: 220, height: 220 }} />
              ) : null}
            </View>
            {qrPaid ? (
              <>
                <Text style={styles.paidNote}>✅ Payment received via Razorpay</Text>
                {current && (
                  <TouchableOpacity style={styles.paidBtn} onPress={() => { setShowQR(false); finishDelivery(current, true); }}>
                    <Text style={styles.paidBtnText}>Continue to delivery · enter OTP</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              !qrLoading && !qrErr && <Text style={styles.waitingNote}>Waiting for payment… this confirms automatically.</Text>
            )}
            {!qrPaid && current && (
              <TouchableOpacity onPress={() => { setShowQR(false); finishDelivery(current, true); }}>
                <Text style={styles.manualLink}>Customer paid but not detected? Continue manually →</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowQR(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delivery OTP confirmation modal */}
      <Modal visible={otpModal.open} transparent animationType="slide" onRequestClose={() => setOtpModal({ open: false, paidOnline: false })}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm delivery</Text>
            <Text style={styles.modalSub}>Ask {current?.customer ?? 'the customer'} for the 4-digit OTP shown on their tracking screen.</Text>
            <TextInput
              style={styles.otpInput}
              value={otpInput}
              onChangeText={(t) => { setOtpInput(t.replace(/[^0-9]/g, '').slice(0, 4)); setOtpError(null); }}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="––––"
              placeholderTextColor={colors.inkFaint}
              textAlign="center"
            />
            {otpError && <Text style={styles.otpErr}>{otpError}</Text>}
            <TouchableOpacity style={styles.paidBtn} onPress={confirmOtp} disabled={verifying}>
              <Text style={styles.paidBtnText}>{verifying ? 'Verifying…' : '✅ Verify & mark delivered'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOtpModal({ open: false, paidOnline: false })}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Step({ title, sub, done, active, onNav }: { title: string; sub: string; done: boolean; active: boolean; onNav: () => void }) {
  return (
    <View style={styles.step}>
      <View style={[styles.dot, { backgroundColor: done ? colors.success : active ? colors.primary : colors.border }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.stepTitle, { color: active ? colors.ink : colors.inkMuted }]}>{title}</Text>
        <Text style={styles.stepSub}>{sub}</Text>
      </View>
      {active && (
        <TouchableOpacity style={styles.navBtn} onPress={onNav}>
          <Text style={styles.navText}>Navigate</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.white, fontSize: 18, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  onlineBox: { alignItems: 'center' },
  onlineText: { fontWeight: '800', fontSize: 12, marginBottom: 2 },
  logoutBtn: { marginTop: 6 },
  logoutText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 11 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  section: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  empty: { color: colors.inkMuted, fontStyle: 'italic' },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardPreferred: { borderColor: colors.primary, borderWidth: 2 },
  preferredBanner: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 10, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  preferredText: { color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  payout: { fontWeight: '900', color: colors.success, fontSize: 18 },
  payoutPill: { backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  payoutText: { color: colors.primaryDark, fontWeight: '900', fontSize: 14 },
  route: { fontWeight: '800', color: colors.ink, fontSize: 15, marginTop: 10 },
  routeSub: { color: colors.inkFaint, fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md, backgroundColor: colors.bgSoft, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  meta: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  acceptBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  acceptText: { color: colors.white, fontWeight: '900', fontSize: 15 },
  activeCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7 },
  stepTitle: { fontWeight: '700', fontSize: 14 },
  stepSub: { color: colors.inkFaint, fontSize: 12, marginTop: 1 },
  navBtn: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  navText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  primaryBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnText: { color: colors.white, fontWeight: '900', fontSize: 15 },
  collectRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
  collectLabel: { color: colors.inkMuted, fontWeight: '700', fontSize: 14 },
  collectAmount: { color: colors.ink, fontWeight: '900', fontSize: 26 },
  upiBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.md },
  upiBtnText: { color: colors.white, fontWeight: '900', fontSize: 15 },
  cashBtn: { backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.sm },
  cashBtnText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xl, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: colors.ink },
  modalSub: { color: colors.inkMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
  qrBox: { padding: spacing.lg, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  qrWarn: { color: colors.error, textAlign: 'center', fontSize: 13, paddingHorizontal: 20 },
  vpaText: { color: colors.inkMuted, fontWeight: '700', marginTop: spacing.md },
  paidNote: { color: colors.success, fontWeight: '900', fontSize: 16, marginTop: spacing.lg },
  waitingNote: { color: colors.inkMuted, fontSize: 13, fontWeight: '600', marginTop: spacing.lg, textAlign: 'center' },
  manualLink: { color: colors.inkFaint, fontSize: 12, fontWeight: '700', marginTop: spacing.md, textAlign: 'center', textDecorationLine: 'underline' },
  paidBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg, width: '100%' },
  paidBtnText: { color: colors.white, fontWeight: '900', fontSize: 15 },
  closeBtn: { paddingVertical: 14, marginTop: 4 },
  closeText: { color: colors.inkMuted, fontWeight: '700' },
  otpInput: { fontSize: 36, fontWeight: '900', letterSpacing: 16, color: colors.ink, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, width: '100%', marginTop: spacing.lg },
  otpErr: { color: colors.error, fontWeight: '700', fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});
