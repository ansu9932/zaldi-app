import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../lib/brand';
import { DEMO_MODE } from '../lib/supabase';
import { Order, fetchActiveOrders, setStatus, subscribeOrders } from '../lib/api';

const STATUS_LABEL: Record<string, string> = {
  placed: 'NEW', accepted: 'PREPARING', ready: 'READY · finding rider',
  assigned: 'RIDER ASSIGNED', picked_up: 'PICKED UP', delivered: 'DELIVERED',
};
const STATUS_COLOR: Record<string, string> = {
  placed: colors.warning, accepted: colors.primary, ready: colors.success,
  assigned: colors.accent, picked_up: colors.accent, delivered: colors.inkFaint,
};

export default function MerchantHome() {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const data = await fetchActiveOrders();
    setOrders(data);
  }, []);

  useEffect(() => {
    load();
    const unsub = subscribeOrders(load);
    const poll = setInterval(load, 8000); // safety refresh
    const tick = setInterval(() => setNow(Date.now()), 1000); // countdown
    return () => { unsub(); clearInterval(poll); clearInterval(tick); };
  }, [load]);

  async function accept(id: string) { await setStatus(id, 'accepted'); load(); }
  async function markReady(id: string) { await setStatus(id, 'ready'); load(); }
  async function cancel(id: string) { await setStatus(id, 'cancelled'); load(); }

  function fmt(sec: number) { return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }

  const newOrders = orders.filter((o) => o.status === 'placed');
  const active = orders.filter((o) => ['accepted', 'ready', 'assigned', 'picked_up'].includes(o.status));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.shop}>Kanthi Fresh Mart</Text>
            <Text style={styles.sub}>next Merchant · Contai {DEMO_MODE ? '· DEMO' : '· LIVE'}</Text>
          </View>
          <View style={styles.onlineBox}>
            <Text style={[styles.onlineText, { color: online ? colors.primary : colors.inkFaint }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
            <Switch value={online} onValueChange={setOnline} trackColor={{ true: colors.primary, false: colors.inkFaint }} thumbColor={colors.white} />
          </View>
        </View>
        <View style={styles.statsRow}>
          <Stat label="New" value={newOrders.length} />
          <Stat label="Preparing" value={orders.filter((o) => o.status === 'accepted').length} />
          <Stat label="Ready" value={orders.filter((o) => o.status === 'ready').length} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <Text style={styles.section}>🔔 New orders</Text>
        {newOrders.length === 0 && <Empty text="No new orders right now. Place one from the Customer app!" />}
        {newOrders.map((o) => {
          const remain = Math.max(0, 120 - Math.floor((now - new Date(o.created_at).getTime()) / 1000));
          return (
            <OrderCard key={o.id} order={o}>
              <Text style={remain > 0 ? styles.timer : styles.timerOver}>
                {remain > 0 ? `⏱ Please respond within ${fmt(remain)}` : '⏰ Overdue — accept or cancel'}
              </Text>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(o.id)}>
                <Text style={styles.acceptText}>Accept order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(o.id)}>
                <Text style={styles.cancelText}>Cancel order</Text>
              </TouchableOpacity>
            </OrderCard>
          );
        })}

        <Text style={[styles.section, { marginTop: spacing.xl }]}>👨‍🍳 In progress</Text>
        {active.length === 0 && <Empty text="No active orders." />}
        {active.map((o) => (
          <OrderCard key={o.id} order={o}>
            {o.status === 'accepted' && (
              <>
                <TouchableOpacity style={styles.readyBtn} onPress={() => markReady(o.id)}>
                  <Text style={styles.readyText}>Mark items ready</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(o.id)}>
                  <Text style={styles.cancelText}>Cancel order</Text>
                </TouchableOpacity>
              </>
            )}
            {o.status === 'ready' && <Text style={styles.waitText}>✅ Ready — finding a rider…</Text>}
            {(o.status === 'assigned' || o.status === 'picked_up') && <Text style={styles.waitText}>🛵 Rider handling delivery</Text>}
          </OrderCard>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Empty({ text }: { text: string }) { return <Text style={styles.empty}>{text}</Text>; }

function OrderCard({ order, children }: { order: Order; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.code}>{order.code}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[order.status] }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[order.status] ?? order.status}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{order.customer} · {order.area}</Text>
      <View style={styles.items}>
        {order.items.map((it, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemQty}>{it.qty}×</Text>
            <Text style={styles.itemName}>{it.name}</Text>
            <Text style={styles.itemPrice}>₹{it.price * it.qty}</Text>
          </View>
        ))}
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Order total</Text>
        <Text style={styles.totalValue}>₹{order.total}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.ink, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shop: { color: colors.white, fontSize: 18, fontWeight: '900' },
  sub: { color: colors.inkFaint, fontSize: 12, marginTop: 2 },
  onlineBox: { alignItems: 'center' },
  onlineText: { fontWeight: '800', fontSize: 12, marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  stat: { flex: 1, backgroundColor: '#1E293B', borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { color: colors.white, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.inkFaint, fontSize: 12, marginTop: 2 },
  section: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  empty: { color: colors.inkMuted, fontStyle: 'italic', marginBottom: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  meta: { color: colors.inkMuted, fontSize: 13, marginTop: 6 },
  items: { marginTop: spacing.md, gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemQty: { fontWeight: '800', color: colors.primary, width: 28 },
  itemName: { flex: 1, color: colors.ink, fontSize: 14 },
  itemPrice: { color: colors.inkMuted, fontSize: 14, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { color: colors.inkMuted, fontWeight: '600' },
  totalValue: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  acceptBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  acceptText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  readyBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  readyText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  waitText: { color: colors.success, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  timer: { color: colors.warning, fontWeight: '800', fontSize: 13, marginTop: spacing.md, textAlign: 'center' },
  timerOver: { color: colors.error, fontWeight: '800', fontSize: 13, marginTop: spacing.md, textAlign: 'center' },
  cancelBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm },
  cancelText: { color: colors.error, fontWeight: '800', fontSize: 14 },
});
