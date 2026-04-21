import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, appId } from "../firebase.js";
import { calculateDistance } from "./pathfinding.js";

// =========================================================================
// FLY — Matematisk storcirkel-bue med 40 punkter
// =========================================================================

export const calcFlightArc = (p1, p2) => {
  const steps = 40;
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    const lat = p1[0] + (p2[0] - p1[0]) * t;
    const lng = p1[1] + (p2[1] - p1[1]) * t;
    // Sinuskurve der løfter buen opad på midten (jo længere, jo højere bue)
    const dist = Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2),
    );
    const arcHeight = Math.sin(t * Math.PI) * (dist * 0.15);
    return [lat + arcHeight, lng];
  });
};

// =========================================================================
// TOG — BRouter følger faktiske jernbaneskinner
// =========================================================================

export const fetchBRouterRoute = async (startPos, endPos) => {
  const url = `https://brouter.de/brouter?lonlats=${startPos[1]},${startPos[0]}|${endPos[1]},${endPos[0]}&profile=rail&alternativeidx=0&format=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length === 0) return null;

    let path = coords.map((c) => [c[1], c[0]]);

    const BUFFER_KM = 0.05; // 300 meter buffer omkring stationer

    // Trim starten: find første punkt der er > 300m fra startPos
    let startIdx = 0;
    for (let i = 0; i < path.length; i++) {
      if (calculateDistance(path[i], startPos) > BUFFER_KM) {
        startIdx = i;
        break;
      }
    }

    // Trim slutningen: find sidste punkt der er > 300m fra endPos
    let endIdx = path.length - 1;
    for (let i = path.length - 1; i >= 0; i--) {
      if (calculateDistance(path[i], endPos) > BUFFER_KM) {
        endIdx = i;
        break;
      }
    }

    // Byg den endelige sti:
    // startPos → første BRouter-punkt uden for buffer → ... → sidste punkt uden for buffer → endPos
    path = [startPos, ...path.slice(startIdx, endIdx + 1), endPos];

    const distKm = (data.features[0].properties?.["track-length"] || 0) / 1000;
    return { path, distance: distKm };
  } catch {
    return null;
  }
};

// =========================================================================
// BUS / TAXA / GÅ — OSRM (driving eller foot profil)
// =========================================================================

export const fetchOSRMDriving = async (
  startPos,
  endPos,
  profile = "driving",
) => {
  const url = `https://router.project-osrm.org/route/v1/${profile}/${startPos[1]},${startPos[0]};${endPos[1]},${endPos[0]}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok") return null;
    // GeoJSON returnerer [lng, lat] — vi vender om til [lat, lng]
    const path = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
    const distKm = data.routes[0].distance / 1000;
    return { path, distance: distKm };
  } catch {
    OPEN;
    return null;
  }
};

// Ældre polyline-variant (bruges nogle steder i koden endnu)
export const fetchOSRMRoute = async (startPos, endPos, mode = "driving") => {
  const profile = mode === "walking" ? "foot" : "driving";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${startPos[1]},${startPos[0]};${endPos[1]},${endPos[0]}?overview=full&geometries=polyline`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.code === "Ok"
      ? {
          path: data.routes[0].geometry,
          distance: data.routes[0].distance / 1000,
          duration: data.routes[0].duration / 60,
        }
      : null;
  } catch (err) {
    return null;
  }
};

// =========================================================================
// CACHE-PROXY — Slår op i Firebase, henter fra API hvis ikke fundet
// =========================================================================

export const fetchAndCacheRoute = async (
  fromCity,
  toCity,
  travelType,
  pos1,
  pos2,
) => {
  const key = `${travelType}_${[fromCity, toCity].sort().join("_")}`;
  const cacheRef = doc(db, "artifacts", appId, "public", "data", "routes", key);

  // 1. Tjek cache
  try {
    const cached = await getDoc(cacheRef);
    if (cached.exists()) {
      const path = cached.data().path.map((p) => [p.lat, p.lng]);

      // Tjek om ruten skal vendes — sammenlign første punkt med startpos
      const firstPoint = path[0];
      const distToStart =
        Math.abs(firstPoint[0] - pos1[0]) + Math.abs(firstPoint[1] - pos1[1]);
      const distToEnd =
        Math.abs(firstPoint[0] - pos2[0]) + Math.abs(firstPoint[1] - pos2[1]);

      // Hvis første punkt er tættere på destination end på start → vend ruten om
      return distToEnd < distToStart ? [...path].reverse() : path;
    }
  } catch {}

  // 2. Hent fra API
  let path;

  if (travelType === "flight") {
    path = calcFlightArc(pos1, pos2);
  } else if (travelType === "train") {
    console.log(`🚂 Henter BRouter rute: ${fromCity} → ${toCity}`);
    const result = await fetchBRouterRoute(pos1, pos2);
    console.log(`🚂 BRouter svar:`, result);
    path = result?.path ||
      (await fetchOSRMDriving(pos1, pos2, "driving"))?.path || [pos1, pos2];
    if (!result?.path)
      console.warn(
        `⚠️ BRouter fejlede for ${fromCity}→${toCity}, bruger OSRM fallback`,
      );
  } else if (travelType === "walking") {
    const result = await fetchOSRMDriving(pos1, pos2, "foot");
    path = result?.path || [pos1, pos2];
  } else {
    const result = await fetchOSRMDriving(pos1, pos2, "driving");
    path = result?.path || [pos1, pos2];
  }

  // 3. Gem i Firebase som {lat, lng} objekter (nested arrays er ikke tilladt)
  const pathForFirebase = path.map((p) => ({ lat: p[0], lng: p[1] }));
  setDoc(cacheRef, { path: pathForFirebase, cachedAt: Date.now() }).catch(
    () => {},
  );

  // 4. Returner som [lat, lng] arrays til resten af koden
  return path;
};
