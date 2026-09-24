import i18n from "../i18n";

/** Two decimals in the interface language: 24,90 in Portuguese, 24.90 in English. */
export const money = (value: number) =>
  value.toLocaleString(i18n.language?.startsWith("pt") ? "pt-BR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
