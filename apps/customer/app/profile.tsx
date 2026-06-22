import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { useStore } from '../lib/store';

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { name, phone, orderHistory, addresses, logout } = useStore();

  function onLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <Stack.Screen options={{ title: 'My Profile' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Profile header */}
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 30 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name || 'next Customer'}</Text>
            <Text style={styles.phone}>+91 {phone || '----------'}</Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{orderHistory.length}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{addresses.length}</Text>
            <Text style={styles.statLabel}>Addresses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ₹{orderHistory.reduce((s, o) => s + o.total, 0)}
            </Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>

        {/* Manage addresses */}
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/address')}>
          <Text style={styles.linkText}>📍 Manage delivery addresses</Text>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.linkRow, { marginTop: spacing.md }]} onPress={() => router.push('/favorites')}>
          <Text style={styles.linkText}>❤️ My favorites</Text>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.linkRow, { marginTop: spacing.md }]} onPress={() => router.push('/support')}>
          <Text style={styles.linkText}>🛟 Help & Support</Text>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        {/* Order history */}
        <Text style={styles.section}>Order history</Text>
        {orderHistory.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🧾</Text>
            <Text style={styles.emptyText}>No orders yet. Your past orders will appear here.</Text>
          </View>
        ) : (
          orderHistory.slice(0, 5).map((o) => (
            <View key={o.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <Text style={styles.orderId}>#{String(o.id).replace(/-/g, '').slice(0, 6).toUpperCase()}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{o.status}</Text>
                </View>
              </View>
              <View style={styles.itemList}>
                {(o.items ?? []).map((it, i) => (
                  <Text key={i} style={styles.itemLine} numberOfLines={1}>
                    <Text style={styles.itemQty}>{it.qty}× </Text>{it.name}
                  </Text>
                ))}
                {(!o.items || o.items.length === 0) && (
                  <Text style={styles.itemLine}>{o.itemCount} item{o.itemCount > 1 ? 's' : ''}</Text>
                )}
              </View>
              <View style={styles.orderBottom}>
                <Text style={styles.orderTime}>
                  {timeAgo(o.createdAt)} · {o.paymentMethod === 'upi' ? 'UPI' : 'COD'} · {o.addressLabel}
                </Text>
                <Text style={styles.orderTotal}>₹{o.total}</Text>
              </View>
            </View>
          ))
        )}

        {orderHistory.length > 5 && (
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push('/orders')}>
            <Text style={styles.seeAllText}>See all {orderHistory.length} orders →</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>next · v1.0 · Contai</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.ink, padding: spacing.xl, paddingTop: spacing.xl },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontSize: 20, fontWeight: '900' },
  phone: { color: colors.inkFaint, fontSize: 14, marginTop: 2 },

  stats: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },

  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  linkText: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  chev: { color: colors.inkFaint, fontSize: 22, fontWeight: '800' },

  section: { fontSize: 16, fontWeight: '800', color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  empty: { alignItems: 'center', padding: spacing.xl, gap: 10 },
  emptyText: { color: colors.inkMuted, textAlign: 'center', fontSize: 14 },

  orderCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '900', color: colors.ink, fontSize: 15 },
  statusBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { color: colors.primaryDark, fontWeight: '800', fontSize: 11 },
  orderMeta: { color: colors.inkMuted, fontSize: 13, marginTop: 6 },
  itemList: { marginTop: 10, gap: 3 },
  itemLine: { color: colors.inkMuted, fontSize: 13 },
  itemQty: { color: colors.primaryDark, fontWeight: '800' },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  orderTime: { color: colors.inkFaint, fontSize: 12 },
  orderTotal: { fontWeight: '900', color: colors.ink, fontSize: 16 },

  logoutBtn: { marginHorizontal: spacing.lg, marginTop: spacing.xl, borderWidth: 1.5, borderColor: colors.error, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },  logoutText: { color: colors.error, fontWeight: '800', fontSize: 15 },
  seeAllBtn: { marginHorizontal: spacing.lg, marginTop: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  seeAllText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
  version: { textAlign: 'center', color: colors.inkFaint, fontSize: 12, marginTop: spacing.lg },
});
