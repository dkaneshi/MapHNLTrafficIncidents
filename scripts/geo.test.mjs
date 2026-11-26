import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, keyOf } from '../geo.js';

test('normalize Hawaii addresses', () => {
  assert.equal(normalize('590560 Pupukea Rd'), '59-560 Pupukea Rd');
  assert.equal(normalize('460336 Kam Hwy'), '46-336 Kamehameha Hwy');
  assert.equal(normalize('4380 Lawehana St'), '4380 Lawehana St');
});

test('keyOf handles missing fields', () => {
  assert.equal(keyOf({ address: 'A St' }), 'A St|');
});
