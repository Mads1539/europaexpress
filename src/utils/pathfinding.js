import { CITIES, TRANSIT_LINES } from "../constants.js";

// =========================================================================
// AFSTANDSBEREGNING
// =========================================================================

// Haversine — bruges til BRouter buffer-trim (præcis)
export const calculateDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  const R = 6371;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Haversine — generel brug (luftlinje-km mellem to positioner)
export const getDist = (pos1, pos2) => {
  if (!pos1 || !pos2) return 999999;
  const lat1 = pos1[0];
  const lon1 = pos1[1];
  const lat2 = pos2[0];
  const lon2 = pos2[1];

  // En simpel tilnærmelse til afstand i kilometer
  const R = 6371; // Jordens radius i km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// =========================================================================
// NABO-STATIONER (til lokaltransport og AI)
// =========================================================================

export const getNearbyStations = (cityName) => {
  const city = CITIES[cityName];
  if (!city) return [];
  return Object.entries(CITIES)
    .map(([name, data]) => ({
      name,
      ...data,
      dist: calculateDistance(city.pos, data.pos),
    }))
    .filter((s) => s.name !== cityName && s.dist <= 50)
    .sort((a, b) => a.dist - b.dist);
};

// =========================================================================
// SIMPEL BFS PATHFINDING (enkelt transportmiddel)
// =========================================================================

export const findPath = (startCity, endCity, transportMode) => {
  const adjacency = {};

  // 1. FILTRERING: Kig kun på de linjer, der matcher transportmidlet
  const validLines = TRANSIT_LINES.filter(
    (line) => line.type === transportMode,
  );

  // 2. BYG NETVÆRKET: Lav forbindelserne mellem byerne
  validLines.forEach((line) => {
    if (line.cities && line.cities.length > 1) {
      for (let i = 0; i < line.cities.length - 1; i++) {
        const u = line.cities[i];
        const v = line.cities[i + 1];
        if (u && v) {
          if (!adjacency[u]) adjacency[u] = new Set();
          if (!adjacency[v]) adjacency[v] = new Set();
          adjacency[u].add(v);
          adjacency[v].add(u);
        }
      }
    }
  });

  // 3. SØG EFTER VEJ (BFS)
  const queue = [startCity];
  const visited = { [startCity]: null };

  while (queue.length > 0) {
    const curr = queue.shift();

    if (curr === endCity) {
      const path = [];
      let temp = endCity;
      while (temp !== null) {
        path.unshift(temp);
        temp = visited[temp];
      }
      return path;
    }

    if (adjacency[curr]) {
      for (const neighbor of adjacency[curr]) {
        if (!(neighbor in visited)) {
          visited[neighbor] = curr;
          queue.push(neighbor);
        }
      }
    }
  }

  return null;
};

// =========================================================================
// MULTI-MODAL DIJKSTRA PATHFINDING (alle transporttyper)
// =========================================================================

export const findMultimodalPath = (startCity, goalCity) => {
  if (startCity === goalCity) return [];

  // Byg samlet adjacency-graf på tværs af alle transporttyper
  // node: bynavn, edge: { to, type, lineName, dist }
  const adjacency = {};

  const addEdge = (from, to, type, lineName) => {
    if (!adjacency[from]) adjacency[from] = [];
    if (!adjacency[to]) adjacency[to] = [];
    const dist = getDist(CITIES[from]?.pos, CITIES[to]?.pos);
    adjacency[from].push({ to, type, lineName, dist });
    adjacency[to].push({ to: from, type, lineName, dist });
  };

  TRANSIT_LINES.forEach((line) => {
    if (!line.cities || line.cities.length < 2) return;
    for (let i = 0; i < line.cities.length - 1; i++) {
      const u = line.cities[i];
      const v = line.cities[i + 1];
      if (u && v && CITIES[u] && CITIES[v]) {
        addEdge(u, v, line.type, line.name);
      }
    }
  });

  // Dijkstra — vægtet på fysisk afstand så vi finder den geografisk korteste rute
  const dist = {};
  const prev = {}; // prev[city] = { from, type, lineName }
  const visited = new Set();
  const queue = [{ city: startCity, cost: 0 }];

  for (const city of Object.keys(CITIES)) dist[city] = Infinity;
  dist[startCity] = 0;

  while (queue.length > 0) {
    // Find billigste ubesøgte node
    queue.sort((a, b) => a.cost - b.cost);
    const { city: curr, cost: currCost } = queue.shift();

    if (visited.has(curr)) continue;
    visited.add(curr);

    if (curr === goalCity) break;

    for (const edge of adjacency[curr] || []) {
      if (visited.has(edge.to)) continue;
      const newCost = currCost + edge.dist;
      if (newCost < dist[edge.to]) {
        dist[edge.to] = newCost;
        prev[edge.to] = {
          from: curr,
          type: edge.type,
          lineName: edge.lineName,
        };
        queue.push({ city: edge.to, cost: newCost });
      }
    }
  }

  if (dist[goalCity] === Infinity) return null; // Ingen rute fundet

  // Rekonstruér sti
  const steps = [];
  let cur = goalCity;
  while (prev[cur]) {
    const { from, type, lineName } = prev[cur];
    steps.unshift({ from, to: cur, type, lineName });
    cur = from;
  }

  return steps; // array af { from, to, type, lineName }
};
