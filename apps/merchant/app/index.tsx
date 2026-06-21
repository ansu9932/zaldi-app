import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../lib/brand';
import { useMerchant, Order, OrderStatus } from '../lib/store';

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'NEW',
  accepted: 'PREPARING',
  ready: 'READY · waiting for rider',
  assigned: 'RIDER ON THE WAY',
};
const STATUS_COLOR: Record<OrderStatus, string> = {
  placed: colors.warning,
  accepted: colors.primary,
  ready: colors.success,
  assigned: colors.accentDark,
};

export default function MerchantHome() {
  const insets = useSafeAreaInsets();
  const { online, toggleOnline, orders, accept, markReady } = useMerchant();

  const newOrders = orders.filter((o) => o.status === 'placed');
  const active = orders.filter((o) => o.status === 'accepted' || o.status === 'ready' || o.status === 'assigned');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.shop}>Kanthi Fresh Mart</Text>
            <Text style={styles.sub}>next Merchant · Contai</Text>
          </View>
          <View style={styles.onlineBox}>
            <Text style={[styles.onlineText, { color: online ? colors.accent : colors.inkFaint }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={online}
              onValueChange={toggleOnline}
              trackColor={{ true: colors.accent, false: colors.inkFaint }}
              thumbColor={colors.white}
            />
          </View>
        </View>
        <View style={styles.statsRow}>
          <Stat label="New" value={newOrders.length} />
          <Stat label="Preparing" value={orders.filter((o) => o.status === 'accepted').length} />
          <Stat label="Ready" value={orders.filter((o) => o.status === 'ready').length} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={styles.section}>🔔 New orders</Text>
        {newOrders.length === 0 && <Empty text="No new orders right now." />}
        {newOrders.map((o) => (
          <OrderCard key={o.id} order={o}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(o.id)}>
              <Text style={styles.acceptText}>Accept order</Text>
            </TouchableOpacity>
          </OrderCard>
        ))}

        <Text style={[styles.section, { marginTop: spacing.xl }]}>👨‍🍳 In progress</Text>
        {active.length === 0 && <Empty text="No active orders." />}
        {active.map((o) => (
          <OrderCard key={o.id} order={o}>
            {o.status === 'accepted' && (
              <TouchableOpacity style={styles.readyBtn} onPress={() => markReady(o.id)}>
                <Text style={styles.readyText}>Mark items ready</Text>
              </TouchableOpacity>
            )}
            {o.status === 'ready' && (
              <Text style={styles.waitText}>✅ Ready — finding a rider…</Text>
            )}
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

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

function OrderCard({ order, children }: { order: Order; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.code}>{order.code}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[order.status] }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[order.status]}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {order.customer} · {order.area} · {order.placedAgoMin} min ago
      </Text>
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
  header: {
    backgroundColor: colors.ink, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
  },
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

  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
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
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { color: colors.inkMuted, fontWeight: '600' },
  totalValue: { color: colors.ink, fontWeight: '900', fontSize: 16 },

  acceptBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  acceptText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  readyBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  readyText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  waitText: { color: colors.success, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
});
