import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Pressable,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, radius, spacing } from '../lib/brand';
import { isServiceable, SERVICE_RADIUS_KM } from '../lib/algorithms';
import { CATEGORIES, Product } from '../lib/catalog';
import { useStore } from '../lib/store';
import { ProductImage } from '../lib/ProductImage';
import { useCatalog } from '../lib/useCatalog';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { serviceable, distanceFromCenter, setLocation, count, name, selectedAddress } = useStore();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cartCount = count();
  const addr = selectedAddress();
  const { products } = useCatalog();
  const byCat = (id: string) => products.filter((p) => p.category === id);
  const fast = products.filter((p) => p.tag === 'FAST');
  const bestList = fast.length ? fast : products.slice(0, 8);

  async function checkLocation() {
    setChecking(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to check delivery availability.');
        setChecking(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const result = isServiceable(point);
      setLocation(point, result.ok, result.distanceKm);
    } catch (e) {
      setError('Could not get your location. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkLocation();
  }, []);

  if (checking) {
    return (
      <View style={styles.center}>
        <Text style={styles.logo}>next<Text style={styles.dot}>.</Text></Text>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 20 }} />
        <Text style={styles.muted}>Checking delivery availability…</Text>
      </View>
    );
  }

  if (serviceable === false) {
    return (
      <View style={[styles.center, { padding: spacing.xl }]}>
        <Text style={styles.bigEmoji}>📍</Text>
        <Text style={styles.unavailableTitle}>Service Unavailable in your area</Text>
        <Text style={styles.muted}>
          You are about {distanceFromCenter} km from Contai. next delivers only within{' '}
          {SERVICE_RADIUS_KM} km of Contai (Kanthi).
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
          <Text style={styles.retryText}>Check again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { padding: spacing.xl }]}>
        <Text style={styles.bigEmoji}>🔒</Text>
        <Text style={styles.unavailableTitle}>Location needed</Text>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
          <Text style={styles.retryText}>Allow location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/address')}>
            <View style={styles.statusRow}>
              <View style={styles.dotWrap}>
                <View style={styles.dotGlow} />
                <View style={styles.dotCore} />
              </View>
              <Text style={styles.statusText}>{addr ? `DELIVER TO ${addr.label.toUpperCase()}` : 'SERVICEABLE AREA'}</Text>
            </View>
            <Text style={styles.address} numberOfLines={1}>
              {addr ? `${addr.line}` : 'Contai, 721401'} ▾
            </Text>
          </Pressable>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/profile')}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.search}>
          <Text style={{ fontSize: 16, color: colors.inkFaint }}>🔍</Text>
          <TextInput
            placeholder="What do you need next?"
            placeholderTextColor={colors.inkFaint}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Promo banner */}
        <View style={styles.bannerWrap}>
          <View style={styles.banner}>
            <View style={{ flex: 1 }}>
              <View style={styles.bannerPill}>
                <Text style={styles.bannerPillText}>WELCOME{name ? `, ${name.toUpperCase()}` : ''}</Text>
              </View>
              <Text style={styles.bannerTitle}>Free Delivery</Text>
              <Text style={styles.bannerTitleGreen}>On Your First Order</Text>
            </View>
            <Text style={{ fontSize: 40 }}>🚀</Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Shop by category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.catItem, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => router.push(`/category/${c.id}`)}
            >
              <View style={styles.catIcon}>
                <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
              </View>
              <Text style={styles.catLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Product rows */}
        <ProductRow title="⚡ Bestsellers" data={bestList} />
        <ProductRow title="🍎 Fresh Fruits" data={byCat('fruits')} onSeeAll={() => router.push('/category/fruits')} />
        <ProductRow title="🥬 Vegetables" data={byCat('vegetables')} onSeeAll={() => router.push('/category/vegetables')} />
        <ProductRow title="🥛 Dairy & Bread" data={byCat('dairy')} onSeeAll={() => router.push('/category/dairy')} />
      </ScrollView>

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

function ProductRow({ title, data, onSeeAll }: { title: string; data: Product[]; onSeeAll?: () => void }) {
  const { lines, add, remove } = useStore();
  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={styles.rowHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => {
          const qty = lines[item.id]?.qty ?? 0;
          return (
            <View style={styles.pCard}>
              {item.tag && (
                <View style={styles.pTag}>
                  <Text style={styles.pTagText}>{item.tag}</Text>
                </View>
              )}
              <ProductImage product={item} size={90} style={{ marginBottom: 10 }} />
              <Text style={styles.pName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.pUnit}>{item.unit}</Text>
              <View style={styles.pBottom}>
                <View>
                  <Text style={styles.pPrice}>₹{item.price}</Text>
                  {item.mrp && <Text style={styles.pMrp}>₹{item.mrp}</Text>}
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
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  logo: { fontSize: 44, fontWeight: '900', color: colors.ink, letterSpacing: -2 },
  dot: { color: colors.primary },
  muted: { color: colors.inkMuted, textAlign: 'center', marginTop: 10, fontSize: 14, lineHeight: 20 },
  bigEmoji: { fontSize: 56, marginBottom: 12 },
  unavailableTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  retryBtn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.pill },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  header: {
    backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  dotGlow: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, opacity: 0.3 },
  dotCore: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  statusText: { fontSize: 10, fontWeight: '800', color: colors.inkFaint, letterSpacing: 0.6 },
  address: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgSoft, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 13, marginTop: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink },

  bannerWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  banner: {
    backgroundColor: colors.ink, borderRadius: radius.xl, padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  bannerPill: { backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  bannerPillText: { color: colors.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  bannerTitle: { color: colors.white, fontSize: 22, fontWeight: '900', lineHeight: 26 },
  bannerTitleGreen: { color: colors.primary, fontSize: 22, fontWeight: '900', lineHeight: 26 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: colors.primary, fontWeight: '800', fontSize: 13, paddingHorizontal: spacing.lg },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg - 4, marginTop: spacing.sm },
  catItem: { width: '25%', alignItems: 'center', paddingVertical: spacing.sm },
  catIcon: { width: 58, height: 58, borderRadius: radius.lg, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  catLabel: { fontSize: 11, fontWeight: '700', color: colors.inkMuted, marginTop: 6, textAlign: 'center' },

  pCard: { width: 150, backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  pTag: { position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  pTagText: { color: colors.primaryDark, fontSize: 9, fontWeight: '900' },
  pImg: { height: 90, backgroundColor: colors.bgSoft, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  pName: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  pUnit: { color: colors.inkFaint, fontSize: 11, marginTop: 2, marginBottom: 10 },
  pBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pPrice: { fontWeight: '900', color: colors.ink, fontSize: 15 },
  pMrp: { color: colors.inkFaint, fontSize: 11, textDecorationLine: 'line-through' },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.sm },
  qtyBtn: { paddingHorizontal: 8, paddingVertical: 5 },
  qtySign: { color: colors.white, fontWeight: '900', fontSize: 15 },
  qtyNum: { color: colors.white, fontWeight: '800', fontSize: 13, minWidth: 14, textAlign: 'center' },

  cartBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 14,
  },
  cartBarText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  cartBarCta: { color: colors.white, fontWeight: '900', fontSize: 15 },
});
