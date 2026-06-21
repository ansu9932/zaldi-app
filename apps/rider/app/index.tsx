import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch, Linking, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../lib/brand';
import { DEMO_MODE } from '../lib/supabase';
import { Job, fetchJobs, acceptJob, advanceJob, subscribeOrders } from '../lib/api';

export default function RiderHome() {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [deliveries, setDeliveries] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => setJobs(await fetchJobs()), []);

  useEffect(() => {
    load();
    const unsub = subscribeOrders(load);
    const poll = setInterval(load, 8000);
    return () => { unsub(); clearInterval(poll); };
  }, [load]);

  const current = jobs.find((j) => j.status === 'assigned' || j.status === 'picked_up') ?? null;
  const offers = jobs.filter((j) => j.status === 'ready');

  function openMaps(lat: number | null, lng: number | null) {
    if (lat == null || lng == null) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {});
  }

  async function onAccept(id: string) { await acceptJob(id); load(); }
  async function onAdvance(j: Job) {
    await advanceJob(j.id, j.status);
    if (j.status === 'picked_up') {
      setEarnings((e) => e + j.payout);
      setDeliveries((d) => d + 1);
    }
    load();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.name}>Hi, Biswajit 👋</Text>
            <Text style={styles.sub}>next Rider · Contai {DEMO_MODE ? '· DEMO' : '· LIVE'}</Text>
          </View>
          <View style={styles.onlineBox}>
            <Text style={[styles.onlineText, { color: online ? colors.primary : '#94A3B8' }]}>{online ? 'Online' : 'Offline'}</Text>
            <Switch value={online} onValueChange={setOnline} trackColor={{ true: colors.primary, false: colors.inkMuted }} thumbColor={colors.white} />
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
              <Step active={current.status === 'assigned'} done={current.status === 'picked_up'} title="Pick up from store" sub="Kanthi Fresh Mart, Central Market" onNav={() => openMaps(21.779, 87.752)} />
              <Step active={current.status === 'picked_up'} done={false} title="Deliver to customer" sub={`${current.customer} · ${current.dropAddress}`} onNav={() => openMaps(current.dropLat, current.dropLng)} />
              <TouchableOpacity style={styles.primaryBtn} onPress={() => onAdvance(current)}>
                <Text style={styles.primaryBtnText}>{current.status === 'assigned' ? 'Picked up order' : 'Mark as delivered'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.section}>📦 New job offers</Text>
            {offers.length === 0 && <Text style={styles.empty}>No jobs right now. When a merchant marks an order ready, it appears here.</Text>}
            {offers.map((j) => (
              <View key={j.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.code}>{j.code}</Text>
                  <Text style={styles.payout}>₹{j.payout}</Text>
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
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  section: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  empty: { color: colors.inkMuted, fontStyle: 'italic' },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  payout: { fontWeight: '900', color: colors.success, fontSize: 18 },
  route: { fontWeight: '700', color: colors.ink, fontSize: 14, marginTop: 6 },
  routeSub: { color: colors.inkFaint, fontSize: 12, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  meta: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' },
  acceptBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
  acceptText: { color: colors.white, fontWeight: '800' },
  activeCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7 },
  stepTitle: { fontWeight: '700', fontSize: 14 },
  stepSub: { color: colors.inkFaint, fontSize: 12, marginTop: 1 },
  navBtn: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  navText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  primaryBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnText: { color: colors.white, fontWeight: '900', fontSize: 15 },
});
