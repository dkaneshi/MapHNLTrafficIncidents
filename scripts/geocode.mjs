// Geocodes the current feed into geocodes.json so browsers don't each hit Nominatim.
// Keeps only entries for addresses in the current feed; writes the file only when it changes.
import { readFile, writeFile } from 'node:fs/promises';
import { FEED, keyOf, geocode, areas } from '../geo.js';

const OUT = new URL('../geocodes.json', import.meta.url);
const UA = { 'User-Agent': 'MapHNLTrafficIncidents (https://github.com/dkaneshi/MapHNLTrafficIncidents)' };

const old = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));
const res = await fetch(FEED);
if (!res.ok) throw new Error('feed HTTP ' + res.status);
const rows = await res.json();

const next = {};
let looked = 0, failed = 0;
for (const r of rows) {
  const k = keyOf(r);
  if (k in next) continue;
  if (k in old) { next[k] = old[k]; continue; }
  try { next[k] = await geocode(r, UA); looked++; }
  catch (e) { failed++; console.warn(k, e.message); } // not cached; retried next run
}

const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
const text = JSON.stringify(sorted, null, 1) + '\n';
if (text !== JSON.stringify(old, null, 1) + '\n') await writeFile(OUT, text);
console.log(`${rows.length} rows, ${Object.keys(next).length} locations, ${looked} looked up, ${failed} failed`);
for (const [a, c] of areas) console.log('area', a, JSON.stringify(c)); // areas looked up this run
