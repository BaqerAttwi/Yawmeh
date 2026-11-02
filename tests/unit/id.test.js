import test from 'node:test';
import assert from 'node:assert/strict';
import {randomId} from '../../shared/id.js';

test('IDs work on HTTP origins with no randomUUID', () => {
  const httpCrypto = {getRandomValues: bytes => globalThis.crypto.getRandomValues(bytes)};
  const ids = Array.from({length:100}, () => randomId(httpCrypto));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('uses native randomUUID when available', () => {
  assert.equal(randomId({randomUUID: () => 'native-id'}), 'native-id');
});
