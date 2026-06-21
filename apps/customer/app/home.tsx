import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  FlatList,
  Animated,
  Easing,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, radius, spacing } from '../lib/brand';
import { isServiceable, SERVICE_RADIUS_KM, SERVICE_CENTER } from '../lib/algorithms';
import { CATEGORIES, Category, Product } from '../lib/catalog';
import { useStore } from '../lib/store';
import { ProductImage } from '../lib/ProductImage';
import { useCatalog } from '../lib/useCatalog';
import { useGuardedAdd } from '../lib/useGuardedAdd';
import { ActiveOrderBar } from '../lib/ActiveOrderBar';

const { width: SCREEN_W } = Dimensions.get('window');
const ADULT_W = (SCREEN_W - spacing.lg * 2 - spacing.md) / 2;

interface Offer {
  id: string;
  code: string | null;
  title: string;
  subtitle: string;
  emoji: string;
  bg: string;
  firstOrderOnly?: boolean;
}

const ALL_OFFERS: Offer[] = [
  { id: 'welcome', code: null, title: 'Free Delivery', subtitle: 'On your first order', emoji: '🚀', bg: colors.ink, firstOrderOnly: true },
  { id: 'next50', code: 'NEXT50', title: '₹50 OFF', subtitle: 'On orders above ₹199', emoji: '🎁', bg: '#1E293B' },
  { id: 'save10', code: 'SAVE10', title: '10% OFF', subtitle: 'Up to ₹60 off', emoji: '💸', bg: '#0B3B2E' },
  { id: 'freeship', code: 'FREESHIP', title: 'Free Delivery', subtitle: 'On orders above ₹250', emoji: '🛵', bg: '#1E293B' },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { serviceable, distanceFromCenter, setLocation, count, name, selectedAddress } = useStore();
  const orderHistory = useStore((s) => s.orderHistory);
  const [checking, setChecking] = useState(serviceable === null);
  const [error, setError] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const cartCount = count();
  const addr = selectedAddress();
  const lastOrder = useStore((s) => s.lastOrder);
  const lastOrderStatus = useStore((s) => s.lastOrderStatus);
  const showActive = !!lastOrder && lastOrderStatus !== 'delivered';
  const { products } = useCatalog();
  const byCat = (id: string) => products.filter((p) => p.category === id);
  const fast = products.filter((p) => p.tag === 'FAST');
  const bestList = fast.length ? fast : products.slice(0, 8);
  // First-order offer disappears once the user has placed an order.
  const offers = ALL_OFFERS.filter((o) => !o.firstOrderOnly || orderHistory.length === 0);

  async function checkLocation(silent = false) {
    if (!silent) setChecking(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) setError('Location permission is needed to check delivery availability.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const result = isServiceable(point);
      setLocation(point, result.ok, result.distanceKm);

      // Reverse-geocode the real GPS point so the header shows the actual place.
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
        const g = geo?.[0];
        if (g) {
          const primary = g.name || g.street || g.district || '';
          const secondary = g.subregion || g.city || g.region || '';
          const label = [primary, secondary].filter(Boolean).join(', ');
          if (label) setPlaceName(label);
        }
      } catch {
        /* reverse geocoding is best-effort */
      }
    } catch (e) {
      if (!silent) setError('Could not get your location. Please try again.');
    } finally {
      if (!silent) setChecking(false);
    }
  }

  useEffect(() => {
    // Block with the spinner only the first time. After we already know the
    // area, refresh quietly in the background so returning to Home is instant.
    checkLocation(serviceable !== null);
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
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setLocation(SERVICE_CENTER, true, 0)}
        >
          <Text style={styles.manualText}>I'm in Contai — continue manually</Text>
        </TouchableOpacity>
        <Text style={styles.manualHint}>We'll confirm your exact delivery address at checkout.</Text>
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
              <Text style={styles.statusText}>{addr ? `DELIVER TO ${addr.label.toUpperCase()}` : 'YOUR LOCATION'}</Text>
            </View>
            <Text style={styles.address} numberOfLines={1}>
              {addr ? `${addr.line}` : (placeName ?? 'Locating your area…')} ▾
            </Text>
          </Pressable>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/profile')}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>
        </View>

        <Pressable style={styles.search} onPress={() => router.push('/search')}>
          <Text style={{ fontSize: 16, color: colors.inkFaint }}>🔍</Text>
          <Text style={styles.searchPlaceholder}>What do you need next?</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 170 }} showsVerticalScrollIndicator={false}>
        {/* Offers carousel (auto-slides every 10s) */}
        <OfferCarousel offers={offers} name={name} />

        {/* Categories */}
        <Text style={styles.sectionTitle}>Shop by category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.filter((c) => !c.highlight).map((c) => (
            <CategoryItem key={c.id} c={c} />
          ))}
        </View>

        {/* Adults-only categories — big square tiles with a traveling-light border */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>🔞 For adults (18+)</Text>
        <View style={styles.adultRow}>
          {CATEGORIES.filter((c) => c.highlight).map((c) => (
            <AdultCard key={c.id} c={c} />
          ))}
        </View>

        {/* Product rows — only when products exist */}
        {products.length > 0 ? (
          <>
            <ProductRow title="⚡ Bestsellers" data={bestList} />
            {byCat('fruits').length > 0 && <ProductRow title="🍎 Fresh Fruits" data={byCat('fruits')} onSeeAll={() => router.push('/category/fruits')} />}
            {byCat('vegetables').length > 0 && <ProductRow title="🥬 Vegetables" data={byCat('vegetables')} onSeeAll={() => router.push('/category/vegetables')} />}
            {byCat('dairy').length > 0 && <ProductRow title="🥛 Dairy & Bread" data={byCat('dairy')} onSeeAll={() => router.push('/category/dairy')} />}
          </>
        ) : (
          <Text style={styles.noProducts}>Products are being added. Please check back soon! 🛒</Text>
        )}
      </ScrollView>

      {(cartCount > 0 || showActive) && (
        <View style={[styles.bottomStack, { paddingBottom: insets.bottom, backgroundColor: lastOrderStatus === 'cancelled' ? colors.error : showActive ? colors.ink : colors.primary }]}>
          {cartCount > 0 && (
            <TouchableOpacity style={styles.cartBar} onPress={() => router.push('/cart')}>
              <Text style={styles.cartBarText}>
                {cartCount} item{cartCount > 1 ? 's' : ''} in cart
              </Text>
              <Text style={styles.cartBarCta}>View Cart →</Text>
            </TouchableOpacity>
          )}
          <ActiveOrderBar />
        </View>
      )}
    </View>
  );
}

