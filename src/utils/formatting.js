import { CITIES, TRANSIT_LINES, TRAVEL_TYPES } from '../constants.js';
import { getDist } from './pathfinding.js';

// =========================================================================
// TID
// =========================================================================

export const formatTime = (t) => {
    const hours = Math.floor(t / 60) % 24;
    const minutes = Math.round(t % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

// =========================================================================
// STOP-INFO (pris og varighed for en given afgang til et givent stop)
// =========================================================================

export const calculateStopInfo = (dep, targetStop, startCity) => {
  const line = TRANSIT_LINES.find((l) => l.name === dep.lineName);
  if (!line) return { price: 0, duration: 0, route: [] };

  const startIndex = line.cities.indexOf(startCity);
  const stopIndex = line.cities.indexOf(targetStop);

  // Find ud af om vi skal læse by-listen forfra eller bagfra
  const isForward = stopIndex > startIndex;
  const route = isForward
    ? line.cities.slice(startIndex, stopIndex + 1)
    : line.cities.slice(stopIndex, startIndex + 1).reverse();

  let dist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const p1 = CITIES[route[i]]?.pos;
    const p2 = CITIES[route[i + 1]]?.pos;
    if (p1 && p2) dist += getDist(p1, p2);
  }

  const config = TRAVEL_TYPES[dep.type] || TRAVEL_TYPES.bus;
  const duration = (dist / config.speed) * 60;
  const price = Math.round(config.baseCost + dist * config.costPerKm);

  return { price, duration, route };
};

// =========================================================================
// LINJE-OFFSETS (til Leaflet.PolylineOffset — adskiller overlappende linjer)
// =========================================================================

export const calcLineOffsets = (cityName) => {
    const segmentLines = {}; // segmentKey → [linje1, linje2, ...]

    TRANSIT_LINES.filter(
      (l) => l.type !== "flight" && l.cities.includes(cityName),
    ).forEach((line) => {
      const cityIndex = line.cities.indexOf(cityName);
      const allCities = line.cities;

      // Alle segmenter på hele linjen (ikke kun fra byen)
      for (let i = 0; i < allCities.length - 1; i++) {
        const key = [allCities[i], allCities[i + 1]].sort().join("__");
        if (!segmentLines[key]) segmentLines[key] = [];
        if (!segmentLines[key].find((l) => l.name === line.name)) {
          segmentLines[key].push(line);
        }
      }
    });

    // For hvert segment: fordel offset symmetrisk
    // 1 linje → offset 0, 2 linjer → -4 og +4, 3 linjer → -4, 0, +4 osv.
    const OFFSET_STEP = 4; // pixels mellem linjer
    const segmentOffsets = {}; // `${segmentKey}__${lineName}` → offset i pixels

    Object.entries(segmentLines).forEach(([segKey, lines]) => {
      const count = lines.length;
      const start = -((count - 1) / 2) * OFFSET_STEP;
      lines.forEach((line, i) => {
        segmentOffsets[`${segKey}__${line.name}`] = start + i * OFFSET_STEP;
      });
    });

    return segmentOffsets;
  };