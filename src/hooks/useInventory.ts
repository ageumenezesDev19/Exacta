import { useStorage } from './useStorage';
import { Product, FlaggedProduct } from '../utils/inventory';
import { processData } from '../utils/db_utils';
import { useEffect } from 'react';
import { Withdrawn } from '../components/WithdrawnTable';
import { FractionRule } from '../utils/fractioning';

export const useInventory = () => {
  const [products, setProducts] = useStorage<Product[]>('products', []);
  const [withdrawn, setWithdrawn] = useStorage<Withdrawn[]>('withdrawn', []);
  const [blacklist, setBlacklist] = useStorage<string[]>('blacklist', []);
  const [flaggedProducts, setFlaggedProducts] = useStorage<FlaggedProduct[]>('flagged', []);
  // null until the operator edits a rule: until then the defaults are derived from the stock.
  const [storedFractionRules, setStoredFractionRules] = useStorage<FractionRule[] | null>('fractioning', null);

  // Normalize numeric fields if they were stored as strings (legacy or different environment)
  useEffect(() => {
    try {
      if (Array.isArray(products) && products.length > 0) {
        const first = products[0] as any;
        // Heuristic: if salePrice is a string, run processData to coerce numbers
        if (typeof first.salePrice === 'string' || typeof first.quantity === 'string' || typeof first['Preço Venda'] === 'string') {
          const normalized = processData(products as any[]);
          setProducts(normalized as Product[]);
          console.log('[useInventory] Products normalized after loading from storage');
        }
      }
    } catch (e) {
      console.error('[useInventory] Error normalizing products:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    setProducts,
    withdrawn,
    setWithdrawn,
    blacklist,
    setBlacklist,
    flaggedProducts,
    setFlaggedProducts,
    storedFractionRules,
    setStoredFractionRules,
  };
};
