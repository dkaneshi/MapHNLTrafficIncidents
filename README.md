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
  - If the full address isn't found, the app tries the street alone, then the area name. Those pins are faded with a dashed outline and marked "Approximate location" in their popup.
  - Found locations are cached in the browser's localStorage, so reloads are fast and each refresh only looks up new addresses. The first load takes a few minutes while every address is located.
- **Map:** [Leaflet](https://leafletjs.com/) with OpenStreetMap tiles. Pins are colour-coded by incident type. Incidents at the same location share one numbered marker whose popup lists them all.

## Limitations

- Addresses the geocoder can't place at all are left off the map and counted as "not found".
- Freeway entries (e.g. `200 H1E FWY`) usually fall back to the area, so several of them can stack into one approximate marker.
- If Nominatim changes its rules or rate limits, pins stop appearing even though the data still loads.

## Files

- `index.html` – the whole app.
- `.claude/launch.json` – local preview server config for Claude Code.
