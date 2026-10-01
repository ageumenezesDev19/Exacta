import { Product, roundToThousandth } from './inventory';
import { valueBand } from './fractioning';

interface ProductWithDifference extends Product {
  Difference?: number;
}

export interface SingleProductResult extends Product {
  usedQuantity: number;
  total: number;
  differenceCents: number;
  preferenceScore?: number;
}

interface SingleProductSearchOptions {
  blacklist?: string[];
  flaggedCodes?: Set<string>;
  previouslyFound?: Set<string>;
  quantityLimit?: number;
  /** Splits low from high values; undefined keeps the plain closest-total ordering. */
  cutoff?: number | null;
}

const isBlacklisted = (product: Product, blacklist: string[]): boolean => {
  return blacklist.some(term =>
    product.description.toLowerCase().includes(term.toLowerCase()) ||
    product.code.toLowerCase().includes(term.toLowerCase())
  );
};

const floorToThousandth = (value: number): number => Math.floor(value * 1000) / 1000;

const ceilToThousandth = (value: number): number => Math.ceil(value * 1000) / 1000;

const byClosestThenRanking = (a: SingleProductResult, b: SingleProductResult): number =>
  a.differenceCents - b.differenceCents ||
  a.usedQuantity - b.usedQuantity ||
  (b.preferenceScore ?? 0) - (a.preferenceScore ?? 0) ||
  a.code.localeCompare(b.code);

const minBy = <T>(items: T[], compare: (a: T, b: T) => number): T | undefined =>
  items.reduce<T | undefined>((best, item) => (best === undefined || compare(item, best) < 0 ? item : best), undefined);

/**
 * Low values put fractional products first; high values keep whole ones and, when none closes
 * exactly, fall short rather than over so a fraction can complete the rest. The learned ranking
 * still decides between candidates of the same kind and distance.
 */
const pickBest = (
  candidates: SingleProductResult[],
  targetCents: number,
  cutoff: number | null | undefined
): SingleProductResult | undefined => {
  if (cutoff === undefined) return minBy(candidates, byClosestThenRanking);

  if (valueBand(targetCents / 100, cutoff) === 'low') {
    return minBy(candidates, (a, b) =>
      a.differenceCents - b.differenceCents ||
      Number(!a.fractional) - Number(!b.fractional) ||
      byClosestThenRanking(a, b)
    );
  }

  const cutoffCents = Math.round((cutoff ?? 0) * 100);
  const allowed = candidates.filter(c => !c.fractional || Math.round(c.total * 100) <= cutoffCents);
  if (allowed.length === 0) return minBy(candidates, byClosestThenRanking);
  const isOver = (c: SingleProductResult) => Number(Math.round(c.total * 100) > targetCents);
  return minBy(allowed, (a, b) => isOver(a) - isOver(b) || byClosestThenRanking(a, b));
};

export function findSingleProductResult(
  df: Product[],
  desiredPrice: number,
  options: SingleProductSearchOptions = {}
): SingleProductResult | undefined {
  const targetCents = Math.round(desiredPrice * 100);
  if (!Number.isFinite(targetCents) || targetCents <= 0) return undefined;

  const blacklist = options.blacklist ?? [];
  const flaggedCodes = options.flaggedCodes ?? new Set<string>();
  const previouslyFound = options.previouslyFound ?? new Set<string>();
  const quantityLimit = options.quantityLimit;

  const candidates: SingleProductResult[] = [];

  for (const product of df) {
    if (previouslyFound.has(product.code)) continue;
    if (flaggedCodes.has(product.code)) continue;
    if (isBlacklisted(product, blacklist)) continue;

    const stock = Number(product.quantity);
    const salePrice = Number(product.salePrice);
    if (!Number.isFinite(stock) || stock < 0.001) continue;
    if (!Number.isFinite(salePrice) || salePrice <= 0) continue;

    const priceCents = Math.round(salePrice * 100);
    if (priceCents <= 0) continue;

    const maxQuantity = quantityLimit !== undefined
      ? Math.min(stock, quantityLimit)
      : stock;
    if (maxQuantity < 0.001) continue;

    const quantityCandidates = new Set<number>();

    if (product.fractional) {
      const idealQuantity = targetCents / priceCents;
      const cappedIdeal = Math.min(idealQuantity, maxQuantity);
      quantityCandidates.add(roundToThousandth(cappedIdeal));
      quantityCandidates.add(floorToThousandth(cappedIdeal));
      quantityCandidates.add(ceilToThousandth(cappedIdeal));
      quantityCandidates.add(floorToThousandth(maxQuantity));
    } else {
      const maxUnits = Math.floor(maxQuantity);
      if (maxUnits < 1) continue;
      const idealUnits = targetCents / priceCents;
      quantityCandidates.add(Math.max(1, Math.min(maxUnits, Math.floor(idealUnits))));
      quantityCandidates.add(Math.max(1, Math.min(maxUnits, Math.ceil(idealUnits))));
      quantityCandidates.add(maxUnits);
    }

    for (const rawQuantity of quantityCandidates) {
      const usedQuantity = product.fractional
        ? roundToThousandth(rawQuantity)
        : Math.floor(rawQuantity);
      if (usedQuantity < 0.001 || usedQuantity > maxQuantity + 0.0001) continue;

      const totalCents = Math.round(priceCents * usedQuantity);
      const candidate: SingleProductResult = {
        ...product,
        usedQuantity,
        total: totalCents / 100,
        differenceCents: Math.abs(totalCents - targetCents),
        preferenceScore: Number((product as Product & { preferenceScore?: number }).preferenceScore) || 0,
      };

      candidates.push(candidate);
    }
  }

  return pickBest(candidates, targetCents, options.cutoff);
}

export function searchNearbyProducts(df: Product[], desiredPrice: number, n = 3): Product[] | undefined {
  const filtered: ProductWithDifference[] = df.map(p => ({ ...p })).filter(p => p.quantity >= 0.001);
  if (filtered.length === 0) return undefined;
  filtered.forEach(p => p.Difference = Math.abs((p.salePrice ?? 0) - desiredPrice));
  return filtered.sort((a, b) => (a.Difference ?? 0) - (b.Difference ?? 0)).slice(0, n);
}

export function searchNearbyProduct(df: Product[], desiredPrice: number, blacklist: string[] = []): Product | undefined {
  let filtered: ProductWithDifference[] = df.map(p => ({ ...p })).filter(p => p.quantity >= 0.001);
  for (const term of blacklist) {
    filtered = filtered.filter(p =>
      !p.description.toLowerCase().includes(term.toLowerCase()) &&
      !p.code.toLowerCase().includes(term.toLowerCase())
    );
  }
  if (filtered.length === 0) return undefined;
  filtered.forEach(p => p.Difference = Math.abs((p.salePrice ?? 0) - desiredPrice));
  return filtered.sort((a, b) => (a.Difference ?? 0) - (b.Difference ?? 0))[0];
}
