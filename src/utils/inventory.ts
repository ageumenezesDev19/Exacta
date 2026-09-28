// src/utils/inventory.ts

// Define the product interface based on db_utils.ts and python script
// Supports both old format (Und, ST) and new format (unitOut, csosn, elo)
export interface Product {
  code: string;
  barcode: string;
  description: string;
  unitOut?: string;
  unit?: string;
  supplier: string;
  quantity: number;
  costPrice: number;
  profitMargin: number;
  salePrice: number;
  csosn?: string;
  st?: string;
  elo?: string;
}

export interface FlaggedProduct {
  code: string;
  description: string;
  flaggedAt: string; // ISO date string
}

export interface ProfileSettings {
  flagFunctionEnabled: boolean;
  quantityLimit?: number; // undefined = sem limite
  filterByCsosn?: boolean; // true = só importa produtos com CSOSN 500
  singleProductResultEnabled?: boolean; // true = retorna apenas um produto por valor
}

/** The smallest fraction the register takes; stock kept finer than this drifts on every withdrawal. */
export const roundToThousandth = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * Withdraws a product from the stock.
 * This is a placeholder and needs to be implemented with proper state management.
 * @param code - The code of the product to withdraw.
 * @param quantity - The quantity to withdraw.
 * @returns An object with the status of the operation.
 */
export async function withdrawProduct(code: string, quantity: number): Promise<{ status: string }> {
    // This function needs to be adapted to work in the browser context.
    // It will likely involve updating the state in React rather than directly modifying files.
    console.log(`Withdrawing ${quantity} of product ${code}`);
    // Placeholder for now
    return { status: 'ok' };
}
