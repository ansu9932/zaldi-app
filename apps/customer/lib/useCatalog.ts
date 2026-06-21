import { useEffect, useState } from 'react';
import { Product } from './catalog';
import { getCatalogProducts } from './api';

/** Returns the live product catalog from the database (empty until products are added in Admin). */
export function useCatalog(): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCatalogProducts()
      .then((p) => { if (mounted) setProducts(p); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return { products, loading };
}
