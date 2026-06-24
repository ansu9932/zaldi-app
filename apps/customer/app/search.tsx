import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Pressable, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { CATEGORIES, Product } from '../lib/catalog';
import { useStore } from '../lib/store';
import { ProductImage } from '../lib/ProductImage';
import { useCatalog } from '../lib/useCatalog';
import { useGuardedAdd } from '../lib/useGuardedAdd';

const { width } = Dimensions.get('window');
const GAP = 12;
const CARD_W = (width - spacing.lg * 2 - GAP) / 2;

function catLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export default function Search() {
  const insets = useSafeAreaInsets();
  const { products } = useCatalog();
  const { lines, remove } = useStore();
  const guardedAdd = useGuardedAdd();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || catLabel(p.category).toLowerCase().includes(s),
    );
  }, [q, products]);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of products) {
      const w = p.name.split(' ')[0];
      if (!seen.has(w.toLowerCase())) { seen.add(w.toLowerCase()); out.push(w); }
      if (out.length >= 8) break;
    }
    return out;
  }, [products]);

  function Card({ item }: { item: Product }) {
    const qty = lines[item.id]?.qty ?? 0;
    return (
      <View style={[styles.card, { width: CARD_W }]}>
        <Pressable onPress={() => router.push(`/product/${item.id}`)}>
          <ProductImage product={item} size={CARD_W - 24} style={{ marginBottom: 10 }} />
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.unit}>{item.unit}</Text>
        </Pressable>
        <View style={styles.bottom}>
          <Text style={styles.price}>₹{item.price}</Text>
          {qty === 0 ? (
            <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => guardedAdd(item)}>
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
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Text style={{ fontSize: 16, color: colors.inkFaint }}>🔍</Text>
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Search for products…"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            returnKeyType="search"
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')} hitSlop={8}><Text style={styles.clear}>✕</Text></TouchableOpacity>
          )}
        </View>
      </View>

      {q.trim().length === 0 ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={styles.suggTitle}>Try searching for</Text>
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => setQ(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ padding: spacing.lg, gap: GAP, paddingBottom: 40 }}
          renderItem={({ item }) => <Card item={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No products match “{q}”.</Text>}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSoft },
  backArrow: { fontSize: 28, color: colors.ink, fontWeight: '800', marginTop: -4 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgSoft, borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  clear: { color: colors.inkFaint, fontSize: 16, fontWeight: '800', paddingHorizontal: 4 },
  suggTitle: { fontWeight: '800', color: colors.ink, fontSize: 14, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.inkMuted, fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
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
});
