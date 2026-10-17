import test from 'node:test';
import assert from 'node:assert/strict';
import { teamTokenStorage } from '../js/demo2-auth.js';
function memory() {
  const values = new Map();
  return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) };
}
test('remembered token restores after recreating store and stays scoped to backend', () => {
  const storage = memory();
  const first = teamTokenStorage(() => storage, 'https://team.example');
  assert.equal(first.load().token, '');
  assert.equal(first.save(' test-team-credential ', true), true);
  assert.equal(teamTokenStorage(() => storage, 'https://team.example/').load().token, 'test-team-credential');
  assert.equal(teamTokenStorage(() => storage, 'https://other.example').load().token, '');
});
test('forget and opt-out remove credential and persist preference', () => {
  const store = teamTokenStorage(() => memoryStore, 'https://team.example');
  const memoryStore = memory();
  store.save('test-team-credential', true);
  assert.equal(store.forget(), true);
  assert.deepEqual(store.load(), { available: true, remember: false, token: '' });
  store.save('do-not-save', false);
  assert.equal(store.load().token, '');
});
test('storage denial or malformed values fail without exposing credentials', () => {
  const denied = teamTokenStorage(() => { throw new Error('blocked'); }, 'https://team.example');
  assert.equal(denied.load().available, false);
  assert.equal(denied.save('test-team-credential', true), false);
  const broken = teamTokenStorage(() => ({ getItem: () => '{' }), 'https://team.example');
  assert.equal(broken.load().token, '');
});
