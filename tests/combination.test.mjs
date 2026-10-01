import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

async function loadWorkerModule() {
  // The module registers self.onmessage on import; outside a worker there is no self.
  globalThis.self ??= { postMessage: () => {} };
  const outdir = await mkdtemp(join(tmpdir(), 'despensa-worker-'));
  const outfile = join(outdir, 'combinationWorker.mjs');
  await build({
    entryPoints: ['src/workers/combinationWorker.ts'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
  });
  return import(pathToFileURL(outfile).href);
}

const item = (code, price, fractional, inventory = 100) => ({ code, name: code, price, fractional, inventory, preferenceScore: 0 });
const inventoryOf = products => Object.fromEntries(products.map(p => [p.code, p.inventory]));
const fractionalCents = (combination, products) =>
  combination.products
    .filter(p => products.find(q => q.code === p.code).fractional)
    .reduce((acc, p) => acc + Math.round(p.price * 100 * combination.quantity[p.code]), 0);

test('a high value never lets fractional products carry more than the cutoff', async () => {
  const { findCombinationHeuristic } = await loadWorkerModule();
  const products = [item('QUEIJO', 42.9, true), item('RACAO', 12.5, true), item('ARROZ', 24.9, false), item('SAL', 2, false), item('MOLHO', 3.5, false)];

  // The search is randomised, so the bound has to hold on every run, not just one.
  for (let run = 0; run < 5; run++) {
    const result = findCombinationHeuristic(products, 100, inventoryOf(products), 40, undefined, 6);
    assert.ok(result);
    assert.ok(fractionalCents(result, products) <= 600, `run ${run}: ${fractionalCents(result, products)} cents fractional`);
  }
});

test('a high value with an exact whole-only combination takes it over one using a fraction', async () => {
  const { findCombinationHeuristic } = await loadWorkerModule();
  const products = [item('QUEIJO', 42.9, true), item('SAL', 2, false)];

  const result = findCombinationHeuristic(products, 100, inventoryOf(products), 40, undefined, 6);

  assert.equal(result.diff, 0);
  assert.equal(fractionalCents(result, products), 0);
});

test('a low value prefers a fractional product that closes it', async () => {
  const { findCombinationHeuristic } = await loadWorkerModule();
  const products = [item('UN', 4, false), item('GRANEL', 40, true)];

  const result = findCombinationHeuristic(products, 4, inventoryOf(products), 40, undefined, 6);

  assert.equal(result.diff, 0);
  assert.deepEqual(result.products.map(p => p.code), ['GRANEL']);
});
