import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

async function loadSearchModule() {
  const outdir = await mkdtemp(join(tmpdir(), 'despensa-search-'));
  const outfile = join(outdir, 'search.mjs');
  await build({
    entryPoints: ['src/utils/search.ts'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
  });
  return import(pathToFileURL(outfile).href);
}

const baseProduct = {
  code: '000',
  barcode: '',
  description: 'Produto',
  unitOut: 'UND',
  supplier: '',
  quantity: 10,
  costPrice: 0,
  profitMargin: 0,
  salePrice: 1,
};

test('findSingleProductResult prefers an exact fractional total over a nearby unit price', async () => {
  const { findSingleProductResult } = await loadSearchModule();

  const result = findSingleProductResult([
    { ...baseProduct, code: 'A', description: 'Arroz KG', unitOut: 'KG', fractional: true, salePrice: 7.5, quantity: 5 },
    { ...baseProduct, code: 'B', description: 'Biscoito', unitOut: 'UND', salePrice: 14.9, quantity: 10 },
  ], 15, {});

  assert.equal(result?.code, 'A');
  assert.equal(result?.usedQuantity, 2);
  assert.equal(result?.total, 15);
  assert.equal(result?.differenceCents, 0);
});

test('findSingleProductResult skips previous, blacklisted, flagged, and out-of-stock products', async () => {
  const { findSingleProductResult } = await loadSearchModule();

  const result = findSingleProductResult([
    { ...baseProduct, code: 'A', description: 'Anterior', salePrice: 10, quantity: 5 },
    { ...baseProduct, code: 'B', description: 'Bloqueado especial', salePrice: 10, quantity: 5 },
    { ...baseProduct, code: 'C', description: 'Sinalizado', salePrice: 10, quantity: 5 },
    { ...baseProduct, code: 'D', description: 'Sem estoque', salePrice: 10, quantity: 0 },
    { ...baseProduct, code: 'E', description: 'Permitido', salePrice: 9, quantity: 5 },
  ], 10, {
    blacklist: ['bloqueado'],
    flaggedCodes: new Set(['C']),
    previouslyFound: new Set(['A']),
  });

  assert.equal(result?.code, 'E');
});

test('findSingleProductResult respects unit quantities and quantityLimit', async () => {
  const { findSingleProductResult } = await loadSearchModule();

  const result = findSingleProductResult([
    { ...baseProduct, code: 'A', description: 'Unidade', unitOut: 'UND', salePrice: 4, quantity: 10 },
  ], 20, {
    quantityLimit: 3,
  });

  assert.equal(result?.code, 'A');
  assert.equal(result?.usedQuantity, 3);
  assert.equal(result?.total, 12);
  assert.equal(result?.differenceCents, 800);
});
