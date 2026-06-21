import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../lib/brand';
import { useRider, Job } from '../lib/store';

export default function RiderHome() {
  const insets = useSafeAreaInsets();
  const {
    online, toggleOnline, earningsToday, deliveriesToday,
    jobs, current, acceptJob, declineJob, advance,
  } = useRider();

  function openMaps(lat: number, lng: number, label: string) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.name}>Hi, Biswajit 👋</Text>
            <Text style={styles.sub}>next Rider · Contai</Text>
          </View>
          <View style={styles.onlineBox}>
            <Text style={[styles.onlineText, { color: online ? colors.accent : '#C7D2FE' }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={online}
              onValueChange={toggleOnline}
              trackColor={{ true: colors.accent, false: colors.primaryDark }}
              thumbColor={colors.white}
            />
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>₹{earningsToday}</Text>
            <Text style={styles.statLabel}>Earnings today</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{deliveriesToday}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {/* Current job */}
        {current && (
          <>
            <Text style={styles.section}>🛵 Active delivery</Text>
            <View style={styles.activeCard}>
              <Text style={styles.code}>{current.code}</Text>
              <Step
                done={current.stage !== 'to_shop'}
                active={current.stage === 'to_shop'}
                title="Pick up from shop"
                sub={`${current.shop} · ${current.shopAddress}`}
                onNav={() => openMaps(current.shopLat, current.shopLng, current.shop)}
              />
              <Step
                done={false}
                active={current.stage === 'picked_up'}
                title="Deliver to customer"
                sub={`${current.customer} · ${current.dropAddress}`}
                onNav={() => openMaps(current.dropLat, current.dropLng, current.customer)}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={advance}>
                <Text style={styles.primaryBtnText}>
                  {current.stage === 'to_shop' ? 'Picked up order' : 'Mark as delivered'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Job offers */}
        {!current && (
          <>
            <Text style={styles.section}>📦 New job offers</Text>
            {jobs.length === 0 && <Text style={styles.empty}>No jobs right now. Stay online!</Text>}
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} onAccept={() => acceptJob(j.id)} onDecline={() => declineJob(j.id)} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Step({
  title, sub, done, active, onNav,
}: { title: string; sub: string; done: boolean; active: boolean; onNav: () => void }) {
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

function JobCard({ job, onAccept, onDecline }: { job: Job; onAccept: () => void; onDecline: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.code}>{job.code}</Text>
        <Text style={styles.payout}>₹{job.payout}</Text>
      </View>
      <Text style={styles.route}>🏪 {job.shop}</Text>
      <Text style={styles.routeSub}>{job.shopAddress}</Text>
      <Text style={[styles.route, { marginTop: 8 }]}>📍 {job.customer}</Text>
      <Text style={styles.routeSub}>{job.dropAddress}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{job.distanceKm} km</Text>
        <Text style={styles.meta}>·</Text>
        <Text style={styles.meta}>{job.items} items</Text>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptText}>Accept · ₹{job.payout}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.white, fontSize: 18, fontWeight: '900' },
  sub: { color: '#C7D2FE', fontSize: 12, marginTop: 2 },
  onlineBox: { alignItems: 'center' },
  onlineText: { fontWeight: '800', fontSize: 12, marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.primaryDark, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#C7D2FE', fontSize: 12, marginTop: 2 },

  section: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  empty: { color: colors.inkMuted, fontStyle: 'italic' },

  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  payout: { fontWeight: '900', color: colors.success, fontSize: 18 },
  route: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  routeSub: { color: colors.inkFaint, fontSize: 12, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  meta: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  declineText: { color: colors.inkMuted, fontWeight: '700' },
  acceptBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  acceptText: { color: colors.white, fontWeight: '800' },

  activeCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7 },
  stepTitle: { fontWeight: '700', fontSize: 14 },
  stepSub: { color: colors.inkFaint, fontSize: 12, marginTop: 1 },
  navBtn: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  navText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnText: { color: colors.ink, fontWeight: '900', fontSize: 15 },
});
