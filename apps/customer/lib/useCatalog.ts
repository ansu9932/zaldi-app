import { useEffect, useState } from 'react';
import { PRODUCTS, Product } from './catalog';
import { getCatalogProducts } from './api';

/** Returns the live product catalog (from DB if available, else built-in). */
export function useCatalog(): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCatalogProducts()
      .then((p) => { if (mounted && p.length) setProducts(p); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return { products, loading };
}
