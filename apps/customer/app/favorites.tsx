import { Dimensions, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { Product } from '../lib/catalog';
import { useStore } from '../lib/store';
import { ProductImage } from '../lib/ProductImage';
import { useCatalog } from '../lib/useCatalog';
import { useGuardedAdd } from '../lib/useGuardedAdd';

const { width } = Dimensions.get('window');
const GAP = 12;
const CARD_W = (width - spacing.lg * 2 - GAP) / 2;

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const { products } = useCatalog();
  const { favorites, lines, remove, toggleFavorite, count } = useStore();
  const guardedAdd = useGuardedAdd();
  const favProducts = products.filter((p) => favorites.includes(p.id));
  const cartCount = count();

  function Card({ item }: { item: Product }) {
    const qty = lines[item.id]?.qty ?? 0;
    return (
      <View style={[styles.card, { width: CARD_W }]}>
        <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(item.id)} hitSlop={8}>
          <Text style={{ fontSize: 16 }}>❤️</Text>
        </TouchableOpacity>
        <Pressable onPress={() => router.push(`/product/${item.id}`)}>
          <ProductImage product={item} size={CARD_W - 24} style={{ marginBottom: 10 }} />
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.unit}>{item.unit}</Text>
        </Pressable>
        <View style={styles.bottom}>
          <Text style={styles.price}>₹{item.price}</Text>
          {qty === 0 ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => guardedAdd(item)}>
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.qtyBox}>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.qtyBtn}><Text style={styles.qtySign}>−</Text></TouchableOpacity>
              <Text style={styles.qtyNum}>{qty}</Text>
              <TouchableOpacity onPress={() => guardedAdd(item)} style={styles.qtyBtn}><Text style={styles.qtySign}>+</Text></TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <Stack.Screen options={{ title: 'My Favorites ❤️' }} />
      <FlatList
        data={favProducts}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ padding: spacing.lg, gap: GAP, paddingBottom: 120 }}
        renderItem={({ item }) => <Card item={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>🤍</Text>
            <Text style={styles.emptyText}>No favorites yet. Tap the heart on any product to save it here.</Text>
          </View>
        }
      />
      {cartCount > 0 && (
        <TouchableOpacity style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]} onPress={() => router.push('/cart')}>
          <Text style={styles.cartBarText}>{cartCount} item{cartCount > 1 ? 's' : ''} in cart</Text>
          <Text style={styles.cartBarCta}>View Cart →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', padding: spacing.xl, gap: 10, marginTop: 40 },
  emptyText: { color: colors.inkMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  favBtn: { position: 'absolute', top: 6, right: 6, zIndex: 2, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '700', color: colors.ink, fontSize: 13, minHeight: 34 },
  unit: { color: colors.inkFaint, fontSize: 11, marginTop: 2, marginBottom: 10 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontWeight: '900', color: colors.ink, fontSize: 15 },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.sm },
  qtyBtn: { paddingHorizontal: 9, paddingVertical: 5 },
  qtySign: { color: colors.white, fontWeight: '900', fontSize: 16 },
  qtyNum: { color: colors.white, fontWeight: '800', fontSize: 13, minWidth: 14, textAlign: 'center' },
  cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: 14 },
  cartBarText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  cartBarCta: { color: colors.white, fontWeight: '900', fontSize: 15 },
});
