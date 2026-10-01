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

const whole = (code, salePrice, extra = {}) => ({ ...baseProduct, code, description: `Inteiro ${code}`, unitOut: 'UN', salePrice, quantity: 100, ...extra });
const loose = (code, salePrice, extra = {}) => ({ ...baseProduct, code, description: `Granel ${code}`, unitOut: 'KG', fractional: true, salePrice, quantity: 100, ...extra });

test('a high value prefers a whole product that closes it over a fractional one', async () => {
  const { findSingleProductResult } = await loadSearchModule();

  const result = findSingleProductResult([loose('Q', 42.9), whole('S', 2)], 100, { cutoff: 6 });

  assert.equal(result?.code, 'S');
  assert.equal(result?.usedQuantity, 50);
  assert.equal(result?.differenceCents, 0);
});

test('a high value with no exact whole product falls short with the nearest whole product, never a large fraction', async () => {
  const { findSingleProductResult } = await loadSearchModule();

  const result = findSingleProductResult([loose('Q', 42.9), whole('A', 24.9), whole('B', 30)], 100, { cutoff: 6 });

  assert.equal(result?.code, 'A');
  assert.equal(result?.usedQuantity, 4);
  assert.equal(result?.total, 99.6);
});

test('a high value with nothing whole below it still returns a result', async () => {
  const { findSingleProductResult } = await loadSearchModule();

  const result = findSingleProductResult([loose('Q', 42.9), whole('B', 300)], 100, { cutoff: 6 });

  assert.ok(result);
});

test('a low value prefers a fractional product over a whole one that closes it too', async () => {
  const { findSingleProductResult } = await loadSearchModule();

  const result = findSingleProductResult([whole('U', 4), loose('Q', 40)], 4, { cutoff: 6 });

  assert.equal(result?.code, 'Q');
  assert.equal(result?.differenceCents, 0);
});

test('within the preferred kind the learned ranking still breaks ties', async () => {
  const { findSingleProductResult } = await loadSearchModule();

  const result = findSingleProductResult([
    whole('A', 10, { preferenceScore: 0 }),
    whole('B', 10, { preferenceScore: 5 }),
    loose('Q', 42.9),
  ], 50, { cutoff: 6 });

  assert.equal(result?.code, 'B');
});
