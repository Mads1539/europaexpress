export const JACKPOT_CHANCE = 0.15;

export const JACKPOT_EVENTS = [
  { prompt: "Du finder en tyk tegnebog bag disken.", icon: "💰", payBonus: 150, flavor: "Ingen ejermand i sigte..." },
{ prompt: "En stamkunde efterlader et kæmpe drikkepenge.", icon: "🤑", payBonus: 200, flavor: "\"Behold det, du fortjener det!\"" },
{ prompt: "Din chef er i strålende humør og giver en spontan bonus.", icon: "⭐", payBonus: 250, flavor: "Det sker vist ikke tit." },
{ prompt: "Du vinder en intern konkurrence på arbejdet.", icon: "🏆", payBonus: 300, flavor: "Første plads!" },
{ prompt: "En turistgruppe over-tipper voldsomt.", icon: "💎", payBonus: 180, flavor: "De aner åbenbart ikke hvad euro er værd." },
];

export const JOB_COUNT_BY_SIZE = {
  small:  1,
  medium: 2,
  large:  3,
  huge:   4,
};

export const JOB_REFRESH_INTERVAL = 240;

// ─── LEVEL SYSTEM ────────────────────────────────────────────
export const JOB_CATEGORIES = {
  cafe: {
    label: 'Café',
    emoji: '☕',
    miniGame: 'memory',
    requiresFacility: null, // altid tilgængelig
    levels: [
      { level: 1, title: 'Barista-trainee', xpRequired: 0,  pay: 80,  durationHours: 2 },
      { level: 2, title: 'Barista',         xpRequired: 3,  pay: 140, durationHours: 3 },
      { level: 3, title: 'Kafferister',     xpRequired: 8,  pay: 220, durationHours: 4 },
    ],
  },
  restaurant: {
    label: 'Restaurant',
    emoji: '🍽️',
    miniGame: 'memory',
    requiresFacility: null,
    levels: [
      { level: 1, title: 'Tjener-trainee', xpRequired: 0,  pay: 90,  durationHours: 2 },
      { level: 2, title: 'Tjener',         xpRequired: 3,  pay: 160, durationHours: 3 },
      { level: 3, title: 'Overtjener',     xpRequired: 8,  pay: 260, durationHours: 4 },
    ],
  },
  havn: {
    label: 'Havn',
    emoji: '⚓',
    miniGame: 'stack',
    requiresFacility: 'ferry',
    levels: [
      { level: 1, title: 'Havnearbejder',    xpRequired: 0,  pay: 120, durationHours: 4 },
      { level: 2, title: 'Logistikoperatør', xpRequired: 3,  pay: 200, durationHours: 5 },
      { level: 3, title: 'Havnemester',      xpRequired: 8,  pay: 320, durationHours: 6 },
    ],
  },
  lufthavn: {
    label: 'Lufthavn',
    emoji: '✈️',
    miniGame: 'stack',
    requiresFacility: 'airport',
    levels: [
      { level: 1, title: 'Ground Crew',   xpRequired: 0,  pay: 130, durationHours: 4 },
      { level: 2, title: 'Check-in Agent', xpRequired: 3, pay: 210, durationHours: 5 },
      { level: 3, title: 'Flyveleder',    xpRequired: 8,  pay: 350, durationHours: 6 },
    ],
  },
  bank: {
    label: 'Bank',
    emoji: '🏦',
    miniGame: 'sort',
    requiresFacility: null,
    levels: [
      { level: 1, title: 'Bankassistent',  xpRequired: 0,  pay: 150, durationHours: 4 },
      { level: 2, title: 'Rådgiver',       xpRequired: 3,  pay: 260, durationHours: 5 },
      { level: 3, title: 'Filialdirektør', xpRequired: 8,  pay: 400, durationHours: 6 },
    ],
  },
  guide: {
    label: 'Turistguide',
    emoji: '🗺️',
    miniGame: 'quiz',
    requiresFacility: null,
    levels: [
      { level: 1, title: 'Byguide',           xpRequired: 0,  pay: 100, durationHours: 3 },
      { level: 2, title: 'Rejseleder',         xpRequired: 3,  pay: 180, durationHours: 4 },
      { level: 3, title: 'Ekspeditionsleder',  xpRequired: 8,  pay: 280, durationHours: 5 },
    ],
  },
};

// Hjælper: beregn level ud fra XP
export const getLevelFromXP = (xp) => {
  if (xp >= 8) return 3;
  if (xp >= 3) return 2;
  return 1;
};

// Hjælper: XP til næste level
export const getXPToNextLevel = (xp) => {
  if (xp >= 8) return null; // max level
  if (xp >= 3) return 8 - xp;
  return 3 - xp;
};

// Hjælper: hvilke kategorier er tilgængelige i en given by
export const getAvailableCategories = (cityData) => {
  return Object.entries(JOB_CATEGORIES).filter(([, cat]) => {
    if (!cat.requiresFacility) return true;
    return cityData?.[cat.requiresFacility] !== null;
  }).map(([key]) => key);
};

// Generer job-listings fra kategorier + spillerens levels
export const generateJobListings = (cityData, playerLevels, count) => {
  const available = getAvailableCategories(cityData);
  const listings = [];

  available.forEach(categoryKey => {
    const cat = JOB_CATEGORIES[categoryKey];
    const playerLevel = playerLevels?.[categoryKey]?.level ?? 1;

    // Tilføj alle levels op til og med spillerens level + 1 (næste låste)
    cat.levels.forEach(lvl => {
      listings.push({
        id: `${categoryKey}_${lvl.level}`,
        category: categoryKey,
        requiredLevel: lvl.level,
        title: lvl.title,
        emoji: cat.emoji,
        miniGame: cat.miniGame,
        pay: lvl.pay,
        durationHours: lvl.durationHours,
        locked: lvl.level > playerLevel,
        takenBy: null,
        instanceId: `${categoryKey}_${lvl.level}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      });
    });
  });

  // Sorter: tilgængelige først, låste sidst
  return listings.sort((a, b) => a.locked - b.locked);
};
