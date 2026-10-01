// Which products may be withdrawn in fractions (0,048 KG) rather than whole units.

export interface FractionRule {
  id: string;
  kind: 'unit' | 'name';
  value: string;
  enabled: boolean;
}

interface FractionableProduct {
  unitOut?: string;
  unit?: string;
  description: string;
}

// Before the rules were editable a unit fractioned when it merely contained one of these, so
// "KGS" counted as KG. The defaults add such units from the stock so nothing changes until a rule is edited.
export const DEFAULT_UNITS = ['KG', 'KILO', 'SC', 'SACO', 'FDO', 'FD', 'SH', 'LT', 'LITRO'];

/** Upper case without accents, so "Ração" and "RACAO" are the same rule. */
export const normalizeRuleValue = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim().replace(/\s+/g, ' ');

export const ruleId = (kind: FractionRule['kind'], value: string): string =>
  `${kind}:${normalizeRuleValue(value)}`;

const unitOf = (product: FractionableProduct): string =>
  normalizeRuleValue(String(product.unitOut || product.unit || ''));

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wordPattern = (value: string): RegExp => {
  const words = normalizeRuleValue(value).split(' ').map(escapeRegExp);
  return new RegExp(`(^|[^A-Z0-9])${words.join('[^A-Z0-9]+')}([^A-Z0-9]|$)`);
};

export const compileFractioning = (rules: FractionRule[]) => {
  const units = new Set<string>();
  const names: RegExp[] = [];
  for (const rule of rules) {
    if (!rule.enabled || !normalizeRuleValue(rule.value)) continue;
    if (rule.kind === 'unit') units.add(normalizeRuleValue(rule.value));
    else names.push(wordPattern(rule.value));
  }

  return (product: FractionableProduct): boolean => {
    if (units.has(unitOf(product))) return true;
    if (names.length === 0) return false;
    const description = normalizeRuleValue(String(product.description || ''));
    return names.some(pattern => pattern.test(description));
  };
};

export const defaultRules = (products: FractionableProduct[]): FractionRule[] => {
  const values = new Set(DEFAULT_UNITS);
  const legacyExtras = new Set<string>();
  for (const product of products) {
    const unit = unitOf(product);
    if (unit && !values.has(unit) && DEFAULT_UNITS.some(fragment => unit.includes(fragment))) {
      legacyExtras.add(unit);
    }
  }
  return [...DEFAULT_UNITS, ...[...legacyExtras].sort()].map(value => ({
    id: ruleId('unit', value),
    kind: 'unit' as const,
    value,
    enabled: true,
  }));
};

export type ValueBand = 'low' | 'high';

interface PricedProduct {
  salePrice: number;
  quantity: number;
  fractional?: boolean;
}

/**
 * The typical price of one unit (a kilo, a bag) of a fractional product: up to about that much a
 * fractional portion is the natural answer. null when nothing fractions, so every value is low.
 */
export const automaticCutoff = (products: PricedProduct[]): number | null => {
  const prices = products
    .filter(p => p.fractional && Number(p.quantity) >= 0.001 && Number(p.salePrice) > 0)
    .map(p => Number(p.salePrice))
    .sort((a, b) => a - b);
  if (prices.length === 0) return null;
  const middle = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
  return Math.round(median * 100) / 100;
};

/** Low values prefer fractional products; high values prefer whole ones, a fraction only completing them. */
export const valueBand = (target: number, cutoff: number | null): ValueBand =>
  cutoff === null || target < cutoff ? 'low' : 'high';
