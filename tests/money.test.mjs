import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

async function loadModule(entry) {
  // i18n.ts reads the saved language from localStorage at import time.
  globalThis.localStorage ??= { getItem: () => 'pt', setItem: () => {} };
  const outdir = await mkdtemp(join(tmpdir(), 'despensa-money-'));
  const outfile = join(outdir, 'module.mjs');
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
  });
  return import(pathToFileURL(outfile).href);
}

test('amount typed with a decimal comma is read as a decimal', async () => {
  const { parseAmount } = await loadModule('src/utils/money.ts');

  assert.equal(parseAmount('7,5'), 7.5);
  assert.equal(parseAmount(' 7,50 '), 7.5);
});

test('amount typed with a decimal point or as an integer is read as is', async () => {
  const { parseAmount } = await loadModule('src/utils/money.ts');

  assert.equal(parseAmount('7.5'), 7.5);
  assert.equal(parseAmount('10'), 10);
});

test('amount with thousands separators is read in the Brazilian format', async () => {
  const { parseAmount } = await loadModule('src/utils/money.ts');

  assert.equal(parseAmount('1.234,56'), 1234.56);
});

test('amount that is not a number is NaN', async () => {
  const { parseAmount } = await loadModule('src/utils/money.ts');

  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.ok(Number.isNaN(parseAmount('')));
});

test('stock arithmetic is kept to thousandths', async () => {
  const { roundToThousandth } = await loadModule('src/utils/inventory.ts');

  assert.equal(roundToThousandth(5468.838 - 0.048), 5468.79);
  assert.equal(roundToThousandth(0.1 + 0.2), 0.3);
});
