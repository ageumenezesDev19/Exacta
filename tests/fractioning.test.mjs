import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

async function loadFractioningModule() {
  const outdir = await mkdtemp(join(tmpdir(), 'despensa-fractioning-'));
  const outfile = join(outdir, 'fractioning.mjs');
  await build({
    entryPoints: ['src/utils/fractioning.ts'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
  });
  return import(pathToFileURL(outfile).href);
}

const rule = (kind, value, enabled = true) => ({ id: `${kind}-${value}`, kind, value, enabled });
const product = (unitOut, description = 'Produto') => ({ unitOut, description });

test('a unit rule matches the unit exactly, in any case', async () => {
  const { compileFractioning } = await loadFractioningModule();
  const isFractional = compileFractioning([rule('unit', 'KG')]);

  assert.equal(isFractional(product('KG')), true);
  assert.equal(isFractional(product('kg')), true);
  assert.equal(isFractional(product('KGS')), false);
  assert.equal(isFractional(product('UN')), false);
});

test('a disabled rule matches nothing', async () => {
  const { compileFractioning } = await loadFractioningModule();
  const isFractional = compileFractioning([rule('unit', 'KG', false), rule('name', 'Tela', false)]);

  assert.equal(isFractional(product('KG')), false);
  assert.equal(isFractional(product('UN', 'TELA MOSQUITEIRO')), false);
});

test('a name rule matches whole words, ignoring case and accents', async () => {
  const { compileFractioning } = await loadFractioningModule();
  const isFractional = compileFractioning([rule('name', 'Tela'), rule('name', 'Ração')]);

  assert.equal(isFractional(product('UN', 'TELA MOSQUITEIRO 1,5M')), true);
  assert.equal(isFractional(product('UN', 'tela galvanizada')), true);
  assert.equal(isFractional(product('UN', 'RACAO FRANGO ENGORDA 40KG')), true);
  assert.equal(isFractional(product('UN', 'CASTELA')), false);
  assert.equal(isFractional(product('UN', 'TELADO')), false);
});

test('a name rule with several words matches them in sequence', async () => {
  const { compileFractioning } = await loadFractioningModule();
  const isFractional = compileFractioning([rule('name', 'tela mosquiteiro')]);

  assert.equal(isFractional(product('UN', 'TELA MOSQUITEIRO 1,5M')), true);
  assert.equal(isFractional(product('UN', 'TELA GALVANIZADA')), false);
});

test('the default rules fraction the same units the old substring rule did', async () => {
  const { compileFractioning, defaultRules } = await loadFractioningModule();
  const stock = ['KG', 'KGS', 'UN', 'PC', 'LTS', 'SC', 'CX'].map(unit => product(unit));
  const oldRule = unit => ['kg', 'kilo', 'sc', 'saco', 'fdo', 'fd', 'sh', 'lt', 'litro'].some(t => unit.toLowerCase().includes(t));

  const isFractional = compileFractioning(defaultRules(stock));

  for (const p of stock) {
    assert.equal(isFractional(p), oldRule(p.unitOut), p.unitOut);
  }
});

test('the default rules list each unit once', async () => {
  const { defaultRules } = await loadFractioningModule();
  const rules = defaultRules([product('KG'), product('kg'), product('KGS'), product('KGS')]);
  const values = rules.map(r => r.value);

  assert.equal(new Set(values).size, values.length);
  assert.ok(values.includes('KGS'));
});

const priced = (salePrice, extra = {}) => ({ unitOut: 'KG', description: 'Produto', salePrice, quantity: 10, fractional: true, ...extra });

test('the automatic cutoff is the median price of one unit of a fractional product', async () => {
  const { automaticCutoff } = await loadFractioningModule();

  assert.equal(automaticCutoff([priced(2), priced(18), priced(40)]), 18);
  assert.equal(automaticCutoff([priced(2), priced(18), priced(19), priced(40)]), 18.5);
});

// A run of whole items at one price (35 seeds at R$ 5,12 in a real stock) dragged a
// whole-item median down until almost every value counted as high.
test('the automatic cutoff ignores whole, unpriced and out-of-stock products', async () => {
  const { automaticCutoff } = await loadFractioningModule();

  assert.equal(automaticCutoff([
    priced(18),
    ...Array.from({ length: 35 }, () => priced(5.12, { fractional: false })),
    priced(0),
    priced(90, { quantity: 0 }),
  ]), 18);
});

test('with no fractional products there is no cutoff, and every value is low', async () => {
  const { automaticCutoff, valueBand } = await loadFractioningModule();

  assert.equal(automaticCutoff([priced(9, { fractional: false })]), null);
  assert.equal(valueBand(1000, null), 'low');
});

test('values below the cutoff are low, from the cutoff up they are high', async () => {
  const { valueBand } = await loadFractioningModule();

  assert.equal(valueBand(5.99, 6), 'low');
  assert.equal(valueBand(6, 6), 'high');
  assert.equal(valueBand(100, 6), 'high');
});
