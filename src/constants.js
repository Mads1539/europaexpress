import { Plane, Train, Bus, Globe, Footprints, Car } from "lucide-react";
import { COUNTRY_DATA } from "./data/countries.js";

// =========================================================================
// DATA-PROCESSERING
// =========================================================================

export const CITIES = Object.values(COUNTRY_DATA).reduce((acc, country) => {
  return { ...acc, ...country.cities };
}, {});

export const TRANSIT_LINES = Object.values(COUNTRY_DATA).reduce(
  (acc, country) => {
    return [...acc, ...country.lines];
  },
  [],
);

export const CATEGORY_STYLE = Object.values(COUNTRY_DATA).reduce(
  (acc, country) => {
    return { ...acc, ...country.styles };
  },
  {},
);

// =========================================================================
// TRANSPORT
// =========================================================================

export const TRAVEL_TYPES = {
  bus: {
    speed: 70,
    baseCost: 20,
    costPerKm: 0.5,
    icon: Bus,
    label: "Bus",
    prefix: "FLX",
  },
  train: {
    speed: 150,
    baseCost: 50,
    costPerKm: 1.2,
    icon: Train,
    label: "Tog",
    prefix: "IC",
  },
   highspeed: {
    speed: 300,
    baseCost: 150,
    costPerKm: 0.8,
    icon: Train,
    label: "Højhastighedstog",
    prefix: "EC",
  },
   metro: {
    speed: 60,
    baseCost: 15,
    costPerKm: 1.8,
    icon: Train,
    label: "Metro",
    prefix: "S",
  },
  flight: {
    speed: 600,
    baseCost: 1000,
    costPerKm: 0.2,
    icon: Plane,
    label: "Fly",
    prefix: "SK",
  },
  ferry: {
    speed: 30,
    baseCost: 100,
    costPerKm: 1.5,
    icon: Globe,
    label: "Færge",
    prefix: "LINE",
  },
  walking: {
    speed: 5,
    baseCost: 0,
    costPerKm: 0,
    icon: Footprints,
    label: "Gåben",
    prefix: "",
  },
  taxi: {
    speed: 50,
    baseCost: 10,
    costPerKm: 2,
    icon: Car,
    label: "Taxi",
    prefix: "",
  },
};

export const ARRIVAL_RADIUS_KM = {
  highspeed: 3.0,  // stopper ved store stationer
  train: 1.5,
  metro: 0.5,      // tæt på stationen
  bus: 0.4,
  walking: 0.15,
  taxi: 0.3,
  flight: 4.0,
  ferry: 1.0,
};

export const STOP_DURATION = 0.5; // minutter spilleren holder stille i en by

export const getDashArray = (type) => {
  switch (type) {
    case "bus":
      return "6, 4";
    case "ferry":
      return "2, 5";
    default:
      return null;
  }
};

// =========================================================================
// HÆNDELSER
// =========================================================================

export const INCIDENT_TYPES = [
  { type: "train", label: "Væltet træ på skinnerne", icon: Train },
  { type: "train", label: "Signalfejl", icon: Train },
  { type: "bus", label: "Vejspærring på motorvejen", icon: Bus },
  { type: "bus", label: "Mangel på chauffører", icon: Bus },
  { type: "flight", label: "Strejke i lufthavnen", icon: Plane },
  { type: "flight", label: "Sikkerhedsbrud", icon: Plane },
  { type: "ferry", label: "Høj søgang / Storm", icon: Globe },
  { type: "ferry", label: "Tekniske problemer med rampen", icon: Globe },
  { type: "highspeed", label: "Infrastrukturfejl på højhastighedsbane", icon: Train },
{ type: "highspeed", label: "Nødstop pga. objekt på skinnerne", icon: Train },
{ type: "metro", label: "Strømafbrydelse i tunnelen", icon: Train },
{ type: "metro", label: "Evakuering af station", icon: Train },
];

// =========================================================================
// SPILLERE & AVATARS
// =========================================================================

export const AVATARS = [
  "👨‍💼",
  "👩‍💼",
  "👨‍✈️",
  "👩‍✈️",
  "👨‍🚀",
  "👩‍🚀",
  "👨‍⚕️",
  "👩‍⚕️",
  "🐸",
  "🐻",
  "🐢",
  "🦮",
];

// =========================================================================
// AI / CPU
// =========================================================================

export const CPU_NAMES = [
  "HAL-9000",
  "EUROBOT",
  "KONDOR",
  "NEXUS",
  "ATLAS",
  "ORION",
  "ROBO-TRON",
  "TRAVELBOT",
  "TITAN",
  "MECHANIX",
  "S.A.M",
];

export const CPU_AVATARS = [
  "🤖",
  "👾",
  "🦾",
  "🛸",
  "🧠",
  "⚡",
  "📱",
  "💻",
  "🖥",
];

export const CPU_COLORS = [
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#d97706",
  "#db2777",
];

export const AI_DIFFICULTY = {
  easy: { label: "Let", emoji: "🟢", description: "Rejser tilfældigt" },
  medium: { label: "Medium", emoji: "🟡", description: "Forsøger at nå målet" },
  hard: { label: "Svær", emoji: "🔴", description: "Optimal rute til målet" },
};

// =========================================================================
// INCIDENT UTILITIES
// =========================================================================

export const INCIDENT_SEVERITY = [
  { level: 1, label: "Mindre forsinkelse", delay: 30 },
  { level: 2, label: "Stor forsinkelse", delay: 90 },
  { level: 3, label: "Aflyst", delay: 0 },
];

export const INCIDENT_SCOPES = {
  CITY: "city",
  REGION: "region",
};

export const getCitiesWithTransitType = (type) => {
  const citiesWithType = new Set();
  TRANSIT_LINES.forEach((line) => {
    if (line.type === type) {
      line.cities.forEach((city) => citiesWithType.add(city));
    }
  });
  return Array.from(citiesWithType);
};

export const getCategoriesWithTransitType = (type) => {
  const categories = new Set();
  getCitiesWithTransitType(type).forEach((city) => {
    const category = CITIES[city]?.category;
    if (category) categories.add(category);
  });
  return Array.from(categories);
};

export const getActiveIncident = (incidents = [], city, type) => {
  if (!incidents || incidents.length === 0) return null;

  return (
    incidents.reduce((best, inc) => {
      if (inc.type !== type || inc.clearTime <= Date.now()) return best;

      const matchesCity =
        inc.scope === INCIDENT_SCOPES.REGION
          ? CITIES[city]?.category === inc.category
          : inc.city === city;
      if (!matchesCity) return best;

      if (!best || inc.severity > best.severity) return inc;
      return best;
    }, null) || null
  );
};

export const getIncidentDelayMinutes = (incident) => {
  if (!incident) return 0;
  return INCIDENT_SEVERITY.find((row) => row.level === incident.severity)
    ?.delay || 0;
};

export const isIncidentCancellation = (incident) => {
  return incident?.severity >= 3;
};

export const hasActiveIncident = (incidents, city, type) => {
  return Boolean(getActiveIncident(incidents, city, type));
};
