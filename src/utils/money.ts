import i18n from "../i18n";

const locale = () => (i18n.language?.startsWith("pt") ? "pt-BR" : "en-US");

/** Two decimals in the interface language: 24,90 in Portuguese, 24.90 in English. */
export const money = (value: number) =>
  value.toLocaleString(locale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Stock in the interface language, never past thousandths: 5468,79 rather than 5468.790000000002. */
export const quantity = (value: number, minimumFractionDigits = 0) =>
  value.toLocaleString(locale(), {
    minimumFractionDigits,
    maximumFractionDigits: 3,
  });

/**
 * Reads an amount as the operator types it: "7,5", "7.5" or "1.234,56".
 * With a comma present, dots are thousands separators; without one, a dot is the decimal point.
 */
export const parseAmount = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return NaN;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  return Number(normalized);
};
