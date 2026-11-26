// Geocoding shared by the page (index.html) and the scheduled job (scripts/geocode.mjs).
export const FEED = 'https://data.honolulu.gov/resource/ykb6-n5th.json?$limit=5000';
const OAHU = '-158.30,21.75,-157.60,21.25'; // Nominatim viewbox: left,top,right,bottom

export const keyOf = r => (r.address || '') + '|' + (r.area || '');

// "590560 Pupukea Rd" -> "59-560 Pupukea Rd" (Hawaii hyphenated house numbers); "Kam Hwy" -> "Kamehameha Hwy".
export function normalize(addr) {
  return addr.replace(/^(\d{2})(\d{4})\b/, (_, a, b) => `${a}-${+b}`).replace(/\bKam Hwy\b/i, 'Kamehameha Hwy');
}

// HPD area names that Nominatim misreads on their own.
const AREA_ALIASES = { 'Airport': 'Daniel K. Inouye International Airport', 'Moanalua V': 'Moanalua Valley',
                       'Sunset': 'Sunset Beach' };
const NEAR = 0.08; // degrees (~9 km): how far from the area's center an address may land

let lastCall = 0;
async function search(q, box, headers) {
  const wait = lastCall + 1100 - Date.now(); // max 1 request/second per Nominatim policy
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&viewbox=${box}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('geocoder HTTP ' + res.status);
  const [hit] = await res.json();
  return hit && { ll: [+hit.lat, +hit.lon], road: hit.class === 'highway' };
}

export const areas = new Map(); // area name -> center [lat, lon] or null
export async function areaCenter(area, headers) {
  if (!areas.has(area)) areas.set(area, (await search(AREA_ALIASES[area] || area, OAHU, headers))?.ll ?? null);
  return areas.get(area);
}

// Looks up the address only near the incident's area, so a house number OSM doesn't know can't match the
// same road in another town. Returns { ll: [lat, lon], approx } or null; throws on network/HTTP errors so they aren't cached.
export async function geocode(r, headers) {
  const c = r.area ? await areaCenter(r.area, headers) : null;
  const box = c ? [c[1] - NEAR, c[0] + NEAR, c[1] + NEAR, c[0] - NEAR].map(n => +n.toFixed(4)).join() : OAHU;
  const full = normalize(r.address || '');
  const street = full.split('/')[0].replace(/^[\d-]+\s+/, '').trim(); // first street of an intersection, no number
  for (const q of new Set([full, street].filter(Boolean))) {
    const hit = await search(q, box, headers);
    if (!hit) continue;
    // A road match is placed mid-segment, which can lie well outside the area; then the area's center is closer.
    if (hit.road && c && Math.hypot(hit.ll[0] - c[0], hit.ll[1] - c[1]) > NEAR) break;
    return { ll: hit.ll, approx: hit.road || q !== full }; // a whole-road match only says "somewhere on this road"
  }
  return c && { ll: c, approx: true };
}
