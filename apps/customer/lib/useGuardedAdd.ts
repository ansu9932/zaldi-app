/**
 * Single-store cart rule (same as Blinkit/Zepto): a cart can only contain items
 * from ONE store at a time. If the customer adds an item from a different store,
 * we ask before clearing the current cart. This prevents the multi-shop order bug
 * where an order was silently created under only the first item's shop.
 *
 * Also enforces an 18+ age check before adding alcohol / tobacco (wine,
 * cigarettes) — legally required, and what Blinkit/Zepto do for these items.
 */
import { Alert, Linking } from 'react-native';
import { useStore } from './store';
import { Product, shopById, isAgeRestricted } from './catalog';
import { LEGAL } from './legal';

export function useGuardedAdd() {
  const lines = useStore((s) => s.lines);
  const add = useStore((s) => s.add);
  const clear = useStore((s) => s.clear);
  const ageVerified = useStore((s) => s.ageVerified);
  const confirmAge = useStore((s) => s.confirmAge);

  // Resolve a store's display name in BOTH demo (s1/s2/s3) and live (UUID) mode.
  const shopName = (shopId: string | null, fallback?: string): string => {
    if (!shopId) return 'another store';
    return shopById(shopId)?.name ?? fallback ?? 'another store';
  };

  function doAdd(product: Product) {
    const values = Object.values(lines);
    const currentShop = values[0]?.product.shopId ?? null;
    const alreadyInCart = !!lines[product.id];

    // Same store, or item already in cart, or empty cart → just add.
    if (!currentShop || currentShop === product.shopId || alreadyInCart) {
      add(product);
      return;
    }

    const fromName = shopName(currentShop, values[0]?.product.shopName);
    const toName = shopName(product.shopId, product.shopName);
    Alert.alert(
      'Start a new cart?',
      `Your cart has items from ${fromName}. You can only order from one store at a time. Clear the cart and add this item from ${toName}?`,
      [
        { text: 'Keep cart', style: 'cancel' },
        { text: 'Clear & add', style: 'destructive', onPress: () => { clear(); add(product); } },
      ],
    );
  }

  return (product: Product) => {
    // 18+ gate for alcohol / tobacco. Asked only ONCE per account — once the user
    // confirms they're 18+ and accepts the Terms, `ageVerified` is saved to their
    // account/device and we never ask again.
    if (isAgeRestricted(product.category) && !ageVerified) {
      Alert.alert(
        'Confirm age & accept Terms',
        'Alcohol and tobacco can only be sold to adults aged 18+. By tapping “I’m 18+ & Accept” you confirm you are 18 or older, agree to our Terms & Conditions and Privacy Policy, and will show a valid ID at delivery.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Read Terms', onPress: () => Linking.openURL(LEGAL.terms) },
          { text: 'I’m 18+ & Accept', onPress: () => { confirmAge(); doAdd(product); } },
        ],
      );
      return;
    }
    doAdd(product);
  };
}
