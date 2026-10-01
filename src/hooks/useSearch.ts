import { useState, useEffect } from 'react';
import { Product, FlaggedProduct, ProfileSettings } from '../utils/inventory';
import { findSingleProductResult, searchNearbyProduct } from '../utils/search';
import { applyPreferenceToProducts, recordIgnoredCombination } from '../utils/combinationLearning';
import { ProductWithQuantity } from '../context/InventoryContext';
import { parseAmount } from '../utils/money';
import { FractionRule, compileFractioning } from '../utils/fractioning';

export type SearchMode = 'combination' | 'product_price' | 'product_name';

interface SearchProps {
  products: Product[];
  blacklist: string[];
  flaggedProducts: FlaggedProduct[];
  price: string;
  searchMode: SearchMode;
  showNotification: (message: string) => void;
  activeProfileSettings: ProfileSettings;
  activeProfile: string;
  fractionRules: FractionRule[];
}

export const useSearch = ({ products, blacklist, flaggedProducts, price, searchMode, showNotification, activeProfileSettings, activeProfile, fractionRules }: SearchProps) => {
  const [searchResult, setSearchResult] = useState<{ status: string; products?: Product[]; combination?: ProductWithQuantity[]; target?: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [previouslyFound, setPreviouslyFound] = useState<Set<string>>(new Set());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (searching) {
      setShowCancel(false);
      timer = setTimeout(() => setShowCancel(true), 10000);
    } else {
      setShowCancel(false);
    }
    return () => clearTimeout(timer);
  }, [searching]);

  const handleCancelSearch = () => {
    setSearchCancelled(true);
    setSearching(false);
    showNotification("Busca cancelada.");
  };

  const handleRecalculate = () => {
    if (!searchResult) return;

    const newPreviouslyFound = new Set(previouslyFound);

    if (searchResult.combination) {
      recordIgnoredCombination(activeProfile, searchResult.combination);
      searchResult.combination.forEach((p: Product) => newPreviouslyFound.add(p.code));
    } else if (searchResult.products) {
      searchResult.products.forEach((p: Product) => newPreviouslyFound.add(p.code));
    }

    setPreviouslyFound(newPreviouslyFound);
    handleSearch(true, newPreviouslyFound);
  };

  const handleSearch = async (isRecalculation = false, previouslyFoundSet: Set<string> | null = null) => {
    if (!price) return;

    if (!isRecalculation) {
      setPreviouslyFound(new Set());
    }

    setSearching(true);
    setSearchCancelled(false);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    if (searchCancelled) {
      setSearching(false);
      return;
    }

    const flaggedCodes = new Set(flaggedProducts.map(f => f.code));
    const currentPreviouslyFound = previouslyFoundSet || previouslyFound;

    if (searchMode === 'product_name' || searchMode === 'product_price') {
      let foundProducts: Product[] = [];

      if (searchMode === 'product_name') {
        const searchTerm = price.toLowerCase();
        foundProducts = products.filter(p => {
          const isBlacklisted = blacklist.some((term: string) => p.description.toLowerCase().includes(term.toLowerCase()) || p.code.toLowerCase().includes(term.toLowerCase()));
          return p.description.toLowerCase().includes(searchTerm) && !isBlacklisted && !flaggedCodes.has(p.code);
        }).slice(0, 20); // Limit to 20 results
      } else { // product_price
        const desiredPrice = parseAmount(price);
        const unflaggedProducts = products.filter(p => !flaggedCodes.has(p.code) && !currentPreviouslyFound.has(p.code));
        const foundProduct = searchNearbyProduct(unflaggedProducts, desiredPrice, blacklist);
        if (foundProduct) {
          foundProducts = [foundProduct];
        }
      }

      if (searchCancelled) {
        setSearching(false);
        return;
      }
      if (foundProducts.length > 0) {
        setSearchResult({ status: 'ok', products: foundProducts });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    } else { // searchMode === 'combination'
      const desiredPrice = parseAmount(price);
      if (isNaN(desiredPrice)) {
        showNotification("Preço inválido para busca de combinação.");
        setSearching(false);
        return;
      }

      const isFractional = compileFractioning(fractionRules);
      const withFractioning = <T extends Product>(list: T[]) => list.map(p => ({ ...p, fractional: isFractional(p) }));

      if (activeProfileSettings.singleProductResultEnabled) {
        const singleProductResult = findSingleProductResult(withFractioning(applyPreferenceToProducts(activeProfile, products)), desiredPrice, {
          blacklist,
          flaggedCodes,
          previouslyFound: currentPreviouslyFound,
          quantityLimit: activeProfileSettings.quantityLimit,
        });

        if (singleProductResult) {
          setSearchResult({ status: 'ok', combination: [singleProductResult], target: desiredPrice });
        } else {
          setSearchResult({ status: 'not_found' });
        }
        setSearching(false);
        return;
      }

      // Removed fast-path for combination to allow full search

      // Heuristic candidate filtering to keep worker input small and fast:
      // - exclude previously found and blacklisted
      // - require in-stock
      // - sort by price desc (no limit for super search)
      const allProducts = products;
      const afterPreviouslyFound = allProducts.filter(p => !currentPreviouslyFound.has(p.code));
      const afterStock = afterPreviouslyFound.filter(p => p.quantity >= 0.001);
      const afterFlagged = afterStock.filter(p => !flaggedCodes.has(p.code));
      const afterBlacklist = afterFlagged.filter(p => !blacklist.some(term => p.description.toLowerCase().includes(term.toLowerCase()) || p.code.toLowerCase().includes(term.toLowerCase())));
      const afterPrice = afterBlacklist.filter(p => (p.salePrice ?? 0) > 0);
      const candidates = withFractioning(applyPreferenceToProducts(activeProfile, afterPrice)).sort((a, b) => {
        const priceDiff = (b.salePrice ?? 0) - (a.salePrice ?? 0);
        if (priceDiff !== 0) return priceDiff;
        const preferenceDiff = b.preferenceScore - a.preferenceScore;
        if (preferenceDiff !== 0) return preferenceDiff;
        return a.code.localeCompare(b.code);
      });

      console.log(`[useSearch] Filter breakdown: total=${allProducts.length}, afterPrevFound=${afterPreviouslyFound.length}, afterStock=${afterStock.length}, afterFlagged=${afterFlagged.length}, afterBlacklist=${afterBlacklist.length}, afterPrice=${afterPrice.length}, final=${candidates.length}`);

      const filteredProducts = candidates;

      console.log(`[useSearch] After filters: ${filteredProducts.length} candidates for ${desiredPrice}`);

      const worker = new Worker(new URL('../workers/combinationWorker.ts', import.meta.url), { type: 'module' });
      let workerResult: ProductWithQuantity[] | null = null;

      const workerPromise = new Promise<ProductWithQuantity[] | null>((resolve) => {
        worker.onmessage = (event) => {
          const { type, result, error } = event.data;
          if (type === 'result') {
            resolve(result);
          } else if (type === 'cancelled') {
            resolve(null);
          } else if (type === 'error') {
            console.error("Worker error:", error);
            resolve(null);
          }
        };

        worker.postMessage({
          type: 'startSearch',
          payload: {
            df: filteredProducts,
            targetPrice: desiredPrice,
            tolerancia: 0.3,
            used: Array.from(currentPreviouslyFound),
            blacklist,
            quantityLimit: activeProfileSettings.quantityLimit,
          },
        });
      });

      const cancellationCheckInterval = setInterval(() => {
        if (searchCancelled) {
          worker.postMessage({ type: 'cancel' });
          clearInterval(cancellationCheckInterval);
        }
      }, 100);

      workerResult = await workerPromise;
      clearInterval(cancellationCheckInterval);
      worker.terminate();

      console.log(`[useSearch] Worker result:`, workerResult);

      if (searchCancelled) {
        setSearching(false);
        return;
      }

      if (workerResult && workerResult.length > 0) {
        const finalResult = workerResult.filter((p: any) => (p.usedQuantity ?? 0) >= 0.001);

        if (finalResult.length > 0) {
          setSearchResult({ status: 'ok', combination: finalResult, target: desiredPrice });
        } else {
          setSearchResult({ status: 'not_found' });
        }
      } else {
        setSearchResult({ status: 'not_found' });
      }
    }
    setSearching(false);
  };

  return {
    searchResult,
    setSearchResult,
    searching,
    showCancel,
    handleCancelSearch,
    handleRecalculate,
    handleSearch,
  };
};
