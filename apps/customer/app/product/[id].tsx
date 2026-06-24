import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/brand';
import { CATEGORIES, isAgeRestricted } from '../../lib/catalog';
import { useStore } from '../../lib/store';
import { ProductImage } from '../../lib/ProductImage';
import { useCatalog } from '../../lib/useCatalog';
import { useGuardedAdd } from '../../lib/useGuardedAdd';
import { getShopRating, ShopRating } from '../../lib/api';

const { width } = Dimensions.get('window');

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { products } = useCatalog();
  const { lines, remove, count, toggleFavorite, isFavorite } = useStore();
  const guardedAdd = useGuardedAdd();

  const product = products.find((p) => p.id === id);
  const cartCount = count();

  const [rating, setRating] = useState<ShopRating | null>(null);
  useEffect(() => {
    if (product?.shopId) getShopRating(product.shopId).then(setRating);
  }, [product?.shopId]);

  if (!product) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Product' }} />
        <Text style={{ fontSize: 40 }}>🔍</Text>
        <Text style={styles.missing}>This product is no longer available.</Text>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/home')}>
          <Text style={styles.homeBtnText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const qty = lines[product.id]?.qty ?? 0;
  const fav = isFavorite(product.id);
  const catName = CATEGORIES.find((c) => c.id === product.category)?.label ?? product.category;
  const shopName = product.shopName;
  const shopAddress = product.shopAddress;
  const restricted = isAgeRestricted(product.category);
  const saving = product.mrp && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 6);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.hero}>
          <ProductImage product={product} size={width * 0.6} style={{ width: width * 0.6, alignSelf: 'center' }} />
          <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(product.id)}>
            <Text style={{ fontSize: 22 }}>{fav ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          {product.tag && <View style={styles.tag}><Text style={styles.tagText}>{product.tag}</Text></View>}
        </View>

        <View style={styles.body}>
          <Text style={styles.cat}>{catName.toUpperCase()}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.unit}>{product.unit}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.mrp && <Text style={styles.mrp}>₹{product.mrp}</Text>}
            {saving > 0 && <View style={styles.savePill}><Text style={styles.saveText}>{saving}% OFF</Text></View>}
          </View>

          {restricted && (
            <View style={styles.ageCard}>
              <Text style={styles.ageText}>🔞 Age-restricted item · sold only to 18+ · ID required at delivery</Text>
            </View>
          )}

          {shopName && (
            <View style={styles.shopCard}>
              <Text style={styles.shopTitle}>🏪 Sold by {shopName}</Text>
              {!!shopAddress && <Text style={styles.shopSub}>{shopAddress}</Text>}
              {rating && rating.count > 0 && (
                <Text style={styles.ratingText}>⭐ {rating.avg} · {rating.count} rating{rating.count > 1 ? 's' : ''}</Text>
              )}
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoRow}>⚡ Delivered in minutes within Contai</Text>
            <Text style={styles.infoRow}>↩️ Easy returns on damaged items</Text>
            <Text style={styles.infoRow}>✅ 100% genuine products</Text>
          </View>

          {related.length > 0 && (
            <>
              <Text style={styles.relTitle}>You might also like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                {related.map((r) => (
                  <TouchableOpacity key={r.id} style={styles.relCard} onPress={() => router.replace(`/product/${r.id}`)}>
                    <ProductImage product={r} size={70} />
                    <Text style={styles.relName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.relPrice}>₹{r.price}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {qty === 0 ? (
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => guardedAdd(product)}>
            <Text style={styles.addBtnText}>Add to cart · ₹{product.price}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerRow}>
            <View style={styles.qtyBox}>
              <TouchableOpacity onPress={() => remove(product.id)} style={styles.qtyBtn}><Text style={styles.qtySign}>−</Text></TouchableOpacity>
              <Text style={styles.qtyNum}>{qty}</Text>
              <TouchableOpacity onPress={() => guardedAdd(product)} style={styles.qtyBtn}><Text style={styles.qtySign}>+</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.viewCartBtn} onPress={() => router.push('/cart')}>
              <Text style={styles.viewCartText}>View cart ({cartCount}) →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg },
  missing: { color: colors.inkMuted, fontSize: 15 },
  homeBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill, marginTop: 8 },
  homeBtnText: { color: colors.white, fontWeight: '700' },

  hero: { backgroundColor: colors.white, padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  favBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', top: spacing.lg, left: spacing.lg, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' },

  body: { padding: spacing.lg },
  cat: { color: colors.inkFaint, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  name: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 4 },
  unit: { color: colors.inkMuted, fontSize: 14, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md },
  price: { fontSize: 26, fontWeight: '900', color: colors.ink },
  mrp: { fontSize: 16, color: colors.inkFaint, textDecorationLine: 'line-through' },
  savePill: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  saveText: { color: colors.primaryDark, fontWeight: '900', fontSize: 12 },

  shopCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  shopTitle: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  shopSub: { color: colors.inkMuted, fontSize: 13, marginTop: 4 },
  ratingText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800', marginTop: 6 },
  ageCard: { backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, borderWidth: 1, borderColor: '#FCD34D' },
  ageText: { color: '#92400E', fontSize: 13, fontWeight: '700' },

  infoCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 8 },
  infoRow: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' },

  relTitle: { fontWeight: '800', color: colors.ink, fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md },
  relCard: { width: 110, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  relName: { fontWeight: '700', color: colors.ink, fontSize: 12, marginTop: 6 },
  relPrice: { fontWeight: '900', color: colors.ink, fontSize: 13, marginTop: 2 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  addBtnText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md },
  qtyBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  qtySign: { color: colors.white, fontWeight: '900', fontSize: 18 },
  qtyNum: { color: colors.white, fontWeight: '800', fontSize: 15, minWidth: 18, textAlign: 'center' },
  viewCartBtn: { flex: 1, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  viewCartText: { color: colors.white, fontWeight: '900', fontSize: 15 },
});
