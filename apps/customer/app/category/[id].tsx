import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/brand';
import { productsByCategory, CATEGORIES, Product } from '../../lib/catalog';
import { useStore } from '../../lib/store';
import { ProductImage } from '../../lib/ProductImage';
import { useCatalog } from '../../lib/useCatalog';

const { width } = Dimensions.get('window');
const GAP = 12;
const CARD_W = (width - spacing.lg * 2 - GAP) / 2;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { lines, add, remove, count } = useStore();
  const { products: allProducts } = useCatalog();
  const products = allProducts.filter((p) => p.category === (id ?? ''));
  const cat = CATEGORIES.find((c) => c.id === id);
  const cartCount = count();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  function ProductCard({ item }: { item: Product }) {
    const qty = lines[item.id]?.qty ?? 0;
    return (
      <View style={[styles.card, { width: CARD_W }]}>
        {item.tag && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.tag}</Text>
          </View>
        )}
        <ProductImage product={item} size={CARD_W - 24} style={{ marginBottom: 10 }} />
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.unit}>{item.unit}</Text>
        <View style={styles.bottom}>
          <View>
            <Text style={styles.price}>₹{item.price}</Text>
            {item.mrp && <Text style={styles.mrp}>₹{item.mrp}</Text>}
          </View>
          {qty === 0 ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => add(item)}>
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.qtyBox}>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.qtyBtn}>
                <Text style={styles.qtySign}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{qty}</Text>
              <TouchableOpacity onPress={() => add(item)} style={styles.qtyBtn}>
                <Text style={styles.qtySign}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      {/* Custom header with a reliable back button */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={10}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{cat ? `${cat.emoji}  ${cat.label}` : 'Shop'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: GAP }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ProductCard item={item} />}
        ListEmptyComponent={<Text style={styles.empty}>No items in this category yet.</Text>}
      />

      {cartCount > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]}
          onPress={() => router.push('/cart')}
        >
          <Text style={styles.cartBarText}>{cartCount} item{cartCount > 1 ? 's' : ''} in cart</Text>
          <Text style={styles.cartBarCta}>View Cart →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSoft },
  backArrow: { fontSize: 28, color: colors.ink, fontWeight: '800', marginTop: -4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },

  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  tag: { position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  tagText: { color: colors.primaryDark, fontSize: 9, fontWeight: '900' },
  name: { fontWeight: '700', color: colors.ink, fontSize: 13, minHeight: 34 },
  unit: { color: colors.inkFaint, fontSize: 11, marginTop: 2, marginBottom: 10 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontWeight: '900', color: colors.ink, fontSize: 15 },
  mrp: { color: colors.inkFaint, fontSize: 11, textDecorationLine: 'line-through' },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.sm },
  qtyBtn: { paddingHorizontal: 9, paddingVertical: 5 },
  qtySign: { color: colors.white, fontWeight: '900', fontSize: 16 },
  qtyNum: { color: colors.white, fontWeight: '800', fontSize: 13, minWidth: 14, textAlign: 'center' },

  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },

  cartBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 14,
  },
  cartBarText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  cartBarCta: { color: colors.white, fontWeight: '900', fontSize: 15 },
});
