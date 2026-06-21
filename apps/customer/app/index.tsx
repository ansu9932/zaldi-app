import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../lib/brand';
import { useStore } from '../lib/store';

export default function Splash() {
  const loggedIn = useStore((s) => s.loggedIn);
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      router.replace(loggedIn ? '/home' : '/login');
    }, 1600);
    return () => clearTimeout(t);
  }, [loggedIn]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Text style={styles.logo}>
          next<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.tag}>What do you need next?</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 64, fontWeight: '900', color: colors.white, letterSpacing: -3, textAlign: 'center' },
  dot: { color: colors.primary, fontSize: 72 },
  tag: { color: colors.inkFaint, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 4 },
});
