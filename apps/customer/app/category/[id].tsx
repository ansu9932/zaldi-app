import { useLocalSearchParams, router, Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/brand';
import { productsByCategory, Product } from '../../lib/demoData';
import { useStore } from '../../lib/store';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { lines, add, remove, count } = useStore();
  const products = productsByCategory(id ?? '');
  const cartCount = count();

  function QtyControl({ product }: { product: Product }) {
    const qty = lines[product.id]?.qty ?? 0;
    if (qty === 0) {
      return (
        <TouchableOpacity style={styles.addBtn} onPress={() => add(product)}>
          <Text style={styles.addBtnText}>ADD</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.qtyBox}>
        <TouchableOpacity onPress={() => remove(product.id)} style={styles.qtyBtn}>
          <Text style={styles.qtySign}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyNum}>{qty}</Text>
        <TouchableOpacity onPress={() => add(product)} style={styles.qtyBtn}>
          <Text style={styles.qtySign}>+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <Stack.Screen options={{ title: id }} />
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.thumb}>
              <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.unit}>{item.unit}</Text>
              <Text style={styles.price}>₹{item.price}</Text>
            </View>
            <QtyControl product={item} />
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No items in this category yet.</Text>
        }
      />

      {cartCount > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]}
          onPress={() => router.push('/cart')}
        >
          <Text style={styles.cartBarText}>
            {cartCount} item{cartCount > 1 ? 's' : ''} in cart
          </Text>
          <Text style={styles.cartBarCta}>View Cart →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  thumb: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  unit: { color: colors.inkFaint, fontSize: 12, marginTop: 2 },
  price: { color: colors.ink, fontWeight: '800', fontSize: 15, marginTop: 4 },

  addBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  addBtnText: { color: colors.ink, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

  qtyBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary, borderRadius: radius.md,
  },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  qtySign: { color: colors.white, fontWeight: '900', fontSize: 18 },
  qtyNum: { color: colors.white, fontWeight: '800', fontSize: 15, minWidth: 18, textAlign: 'center' },

  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },

  cartBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.ink, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 14,
  },
  cartBarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  cartBarCta: { color: colors.accent, fontWeight: '800', fontSize: 15 },
});
