import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing } from './brand';
import { useStore } from './store';
import { DEMO_MODE } from './supabase';
import { getOrder, subscribeOrder } from './api';

const LABEL: Record<string, string> = {
  pending_payment: 'Waiting for payment',
  placed: 'Order placed',
  accepted: 'Being prepared 👨‍🍳',
  ready: 'Packed · finding a rider 📦',
  assigned: 'Rider on the way 🛵',
  picked_up: 'On the way to you 🛵',
};

/**
 * Floating strip showing the current ongoing order + live status.
 * Tapping it opens the tracking screen. Hides when delivered/cancelled.
 */
export function ActiveOrderBar() {
  const lastOrder = useStore((s) => s.lastOrder);
  const status = useStore((s) => s.lastOrderStatus) ?? 'placed';
  const setStatus = useStore((s) => s.setLastOrderStatus);
  const clearLastOrder = useStore((s) => s.clearLastOrder);
  const pulse = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (!lastOrder?.id || DEMO_MODE) return;
    let mounted = true;
    getOrder(lastOrder.id).then((o) => o && mounted && setStatus(o.status));
    const unsub = subscribeOrder(lastOrder.id, (row) => mounted && setStatus(row.status));
    const poll = setInterval(() => getOrder(lastOrder.id).then((o) => o && setStatus(o.status)), 8000);
    return () => { mounted = false; unsub(); clearInterval(poll); };
  }, [lastOrder?.id]);

  if (!lastOrder) return null;
  if (status === 'delivered') return null;

  const cancelled = status === 'cancelled';
  const code = String(lastOrder.id).replace(/-/g, '').slice(0, 6).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.bar, cancelled && styles.barCancel]}
      onPress={() => (cancelled ? clearLastOrder() : router.push('/track'))}
      activeOpacity={0.9}
    >
      {cancelled ? (
        <Text style={{ fontSize: 18 }}>❌</Text>
      ) : (
        <Animated.View style={[styles.dot, { opacity: pulse }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {cancelled ? `Order #${code} was cancelled by the store` : `Order #${code} · ₹${lastOrder.total}`}
        </Text>
        <Text style={[styles.status, cancelled && { color: '#FECACA' }]}>
          {cancelled ? 'Tap to dismiss' : LABEL[status] ?? 'Order in progress'}
        </Text>
      </View>
      <Text style={styles.cta}>{cancelled ? '✕' : 'Track ›'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  barCancel: { backgroundColor: colors.error },
  title: { color: colors.white, fontWeight: '800', fontSize: 14 },
  status: { color: colors.primary, fontWeight: '700', fontSize: 12, marginTop: 2 },
  cta: { color: colors.white, fontWeight: '900', fontSize: 14 },
});
