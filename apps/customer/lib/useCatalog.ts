import { useEffect, useState } from 'react';
import { Product } from './catalog';
import { getCatalogProducts, subscribeCatalog } from './api';

/**
 * Returns the product catalog.
 * - DEMO: the bundled sample catalog.
 * - LIVE: products from the database, and it auto-refreshes in real time
 *   whenever you add/edit/remove a product in the Admin dashboard.
 */
export function useCatalog(): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      getCatalogProducts()
        .then((p) => { if (mounted) setProducts(p); })
        .finally(() => { if (mounted) setLoading(false); });
    load();
    const unsub = subscribeCatalog(load); // live updates from Admin
    return () => { mounted = false; unsub(); };
  }, []);

  return { products, loading };
}
