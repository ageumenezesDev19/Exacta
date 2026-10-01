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
