import { Product } from '../utils/inventory';

/**
 * A fictional shop's stock, so the app can be tried without importing a file —
 * and without anyone's real inventory ever leaving their machine. Every code,
 * barcode and supplier here is invented.
 *
 * Prices are chosen so the combination search has something to find: several
 * subsets add up to round targets like 50.00 and 100.00, which is what a first
 * time visitor is most likely to type.
 */
export const sampleProducts: Product[] = [
  { code: '1001', barcode: '7891000100011', description: 'Arroz branco tipo 1 — 5kg', unit: 'PC', supplier: 'Distribuidora Aurora', quantity: 42, costPrice: 18.5, profitMargin: 35, salePrice: 24.9 },
  { code: '1002', barcode: '7891000100028', description: 'Feijão carioca — 1kg', unit: 'PC', supplier: 'Distribuidora Aurora', quantity: 65, costPrice: 6.2, profitMargin: 40, salePrice: 8.5 },
  { code: '1003', barcode: '7891000100035', description: 'Açúcar refinado — 1kg', unit: 'PC', supplier: 'Distribuidora Aurora', quantity: 80, costPrice: 3.6, profitMargin: 38, salePrice: 5.0 },
  { code: '1004', barcode: '7891000100042', description: 'Café torrado e moído — 500g', unit: 'PC', supplier: 'Torrefação Monte Alto', quantity: 34, costPrice: 12.4, profitMargin: 45, salePrice: 17.9 },
  { code: '1005', barcode: '7891000100059', description: 'Óleo de soja — 900ml', unit: 'UN', supplier: 'Distribuidora Aurora', quantity: 58, costPrice: 5.1, profitMargin: 37, salePrice: 7.0 },
  { code: '1006', barcode: '7891000100066', description: 'Leite integral UHT — 1L', unit: 'CX', supplier: 'Laticínios Vale Verde', quantity: 96, costPrice: 3.9, profitMargin: 28, salePrice: 5.0 },
  { code: '1007', barcode: '7891000100073', description: 'Macarrão espaguete — 500g', unit: 'PC', supplier: 'Massas Bom Trigo', quantity: 73, costPrice: 3.2, profitMargin: 41, salePrice: 4.5 },
  { code: '1008', barcode: '7891000100080', description: 'Molho de tomate — 340g', unit: 'UN', supplier: 'Massas Bom Trigo', quantity: 61, costPrice: 2.3, profitMargin: 52, salePrice: 3.5 },
  { code: '1009', barcode: '7891000100097', description: 'Farinha de trigo — 1kg', unit: 'PC', supplier: 'Massas Bom Trigo', quantity: 47, costPrice: 4.1, profitMargin: 34, salePrice: 5.5 },
  { code: '1010', barcode: '7891000100103', description: 'Sal refinado — 1kg', unit: 'PC', supplier: 'Distribuidora Aurora', quantity: 88, costPrice: 1.4, profitMargin: 43, salePrice: 2.0 },
  { code: '2001', barcode: '7891000200018', description: 'Detergente neutro — 500ml', unit: 'UN', supplier: 'Higiene Clara', quantity: 54, costPrice: 1.9, profitMargin: 58, salePrice: 3.0 },
  { code: '2002', barcode: '7891000200025', description: 'Sabão em pó — 1kg', unit: 'PC', supplier: 'Higiene Clara', quantity: 39, costPrice: 9.8, profitMargin: 33, salePrice: 13.0 },
  { code: '2003', barcode: '7891000200032', description: 'Água sanitária — 2L', unit: 'UN', supplier: 'Higiene Clara', quantity: 44, costPrice: 4.6, profitMargin: 30, salePrice: 6.0 },
  { code: '2004', barcode: '7891000200049', description: 'Papel higiênico — 4 rolos', unit: 'PC', supplier: 'Higiene Clara', quantity: 67, costPrice: 6.5, profitMargin: 38, salePrice: 9.0 },
  { code: '2005', barcode: '7891000200056', description: 'Esponja multiuso — 3 un', unit: 'PC', supplier: 'Higiene Clara', quantity: 72, costPrice: 2.8, profitMargin: 43, salePrice: 4.0 },
  { code: '3001', barcode: '7891000300015', description: 'Refrigerante cola — 2L', unit: 'UN', supplier: 'Bebidas Sul', quantity: 51, costPrice: 6.1, profitMargin: 31, salePrice: 8.0 },
  { code: '3002', barcode: '7891000300022', description: 'Suco de uva integral — 1L', unit: 'UN', supplier: 'Bebidas Sul', quantity: 28, costPrice: 9.4, profitMargin: 38, salePrice: 13.0 },
  { code: '3003', barcode: '7891000300039', description: 'Água mineral sem gás — 1,5L', unit: 'UN', supplier: 'Bebidas Sul', quantity: 90, costPrice: 1.7, profitMargin: 47, salePrice: 2.5 },
  { code: '3004', barcode: '7891000300046', description: 'Cerveja pilsen lata — 350ml', unit: 'UN', supplier: 'Bebidas Sul', quantity: 120, costPrice: 2.9, profitMargin: 38, salePrice: 4.0 },
  { code: '4001', barcode: '7891000400012', description: 'Biscoito recheado — 140g', unit: 'PC', supplier: 'Doces Primavera', quantity: 84, costPrice: 2.1, profitMargin: 43, salePrice: 3.0 },
  { code: '4002', barcode: '7891000400029', description: 'Chocolate ao leite — 90g', unit: 'UN', supplier: 'Doces Primavera', quantity: 46, costPrice: 4.4, profitMargin: 36, salePrice: 6.0 },
  { code: '4003', barcode: '7891000400036', description: 'Bala de goma — 500g', unit: 'PC', supplier: 'Doces Primavera', quantity: 31, costPrice: 8.2, profitMargin: 34, salePrice: 11.0 },
  { code: '5001', barcode: '7891000500019', description: 'Pilha alcalina AA — 4 un', unit: 'PC', supplier: 'Eletro Ponto', quantity: 25, costPrice: 11.3, profitMargin: 42, salePrice: 16.0 },
  { code: '5002', barcode: '7891000500026', description: 'Lâmpada LED 9W', unit: 'UN', supplier: 'Eletro Ponto', quantity: 37, costPrice: 8.7, profitMargin: 38, salePrice: 12.0 },
  { code: '5003', barcode: '7891000500033', description: 'Fita isolante — 20m', unit: 'UN', supplier: 'Eletro Ponto', quantity: 43, costPrice: 5.2, profitMargin: 44, salePrice: 7.5 },
];
