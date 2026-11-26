// Geocoding shared by the page (index.html) and the scheduled job (scripts/geocode.mjs).
export const FEED = 'https://data.honolulu.gov/resource/ykb6-n5th.json?$limit=5000';
const OAHU = '-158.30,21.75,-157.60,21.25'; // Nominatim viewbox: left,top,right,bottom

export const keyOf = r => (r.address || '') + '|' + (r.area || '');

// "590560 Pupukea Rd" -> "59-560 Pupukea Rd" (Hawaii hyphenated house numbers); "Kam Hwy" -> "Kamehameha Hwy".
export function normalize(addr) {
  return addr.replace(/^(\d{2})(\d{4})\b/, (_, a, b) => `${a}-${+b}`).replace(/\bKam Hwy\b/i, 'Kamehameha Hwy');
}

// Full address first, then the first street with no number, then the area; the fallbacks are approximate.
function queries(r) {
  const full = normalize(r.address || '');
  const street = full.split('/')[0].replace(/^[\d-]+\s+/, '').trim();
  return [[full, false], [street, true], [r.area, true]].filter(([q]) => q);
}

let lastCall = 0;
async function nominatim(q, headers) {
  const wait = lastCall + 1100 - Date.now(); // max 1 request/second per Nominatim policy
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&viewbox=${OAHU}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('geocoder HTTP ' + res.status);
  const [hit] = await res.json();
  return hit ? [+hit.lat, +hit.lon] : null;
}

// Returns { ll: [lat, lon], approx } or null if nothing matched. Throws on network/HTTP errors so they aren't cached.
export async function geocode(r, headers) {
  for (const [q, approx] of queries(r)) {
    const ll = await nominatim(q, headers);
    if (ll) return { ll, approx };
  }
  return null;
}
