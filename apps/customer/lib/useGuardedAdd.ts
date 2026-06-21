/**
 * Single-store cart rule (same as Blinkit/Zepto): a cart can only contain items
 * from ONE store at a time. If the customer adds an item from a different store,
 * we ask before clearing the current cart. This prevents the multi-shop order bug
 * where an order was silently created under only the first item's shop.
 */
import { Alert } from 'react-native';
import { useStore } from './store';
import { Product } from './catalog';
import { shopById } from './catalog';

export function useGuardedAdd() {
  const lines = useStore((s) => s.lines);
  const add = useStore((s) => s.add);
  const clear = useStore((s) => s.clear);

  return (product: Product) => {
    const values = Object.values(lines);
    const currentShop = values[0]?.product.shopId ?? null;
    const alreadyInCart = !!lines[product.id];

    // Same store, or item already in cart, or empty cart → just add.
    if (!currentShop || currentShop === product.shopId || alreadyInCart) {
      add(product);
      return;
    }

    const fromName = shopById(currentShop)?.name ?? 'another store';
    const toName = shopById(product.shopId)?.name ?? 'a different store';
    Alert.alert(
      'Start a new cart?',
      `Your cart has items from ${fromName}. You can only order from one store at a time. Clear the cart and add this item from ${toName}?`,
      [
        { text: 'Keep cart', style: 'cancel' },
        { text: 'Clear & add', style: 'destructive', onPress: () => { clear(); add(product); } },
      ],
    );
  };
}
