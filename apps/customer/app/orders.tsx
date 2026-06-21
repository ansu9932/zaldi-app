import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { useStore, PastOrder } from '../lib/store';

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

export default function Orders() {
  const orderHistory = useStore((s) => s.orderHistory);
  const setCart = useStore((s) => s.setCart);

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
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
        renderItem={({ item: o }) => (
          <View style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.id}>#{String(o.id).replace(/-/g, '').slice(0, 6).toUpperCase()}</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{o.status}</Text></View>
            </View>
            <View style={styles.items}>
              {(o.items ?? []).map((it, i) => (
                <Text key={i} style={styles.itemLine} numberOfLines={1}>
                  <Text style={styles.qty}>{it.qty}× </Text>{it.name}
                </Text>
              ))}
              {(!o.items || o.items.length === 0) && (
                <Text style={styles.itemLine}>{o.itemCount} item{o.itemCount > 1 ? 's' : ''}</Text>
              )}
            </View>
            <View style={styles.bottom}>
              <Text style={styles.time}>{timeAgo(o.createdAt)} · {o.paymentMethod === 'upi' ? 'UPI' : 'COD'} · {o.addressLabel}</Text>
              <Text style={styles.total}>₹{o.total}</Text>
            </View>
            <TouchableOpacity style={styles.reorderBtn} onPress={() => reorder(o)}>
              <Text style={styles.reorderText}>🔁 Reorder</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { fontWeight: '900', color: colors.ink, fontSize: 15 },
  badge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.primaryDark, fontWeight: '800', fontSize: 11 },
  items: { marginTop: 10, gap: 3 },
  itemLine: { color: colors.inkMuted, fontSize: 13 },
  qty: { color: colors.primaryDark, fontWeight: '800' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  time: { color: colors.inkFaint, fontSize: 12, flex: 1 },
  total: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  reorderBtn: { marginTop: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  reorderText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
});
