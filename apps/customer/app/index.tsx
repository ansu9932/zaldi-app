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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, radius, spacing } from '../lib/brand';
import { isServiceable, SERVICE_CENTER, SERVICE_RADIUS_KM } from '../lib/algorithms';
import { CATEGORIES } from '../lib/demoData';
import { useStore } from '../lib/store';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { serviceable, distanceFromCenter, setLocation, count } = useStore();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cartCount = count();

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
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
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

  // ---------- Loading ----------
  if (checking) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.logo}>next</Text>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 20 }} />
        <Text style={styles.muted}>Checking delivery availability…</Text>
      </View>
    );
  }

  // ---------- Outside service area ----------
  if (serviceable === false) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, padding: spacing.xl }]}>
        <Text style={styles.bigEmoji}>📍</Text>
        <Text style={styles.unavailableTitle}>Service Unavailable in your area</Text>
        <Text style={styles.muted}>
          You are about {distanceFromCenter} km from Contai. {'next'} currently delivers
          only within {SERVICE_RADIUS_KM} km of Contai (Kanthi).
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
          <Text style={styles.retryText}>Check again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- Permission / error ----------
  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, padding: spacing.xl }]}>
        <Text style={styles.bigEmoji}>🔒</Text>
        <Text style={styles.unavailableTitle}>Location needed</Text>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
          <Text style={styles.retryText}>Allow location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- Serviceable: full home ----------
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.deliverTo}>DELIVERING IN ~20 MIN TO</Text>
            <Text style={styles.address}>📍 Contai, West Bengal · {distanceFromCenter} km</Text>
          </View>
          <View style={styles.logoPill}>
            <Text style={styles.logoPillText}>next</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.search}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            placeholder="Search for atta, milk, medicines…"
            placeholderTextColor={colors.inkFaint}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Groceries in minutes ⚡</Text>
          <Text style={styles.bannerSub}>Free delivery on orders within 3 km</Text>
        </View>

        <Text style={styles.sectionTitle}>Shop by category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [
                styles.catCard,
                { backgroundColor: c.color, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => router.push(`/category/${c.id}`)}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={styles.catLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Why next?</Text>
          <Text style={styles.infoLine}>⚡ Delivered in ~20–30 min</Text>
          <Text style={styles.infoLine}>🏪 From trusted local Contai shops</Text>
          <Text style={styles.infoLine}>💳 Pay by UPI or Cash on Delivery</Text>
          <Text style={styles.infoLine}>🛒 Minimum order ₹150</Text>
        </View>
      </ScrollView>

      {/* Sticky cart bar */}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  logo: { fontSize: 40, fontWeight: '900', color: colors.primary, letterSpacing: -1 },
  muted: { color: colors.inkMuted, textAlign: 'center', marginTop: 10, fontSize: 14, lineHeight: 20 },
  bigEmoji: { fontSize: 56, marginBottom: 12 },
  unavailableTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  retryBtn: {
    marginTop: 20, backgroundColor: colors.primary,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.pill,
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  deliverTo: { color: '#C7D2FE', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  address: { color: colors.white, fontSize: 16, fontWeight: '800', marginTop: 2 },
  logoPill: { backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  logoPillText: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.white, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: spacing.lg,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink },

  banner: {
    backgroundColor: colors.primaryDark, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
  },
  bannerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  bannerSub: { color: '#C7D2FE', marginTop: 4, fontSize: 13 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  catCard: {
    width: '31%', aspectRatio: 0.95, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  catEmoji: { fontSize: 34 },
  catLabel: { fontWeight: '700', color: colors.ink, fontSize: 13 },

  infoCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  infoTitle: { fontWeight: '800', fontSize: 15, color: colors.ink, marginBottom: 6 },
  infoLine: { color: colors.inkMuted, fontSize: 14 },

  cartBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.ink, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 14,
  },
  cartBarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  cartBarCta: { color: colors.accent, fontWeight: '800', fontSize: 15 },
});
