# Honolulu Traffic Incidents Map

A single-page web app that plots live Honolulu traffic incidents on a map of Oahu.

**Live:** https://dkaneshi.github.io/MapHNLTrafficIncidents/

Data comes from the [Traffic Incidents](https://data.honolulu.gov/d/ykb6-n5th) dataset on data.honolulu.gov, which updates about every five minutes and covers roughly the last day. The app reloads the data every five minutes and redraws the map. It stores no incident data.

## Run it

Serve the folder over HTTP (opening the file directly may be blocked by the geocoder):

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## How it works

- **Data:** fetched straight from the dataset's public API (`https://data.honolulu.gov/resource/ykb6-n5th.json`).
- **Locations:** the dataset has addresses but no coordinates, so each address is looked up with [OpenStreetMap Nominatim](https://nominatim.org/), limited to Oahu and to one request per second, as the service's usage policy requires.
  - Hawaii house numbers are rewritten before lookup (`590560 Pupukea Rd` → `59-560 Pupukea Rd`), and `Kam Hwy` becomes `Kamehameha Hwy`.
  - The incident's area (e.g. `Kahuku`) is located first, and the address is searched only within about 9 km of it. OpenStreetMap lacks most house numbers, so without this an address like `57-419 Kamehameha Hwy` would land on the same highway in a different town.
  - If the full address isn't found, the app tries the street alone, then falls back to the area's center. These pins, and any match that is a whole road rather than an address point, are faded with a dashed outline and marked "Approximate location" in their popup.
  - A few HPD area names that OpenStreetMap misreads (`Airport`, `Moanalua V`, `Sunset`) are mapped to clearer names in `geo.js`.
  - A scheduled GitHub Action ([.github/workflows/geocode.yml](.github/workflows/geocode.yml)) runs [scripts/geocode.mjs](scripts/geocode.mjs) every 5 minutes. It looks up any new addresses in the feed, keeps only the current ones, and commits `geocodes.json` when it changes, which republishes the site.
  - The page loads `geocodes.json` first, so visitors normally make no geocoding requests. Scheduled runs are often delayed, so the page itself looks up any incident newer than the file and caches the result in the browser's localStorage.
- **Map:** [Leaflet](https://leafletjs.com/) with OpenStreetMap tiles. Pins are colour-coded by incident type; tick or untick a type in the legend to show or hide it. Incidents at the same location share one numbered marker whose popup lists them all.

## Limitations

- Addresses the geocoder can't place at all are left off the map and counted as "not found".
- Freeway entries (e.g. `200 H1E FWY`) usually fall back to the area, so several of them can stack into one approximate marker.
- If Nominatim changes its rules or rate limits, new pins stop appearing even though the data still loads.
- GitHub disables scheduled workflows in a public repo after 60 days without repository activity; re-enable it from the Actions tab if that happens.

## Files

- `index.html` – the page.
- `geo.js` – address cleanup and geocoding, shared by the page and the scheduled job.
- `geocodes.json` – precomputed locations, written by the scheduled job.
- `scripts/geocode.mjs` – the scheduled job; run `node scripts/geocode.mjs` to refresh it by hand.
- `scripts/geo.test.mjs` – tests; run `node --test`.
- `.claude/launch.json` – local preview server config for Claude Code.
