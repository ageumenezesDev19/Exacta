// src/workers/combinationWorker.ts

interface Product {
  code: string;
  name: string;
  price: number;
  fractional: boolean;
  inventory: number;
  preferenceScore: number;
}

interface Combination {
  products: Product[];
  total: number;
  quantity: { [key: string]: number };
  diff: number;
  preferenceScore: number;
}

// Helper to calculate total in cents to avoid floating point issues
const calculateTotalInCents = (
  combination: Product[],
  quantity: { [key: string]: number },
  productsInCents: Map<string, number>
): number => {
  let total = 0;
  for (const product of combination) {
    const qty = quantity[product.code] || 0;
    const priceCents = productsInCents.get(product.code) || 0;
    total += Math.round(priceCents * qty);
  }
  return total;
};

// Extremely fast Greedy randomized algorithm
const findCombinationHeuristic = (
  products: Product[],
  targetPrice: number,
  inventory: { [key: string]: number },
  timeoutMs: number = 2000,
  quantityLimit?: number
): Combination | null => {
  const targetCents = Math.round(targetPrice * 100);
  const productsInCents = new Map<string, number>();
  products.forEach(p => productsInCents.set(p.code, Math.round(p.price * 100)));

  let bestCombination: Combination | null = null;
  let minDiff = Infinity;

  const startTime = Date.now();

  // Try pure greedy first, sorting by descending price
  const greedySearch = (shuffledProducts: Product[]) => {
    let remainingCents = targetCents;
    const currentQuantity: { [key: string]: number } = {};
    const currentCombo: Product[] = [];

    for (const p of shuffledProducts) {
       if (remainingCents <= 0) break;
       const priceCents = productsInCents.get(p.code) || 0;
       if (priceCents <= 0) continue;

       const availStock = inventory[p.code] || 0;
       
       let takeQty = 0;
       if (p.fractional) {
          const neededQty = remainingCents / priceCents;
          takeQty = Math.min(neededQty, availStock);
          if (quantityLimit !== undefined) takeQty = Math.min(takeQty, quantityLimit);
          takeQty = Math.floor(takeQty * 1000) / 1000;
       } else {
          // Unit
          const maxUnits = Math.floor(remainingCents / priceCents);
          takeQty = Math.min(maxUnits, Math.floor(availStock));
          if (quantityLimit !== undefined) takeQty = Math.min(takeQty, quantityLimit);
       }

       if (takeQty >= 0.001) {
          currentCombo.push(p);
          currentQuantity[p.code] = takeQty;
          remainingCents -= Math.round(takeQty * priceCents);
       }
    }

    const totalCents = calculateTotalInCents(currentCombo, currentQuantity, productsInCents);
    const diff = Math.abs(totalCents - targetCents);
    const preferenceScore = currentCombo.reduce((acc, product) => acc + product.preferenceScore, 0);

    const isBetter = diff < minDiff ||
      (diff === minDiff && currentCombo.length < (bestCombination?.products.length ?? Infinity)) ||
      (diff === minDiff &&
        currentCombo.length === (bestCombination?.products.length ?? Infinity) &&
        preferenceScore > (bestCombination?.preferenceScore ?? -Infinity));
    if (isBetter) {
       minDiff = diff;
       bestCombination = {
          products: currentCombo,
          total: totalCents / 100,
          quantity: currentQuantity,
          diff,
          preferenceScore
       };
    }
  };

  // Iteration 1: pure descending price
  const descProducts = [...products].sort((a, b) => b.price - a.price);
  greedySearch(descProducts);
  
  // Iteration 2: pure ascending price
  const ascProducts = [...products].sort((a, b) => a.price - b.price);
  greedySearch(ascProducts);

  // Iterations: Randomized greedy for up to timeoutMs
  let iterations = 0;
  while (Date.now() - startTime < timeoutMs && minDiff > 0) {
     iterations++;
     const shuffled = [...products].sort(() => Math.random() - 0.5);
     greedySearch(shuffled);
  }
  
  console.log(`[combinationWorker] completed ${iterations} randomized iterations. Best diff: ${minDiff / 100}`);

  // Accept if it's within tolerance or if it's the absolute best we found.
  // The user wants precision but also wants results even for huge numbers.
  // Tolerance: max 5 Reais or 5%, whichever is smaller.
  const toleranceCents = Math.min(500, Math.round(targetCents * 0.05));

  if (bestCombination && (minDiff <= toleranceCents || targetCents < 1000)) {
     return bestCombination;
  }
  
  // If we really can't find anything close, return best anyway so we don't just say "Nothing found"
  return bestCombination;
};

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'startSearch') {
    const { df, targetPrice, blacklist, quantityLimit } = payload;

    const productsRaw: Product[] = df.map((p: any) => {
      const priceNum = typeof p.salePrice === 'string' ? parseFloat(p.salePrice.replace(/\./g, '').replace(',', '.')) : Number(p.salePrice);
      const inventoryNum = typeof p.quantity === 'string' ? parseFloat(p.quantity.replace(/\./g, '').replace(',', '.')) : Number(p.quantity);

      return {
        code: String(p.code || p.barcode || ''),
        name: String(p.description || ''),
        price: isNaN(priceNum) ? 0 : priceNum,
        fractional: p.fractional === true,
        inventory: isNaN(inventoryNum) ? 0 : inventoryNum,
        preferenceScore: Number(p.preferenceScore) || 0,
      };
    });

    // Filter out products that are free or have no stock
    const products = productsRaw.filter((p: Product) => p.price > 0 && p.inventory > 0);

    const inventory = products.reduce((acc: { [key: string]: number }, p: Product) => {
      acc[p.code] = p.inventory;
      return acc;
    }, {});

    try {
      const filteredProducts = products.filter((p: Product) => {
        const isBlacklisted = blacklist.some((term: string) => p.name.toLowerCase().includes(term.toLowerCase()) || p.code.toLowerCase().includes(term.toLowerCase()));
        return !isBlacklisted;
      });

      // Pass the 2 seconds timeout to the heuristic
      const result = findCombinationHeuristic(filteredProducts, targetPrice, inventory, 2000, quantityLimit);
      
      if (result) {
        let isStockValid = true;
        for (const code in result.quantity) {
          const requestedQty = result.quantity[code];
          const availableStock = inventory[code];
          if (requestedQty > availableStock + 0.001) {
            isStockValid = false;
            console.warn(`Stock validation failed for product code ${code}. Requested: ${requestedQty}, Available: ${availableStock}`);
            break;
          }
        }

        if (isStockValid) {
          const resultWithOriginalProducts = {
            ...result,
            products: result.products.map(p => {
              const originalProduct = df.find((op: any) => op.code === p.code);
              return {
                ...originalProduct,
                usedQuantity: result.quantity[p.code]
              };
            })
          };
          self.postMessage({ type: 'result', result: resultWithOriginalProducts.products });
        } else {
          self.postMessage({ type: 'result', result: null });
        }
      } else {
        self.postMessage({ type: 'result', result: null });
      }
    } catch (error) {
      console.error('Error in combination worker:', error);
      self.postMessage({ type: 'error', error: (error as Error).message });
    }
  }
};

