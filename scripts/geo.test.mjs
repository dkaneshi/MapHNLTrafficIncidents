import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, keyOf, geocode } from '../geo.js';

test('normalize Hawaii addresses', () => {
  assert.equal(normalize('590560 Pupukea Rd'), '59-560 Pupukea Rd');
  assert.equal(normalize('460336 Kam Hwy'), '46-336 Kamehameha Hwy');
  assert.equal(normalize('4380 Lawehana St'), '4380 Lawehana St');
});

test('keyOf handles missing fields', () => {
  assert.equal(keyOf({ address: 'A St' }), 'A St|');
});

test('geocode searches near the area and flags road-only matches', async () => {
  const calls = [];
  globalThis.fetch = async url => {
    const q = new URL(url).searchParams;
    calls.push([q.get('q'), q.get('viewbox')]);
    const hit = { Kahuku: { lat: 21.68, lon: -157.95, class: 'place' },
                  '57-419 Kamehameha Hwy': { lat: 21.69, lon: -157.96, class: 'highway' } }[q.get('q')];
    return { ok: true, json: async () => (hit ? [hit] : []) };
  };
  assert.deepEqual(await geocode({ address: '570419 Kam Hwy', area: 'Kahuku' }),
                   { ll: [21.69, -157.96], approx: true });
  assert.equal(calls[1][1], '-158.03,21.76,-157.87,21.6'); // ±0.08° around Kahuku, not all of Oahu
  assert.deepEqual(await geocode({ address: 'Nowhere St', area: 'Kahuku' }), { ll: [21.68, -157.95], approx: true });
});
