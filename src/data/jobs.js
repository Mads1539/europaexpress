export const JOB_POOL = {
  // ── HAVN & INDUSTRI ──────────────────────────────────────────
  hamburg: [
    {
      id: 'hh_dock',
      title: 'Havnearbejder',
      description: 'Læsser containere ved Hamburgs store havn.',
      pay: 200, durationHours: 5,
      event: {
        prompt: 'Formanden spørger om du kan tage en ekstra skift.',
        choiceA: { label: 'Ja, bliv', payBonus: 100, extraHours: 3 },
        choiceB: { label: 'Nej tak', payBonus: 0, extraHours: 0 }
      }
    },
    {
      id: 'hh_warehouse',
      title: 'Lagermedarbejder',
      description: 'Sorterer pakker i et logistikcenter.',
      pay: 140, durationHours: 4,
      event: {
        prompt: 'En pakke er mærket forkert. Hvad gør du?',
        choiceA: { label: 'Rapportér det', payBonus: 40, extraHours: 0 },
        choiceB: { label: 'Ignorer det', payBonus: 0, extraHours: -1 }
      }
    }
  ],

  // ── SERVICE & TURISME ─────────────────────────────────────────
  paris: [
    {
      id: 'par_waiter',
      title: 'Tjener på café',
      description: 'Serverer kaffe og croissanter på en travl brasserie.',
      pay: 120, durationHours: 3,
      event: {
        prompt: 'En turistgruppe ankommer og vil have bordet dit.',
        choiceA: { label: 'Skru op for charmen', payBonus: 60, extraHours: 1 },
        choiceB: { label: 'Hold dig neutral', payBonus: 10, extraHours: 0 }
      }
    },
    {
      id: 'par_guide',
      title: 'Turistguide',
      description: 'Guider grupper rundt ved Eiffeltårnet.',
      pay: 150, durationHours: 4,
      event: {
        prompt: 'En gæst spørger om noget du ikke ved.',
        choiceA: { label: 'Improviser', payBonus: 80, extraHours: 0 },
        choiceB: { label: 'Indrøm det ærligt', payBonus: 20, extraHours: 0 }
      }
    }
  ],

  // ── FINANS & KONTOR ───────────────────────────────────────────
  zürich: [
    {
      id: 'zrh_bank',
      title: 'Bankassistent',
      description: 'Hjælper med dataindtastning i en privat bank.',
      pay: 320, durationHours: 6,
      event: {
        prompt: 'Du opdager en fejl i et regneark.',
        choiceA: { label: 'Ret det selv', payBonus: 0, extraHours: -1 },
        choiceB: { label: 'Eskalér til chefen', payBonus: 120, extraHours: 1 }
      }
    }
  ],

  // ── LANDBRUG & NATUR ──────────────────────────────────────────
  bordeaux: [
    {
      id: 'bdx_wine',
      title: 'Vindrueplukker',
      description: 'Høster modne druer på et château.',
      pay: 90, durationHours: 6,
      event: {
        prompt: 'Vejret skifter og regnen nærmer sig.',
        choiceA: { label: 'Bliv og pres på', payBonus: 50, extraHours: 1 },
        choiceB: { label: 'Stop i god tid', payBonus: 0, extraHours: -1 }
      }
    }
  ],

  // ── TRANSPORT & LOGISTIK ──────────────────────────────────────
  amsterdam: [
    {
      id: 'ams_courier',
      title: 'Cykelkurer',
      description: 'Leverer pakker på tværs af kanalerne.',
      pay: 80, durationHours: 2,
      event: {
        prompt: 'GPS\'en dør midt i en levering.',
        choiceA: { label: 'Spørg en lokal', payBonus: 0, extraHours: 1 },
        choiceB: { label: 'Find vej selv', payBonus: 20, extraHours: 2 }
      }
    },
    {
      id: 'ams_boat',
      title: 'Kanaltur-assistent',
      description: 'Hjælper turister ombord på kanalture.',
      pay: 100, durationHours: 3,
      event: {
        prompt: 'En gæst falder i vandet.',
        choiceA: { label: 'Spring ud og redddem', payBonus: 150, extraHours: 2 },
        choiceB: { label: 'Kast redningskrans', payBonus: 30, extraHours: 0 }
      }
    }
  ],

  // ── DEFAULT POOL (bruges til byer uden specifikke jobs) ───────
  default: [
    {
      id: 'def_barista',
      title: 'Barista',
      description: 'Laver kaffe i en lokal café.',
      pay: 80, durationHours: 3,
      event: {
        prompt: 'En kunde klager over sin kaffe.',
        choiceA: { label: 'Lav en ny gratis', payBonus: 20, extraHours: 0 },
        choiceB: { label: 'Stands fast', payBonus: 0, extraHours: -1 }
      }
    },
    {
      id: 'def_cleaner',
      title: 'Rengøringsassistent',
      description: 'Rydder op på et lokalt hotel.',
      pay: 70, durationHours: 3,
      event: {
        prompt: 'Du finder en pung på gulvet.',
        choiceA: { label: 'Aflevér den', payBonus: 50, extraHours: 0 },
        choiceB: { label: 'Behold den', payBonus: 100, extraHours: 0 }
      }
    },
    {
      id: 'def_market',
      title: 'Markedshandler',
      description: 'Sælger lokale varer på et torv.',
      pay: 90, durationHours: 4,
      event: {
        prompt: 'En storindkøber vil købe dit hele lager.',
        choiceA: { label: 'Sælg alt på én gang', payBonus: 60, extraHours: -1 },
        choiceB: { label: 'Hold fast i prisen', payBonus: 0, extraHours: 1 }
      }
    },
    {
      id: 'def_guide',
      title: 'Lokal guide',
      description: 'Viser turister rundt i gaderne.',
      pay: 100, durationHours: 3,
      event: {
        prompt: 'Gruppen vil se et sted der er lukket i dag.',
        choiceA: { label: 'Find alternativ', payBonus: 30, extraHours: 0 },
        choiceB: { label: 'Gå hjem tidligt', payBonus: 0, extraHours: -2 }
      }
    }
  ]
};

// Hvor mange jobs per by-størrelse
export const JOB_COUNT_BY_SIZE = {
  small:  1,
  medium: 2,
  large:  3,
  huge:   4
};

// Hvor tit jobmarkedet roterer (i spilminutter)
export const JOB_REFRESH_INTERVAL = 240; // = 4 spiltimer
