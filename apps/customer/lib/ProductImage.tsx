import { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from './brand';
import { Product, productImageUrl } from './catalog';

/**
 * Shows a real product photo from the web. If the image fails to load
 * (or no internet), it falls back to the product emoji so the UI never breaks.
 */
export function ProductImage({
  product,
  size = 90,
  style,
}: {
  product: Product;
  size?: number;
  style?: ViewStyle;
}) {
  const [failed, setFailed] = useState(false);
  const url = productImageUrl(product);

  if (failed || !url) {
    return (
      <View style={[styles.fallback, { height: size }, style]}>
        <Text style={{ fontSize: size * 0.45 }}>{product.emoji}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height: size }, style]}>
      <Image
        source={{ uri: url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  fallback: {
    width: '100%',
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
