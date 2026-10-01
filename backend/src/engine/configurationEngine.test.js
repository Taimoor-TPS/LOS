import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLayers } from './configurationEngine.js';

test('more specific configuration overrides the jurisdiction pack', () => {
  const entries = [
    { status: 'active', version: 1, scope: { level: 'system' }, value: { maxDbr: 0.5, minAge: 18 } },
    { status: 'active', version: 1, scope: { level: 'jurisdiction', jurisdiction: 'PK' }, value: { maxDbr: 0.4, authority: 'SBP' } },
    { status: 'active', version: 2, scope: { level: 'jurisdiction', jurisdiction: 'PK' }, value: { maxDbr: 0.42 } },
    { status: 'active', version: 1, scope: { level: 'product', productCode: 'HOME_DM' }, value: { maxDbr: 0.5 } },
    { status: 'draft', version: 9, scope: { level: 'product', productCode: 'HOME_DM' }, value: { maxDbr: 0.9 } },
  ];

  const personal = resolveLayers(entries, { jurisdiction: 'PK', productCode: 'PF_CONV' });
  assert.equal(personal.value.maxDbr, 0.42);
  assert.equal(personal.value.minAge, 18);
  assert.equal(personal.chain.length, 2);

  const home = resolveLayers(entries, { jurisdiction: 'PK', productCode: 'HOME_DM' });
  assert.equal(home.value.maxDbr, 0.5);
  assert.equal(home.value.authority, 'SBP');
});
