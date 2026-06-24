import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, Stack } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { useStore, PastOrder } from '../lib/store';
import { getOrdersStatus } from '../lib/api';

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

// Friendly label + colour for each backend status.
function statusInfo(status: string): { label: string; bg: string; fg: string } {
  switch (status) {
    case 'delivered':
      return { label: '🎉 Delivered', bg: '#ECFDF5', fg: colors.success };
    case 'cancelled':
      return { label: '❌ Cancelled', bg: '#FEF2F2', fg: colors.error };
    case 'picked_up':
      return { label: '🛵 On the way', bg: '#EFF6FF', fg: colors.accent };
    case 'assigned':
      return { label: '🛵 Rider assigned', bg: '#EFF6FF', fg: colors.accent };
    case 'ready':
      return { label: '📦 Ready · finding rider', bg: '#FFF7ED', fg: '#C2410C' };
    case 'accepted':
      return { label: '👨‍🍳 Preparing', bg: '#FFF7ED', fg: '#C2410C' };
    case 'pending_payment':
      return { label: '⏳ Awaiting payment', bg: '#FFF7ED', fg: '#C2410C' };
    default:
      return { label: '🧾 Placed', bg: colors.primaryLight, fg: colors.primaryDark };
  }
}

export default function Orders() {
  const orderHistory = useStore((s) => s.orderHistory);
  const setCart = useStore((s) => s.setCart);
  const updateOrderStatuses = useStore((s) => s.updateOrderStatuses);
  const [refreshing, setRefreshing] = useState(false);

  // Pull the latest real status for every order so the list always shows the
  // true state (delivered / cancelled / on the way) instead of "placed".
  const refresh = useCallback(async () => {
    const ids = orderHistory.map((o) => o.id);
    if (ids.length === 0) return;
    const statuses = await getOrdersStatus(ids);
    if (Object.keys(statuses).length) updateOrderStatuses(statuses);
  }, [orderHistory, updateOrderStatuses]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reorder(o: PastOrder) {
    if (!o.reorder || o.reorder.length === 0) {
      Alert.alert('Cannot reorder', 'This order is too old to reorder automatically. Please add the items again.');
      return;
    }
    setCart(o.reorder);
    router.push('/cart');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <Stack.Screen options={{ title: 'Order history' }} />
      <FlatList
        data={orderHistory}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.empty}>No orders yet</Text>
            <Text style={styles.emptySub}>Your past orders will show up here.</Text>
          </View>
        }
        renderItem={({ item: o }) => {
          const s = statusInfo(o.status);
          return (
            <View style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.id}>#{String(o.id).replace(/-/g, '').slice(0, 6).toUpperCase()}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
                </View>
              </View>
              <View style={styles.items}>
                {(o.items ?? []).slice(0, 4).map((it, i) => (
                  <Text key={i} style={styles.itemLine} numberOfLines={1}>
                    <Text style={styles.qty}>{it.qty}× </Text>{it.name}
                  </Text>
                ))}
                {(o.items?.length ?? 0) > 4 && (
                  <Text style={styles.itemMore}>+{(o.items?.length ?? 0) - 4} more</Text>
                )}
                {(!o.items || o.items.length === 0) && (
                  <Text style={styles.itemLine}>{o.itemCount} item{o.itemCount > 1 ? 's' : ''}</Text>
                )}
              </View>
              <View style={styles.bottom}>
                <Text style={styles.time} numberOfLines={1}>
                  {timeAgo(o.createdAt)} · {o.paymentMethod === 'upi' ? 'UPI' : 'COD'} · {o.addressLabel}
                </Text>
                <Text style={styles.total}>₹{o.total}</Text>
              </View>
              <View style={styles.actions}>
                {o.status !== 'delivered' && o.status !== 'cancelled' && (
                  <TouchableOpacity style={styles.trackBtn} onPress={() => router.push('/track')}>
                    <Text style={styles.trackText}>📍 Track order</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.reorderBtn} onPress={() => reorder(o)}>
                  <Text style={styles.reorderText}>🔁 Reorder</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  empty: { textAlign: 'center', color: colors.ink, fontWeight: '800', fontSize: 16 },
  emptySub: { textAlign: 'center', color: colors.inkMuted, marginTop: 4, fontSize: 13 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { fontWeight: '900', color: colors.ink, fontSize: 15 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  badgeText: { fontWeight: '800', fontSize: 11 },
  items: { marginTop: 10, gap: 3 },
  itemLine: { color: colors.inkMuted, fontSize: 13 },
  itemMore: { color: colors.inkFaint, fontSize: 12, fontWeight: '700' },
  qty: { color: colors.primaryDark, fontWeight: '800' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 },
  time: { color: colors.inkFaint, fontSize: 12, flex: 1 },
  total: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  trackBtn: { flex: 1, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  trackText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  reorderBtn: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  reorderText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
});