function CategoryItem({ c }: { c: Category }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!c.highlight) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });

  return (
    <Pressable
      style={({ pressed }) => [styles.catItem, { opacity: pressed ? 0.6 : 1 }]}
      onPress={() => router.push(`/category/${c.id}`)}
    >
      <View style={styles.catIconWrap}>
        {c.highlight && (
          <Animated.View
            pointerEvents="none"
            style={[styles.catRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
          />
        )}
        <View style={styles.catIcon}>
          <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
        </View>
        {c.highlight && (
          <View style={styles.ageDot}><Text style={styles.ageDotText}>18+</Text></View>
        )}
      </View>
      <Text style={styles.catLabel}>{c.label}</Text>
    </Pressable>
  );
}

function OfferCarousel({ offers, name }: { offers: Offer[]; name: string | null }) {
  const listRef = useRef<FlatList<Offer>>(null);
  const [index, setIndex] = useState(0);
  const idxRef = useRef(0);

  useEffect(() => {
    if (offers.length <= 1) return;
    const t = setInterval(() => {
      const next = (idxRef.current + 1) % offers.length;
      idxRef.current = next;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }, 10000);
    return () => clearInterval(t);
  }, [offers.length]);

  function onScrollEnd(e: any) {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    idxRef.current = i;
    setIndex(i);
  }

  function openOffer(o: Offer) {
    Alert.alert(
      `${o.title} — ${o.subtitle}`,
      o.code ? `Use code ${o.code} at checkout to get this offer.` : 'Automatically applied on your first order. Enjoy! 🎉',
    );
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={offers}
        keyExtractor={(o) => o.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        renderItem={({ item: o }) => (
          <View style={{ width: SCREEN_W, paddingHorizontal: spacing.lg }}>
            <Pressable style={[styles.banner, { backgroundColor: o.bg }]} onPress={() => openOffer(o)}>
              <View style={{ flex: 1 }}>
                <View style={styles.bannerPill}>
                  <Text style={styles.bannerPillText}>{o.firstOrderOnly ? `WELCOME${name ? `, ${name.toUpperCase()}` : ''}` : 'LIMITED OFFER'}</Text>
                </View>
                <Text style={styles.bannerTitle}>{o.title}</Text>
                <Text style={styles.bannerTitleGreen}>{o.subtitle}</Text>
                <View style={styles.codeChip}>
                  <Text style={styles.codeChipText}>{o.code ? `CODE: ${o.code}` : 'AUTO-APPLIED'}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 40 }}>{o.emoji}</Text>
            </Pressable>
          </View>
        )}
      />
      {offers.length > 1 && (
        <View style={styles.dots}>
          {offers.map((o, i) => (
            <View key={o.id} style={[styles.pageDot, i === index && styles.pageDotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function AdultCard({ c }: { c: Category }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const tx = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, ADULT_W, ADULT_W, 0, 0] });
  const ty = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 0, ADULT_W, ADULT_W, 0] });

  return (
    <Pressable style={styles.adultOuter} onPress={() => router.push(`/category/${c.id}`)}>
      <View style={styles.adultInner}>
        <View style={styles.ageDot2}><Text style={styles.ageDotText}>18+</Text></View>
        <Text style={styles.adultEmoji}>{c.emoji}</Text>
        <Text style={styles.adultLabel}>{c.label}</Text>
        <Text style={styles.adultSub}>Tap to explore</Text>
      </View>
      <Animated.View pointerEvents="none" style={[styles.travelDot, { transform: [{ translateX: tx }, { translateY: ty }] }]} />
    </Pressable>
  );
}

function ProductRow({ title, data, onSeeAll }: { title: string; data: Product[]; onSeeAll?: () => void }) {
  const { lines, remove, toggleFavorite, isFavorite } = useStore();
  const guardedAdd = useGuardedAdd();
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
          const fav = isFavorite(item.id);
          return (
            <View style={styles.pCard}>
              {item.tag && (
                <View style={styles.pTag}>
                  <Text style={styles.pTagText}>{item.tag}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(item.id)} hitSlop={8}>
                <Text style={{ fontSize: 16 }}>{fav ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
              <Pressable onPress={() => router.push(`/product/${item.id}`)}>
                <ProductImage product={item} size={90} style={{ marginBottom: 10 }} />
                <Text style={styles.pName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.pUnit}>{item.unit}</Text>
              </Pressable>
              <View style={styles.pBottom}>
                <View>
                  <Text style={styles.pPrice}>₹{item.price}</Text>
                  {item.mrp && <Text style={styles.pMrp}>₹{item.mrp}</Text>}
                </View>
                {qty === 0 ? (
                  <TouchableOpacity style={styles.addBtn} onPress={() => guardedAdd(item)}>
                    <Text style={styles.addBtnText}>ADD</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.qtyBox}>
                    <TouchableOpacity onPress={() => remove(item.id)} style={styles.qtyBtn}>
                      <Text style={styles.qtySign}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{qty}</Text>
                    <TouchableOpacity onPress={() => guardedAdd(item)} style={styles.qtyBtn}>
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
  manualBtn: { marginTop: 14, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.primary },
  manualText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
  manualHint: { color: colors.inkFaint, fontSize: 12, marginTop: 10, textAlign: 'center' },

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
  searchPlaceholder: { flex: 1, fontSize: 15, color: colors.inkFaint },

  bannerWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  banner: {
    backgroundColor: colors.ink, borderRadius: radius.xl, padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minHeight: 120, marginTop: spacing.lg,
  },
  codeChip: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  codeChipText: { color: colors.white, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  pageDotActive: { width: 18, backgroundColor: colors.primary },

  adultRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  adultOuter: { width: ADULT_W, height: ADULT_W, position: 'relative' },
  adultInner: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: spacing.md, overflow: 'hidden' },
  travelDot: { position: 'absolute', top: 0, left: 0, width: 12, height: 12, borderRadius: 6, marginLeft: -6, marginTop: -6, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  ageDot2: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  adultEmoji: { fontSize: 40, marginBottom: 8 },
  adultLabel: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  adultSub: { color: colors.primaryDark, fontWeight: '700', fontSize: 11, marginTop: 2 },
  bannerPill: { backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  bannerPillText: { color: colors.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  bannerTitle: { color: colors.white, fontSize: 22, fontWeight: '900', lineHeight: 26 },
  bannerTitleGreen: { color: colors.primary, fontSize: 22, fontWeight: '900', lineHeight: 26 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: colors.primary, fontWeight: '800', fontSize: 13, paddingHorizontal: spacing.lg },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg - 4, marginTop: spacing.sm },
  catItem: { width: '25%', alignItems: 'center', paddingVertical: spacing.sm },
  catIconWrap: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  catRing: { position: 'absolute', width: 66, height: 66, borderRadius: radius.lg + 5, borderWidth: 2, borderColor: colors.primary },
  ageDot: { position: 'absolute', top: -3, right: -3, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 5, paddingVertical: 1 },
  ageDotText: { color: colors.white, fontWeight: '900', fontSize: 8 },
  catIcon: { width: 58, height: 58, borderRadius: radius.lg, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  catLabel: { fontSize: 11, fontWeight: '700', color: colors.inkMuted, marginTop: 6, textAlign: 'center' },

  highlightRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  highlightCard: { flex: 1, backgroundColor: colors.ink, borderRadius: radius.xl, padding: spacing.lg, minHeight: 120, justifyContent: 'flex-end', overflow: 'hidden' },
  ageBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  ageBadgeText: { color: colors.white, fontWeight: '900', fontSize: 10 },
  highlightEmoji: { fontSize: 38, marginBottom: 6 },
  highlightLabel: { color: colors.white, fontWeight: '900', fontSize: 16 },
  highlightSub: { color: colors.primary, fontWeight: '700', fontSize: 11, marginTop: 2 },
  noProducts: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.xl, fontSize: 14, paddingHorizontal: spacing.xl },

  pCard: { width: 150, backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  pTag: { position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  pTagText: { color: colors.primaryDark, fontSize: 9, fontWeight: '900' },
  favBtn: { position: 'absolute', top: 6, right: 6, zIndex: 2, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
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

  bottomStack: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  cartBar: {
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 16,
  },
  cartBarText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  cartBarCta: { color: colors.white, fontWeight: '900', fontSize: 15 },
});
