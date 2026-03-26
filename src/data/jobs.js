// Chance for jackpot-hændelse per job (0-1)
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

export const JOB_POOL = {

  // ── KØBENHAVN ─────────────────────────────────────────────────
  københavn: [
    {
      id: 'cph_bike',
      tier: 1,
      title: 'Cykelkurer',
      emoji: '🚲',
      description: 'Leverer mad og pakker på tværs af byen på cykel.',
      pay: 110,
      durationHours: 3,
      events: [
        {
          prompt: 'GPS\'en dør midt i en levering i Nørrebro.',
          choiceA: { label: 'Spørg en lokal', payBonus: 0, flavor: 'En ældre dame viser vej med et smil.' },
          choiceB: { label: 'Find vej selv', payBonus: 30, flavor: 'Du finder en genvej ingen andre kender.' },
        },
        {
          prompt: 'En kunde klager over forsinkelse og truer med at give dig en dårlig anmeldelse.',
          choiceA: { label: 'Undskyld og giv rabat', payBonus: -30, flavor: 'Kunden bliver lidt blødere.' },
          choiceB: { label: 'Stå fast — trafikken var elendig', payBonus: 0, flavor: 'Kunden smækker døren.' },
        },
      ],
    },
    {
      id: 'cph_guide',
      tier: 1,
      title: 'Turistguide',
      emoji: '🗺️',
      description: 'Guider internationale turister rundt i indre by og Nyhavn.',
      pay: 140,
      durationHours: 4,
      events: [
        {
          prompt: 'En gruppe amerikanere vil se Den Lille Havfrue — men du er sent på den.',
          choiceA: { label: 'Tag dem med på løb', payBonus: 40, flavor: 'De elsker energien!' },
          choiceB: { label: 'Skip den i dag', payBonus: -20, flavor: 'Gruppen er skuffet.' },
        },
        {
          prompt: 'En turist falder og slår knæet. Intet alvorligt, men hun er rystet.',
          choiceA: { label: 'Sæt tempoet ned, vær omsorgfuld', payBonus: 60, flavor: 'Hun giver dig et ekstra tip.' },
          choiceB: { label: 'Fortsæt turen', payBonus: 0, flavor: 'Stemningen er lidt flad bagefter.' },
        },
      ],
    },
    {
      id: 'cph_waiter',
      tier: 1,
      title: 'Tjener på Nyhavn',
      emoji: '🍺',
      description: 'Serverer øl og smørrebrød til turister langs kanalen.',
      pay: 120,
      durationHours: 3,
      events: [
        {
          prompt: 'En stor gruppe bestiller rundt og venter utålmodigt.',
          choiceA: { label: 'Prioritér dem', payBonus: 50, flavor: 'De drikker for et mindre landbrug.' },
          choiceB: { label: 'Første til mølle', payBonus: 0, flavor: 'De klager lidt, men accepterer det.' },
        },
      ],
    },
    {
      id: 'cph_harbor',
      tier: 2,
      title: 'Havnelogistiker',
      emoji: '⚓',
      description: 'Koordinerer containerleverancer i Københavns Nordhavn.',
      pay: 240,
      durationHours: 6,
      unlocksFrom: { jobId: 'cph_bike', count: 3 },
      events: [
        {
          prompt: 'En forsendelse er mærket forkert og skal om-sorteres hurtigt.',
          choiceA: { label: 'Klare det selv', payBonus: 80, flavor: 'Du løser det på rekordtid.' },
          choiceB: { label: 'Tilkald hjælp', payBonus: 0, flavor: 'Det tager dobbelt så lang tid.' },
        },
        {
          prompt: 'Kranoperatøren er syg. Vil du overtage?',
          choiceA: { label: 'Ja, prøver lykken', payBonus: 120, flavor: 'Det går overraskende godt!' },
          choiceB: { label: 'Nej, for risikabelt', payBonus: -40, flavor: 'Chefen er utilfreds med forsinkelsen.' },
        },
        {
          prompt: 'En mystisk container er mærket "fragiles — top secret".',
          choiceA: { label: 'Kig inden i', payBonus: -80, flavor: 'Det var en dårlig idé. Sikkerhedsvagten er sur.' },
          choiceB: { label: 'Lad den være', payBonus: 40, flavor: 'Din diskretion bliver lagt mærke til.' },
        },
      ],
    },
  ],

  // ── HAMBURG ───────────────────────────────────────────────────
  hamburg: [
    {
      id: 'hh_dock',
      tier: 1,
      title: 'Havnearbejder',
      emoji: '🏗️',
      description: 'Læsser og losser containere i Europas næststørste havn.',
      pay: 200,
      durationHours: 5,
      events: [
        {
          prompt: 'Formanden spørger om du kan tage en ekstra skift.',
          choiceA: { label: 'Ja, bliv', payBonus: 100, flavor: 'Kroppen beklager det i morgen.' },
          choiceB: { label: 'Nej tak', payBonus: 0, flavor: 'Du vinker farvel til en træt kollega.' },
        },
        {
          prompt: 'En kollega er ved at falde fra en palle. Du kan gribe ind.',
          choiceA: { label: 'Grib ham', payBonus: 60, flavor: 'Han skylder dig en øl.' },
          choiceB: { label: 'Råb på hjælp', payBonus: 0, flavor: 'Alt går godt, men langsomt.' },
        },
      ],
    },
    {
      id: 'hh_fish',
      tier: 1,
      title: 'Fiskehandler',
      emoji: '🐟',
      description: 'Sælger fisk på Hamburgs ældgamle fiskemarked tidligt om morgenen.',
      pay: 130,
      durationHours: 3,
      events: [
        {
          prompt: 'En ældre dame prutter på prisen. Hun ser sulten ud.',
          choiceA: { label: 'Giv hende rabat', payBonus: -20, flavor: 'Hun smiler og takker dig varmt.' },
          choiceB: { label: 'Hold prisen', payBonus: 20, flavor: 'Hun går videre med et suk.' },
        },
      ],
    },
    {
      id: 'hh_harbormaster',
      tier: 2,
      title: 'Havneassistent',
      emoji: '🚢',
      description: 'Assisterer havnemesteren med koordinering af skibstrafik.',
      pay: 350,
      durationHours: 7,
      unlocksFrom: { jobId: 'hh_dock', count: 3 },
      events: [
        {
          prompt: 'Et fragtskib er forsinket og blokerer for tre andre.',
          choiceA: { label: 'Omdirigér trafikken', payBonus: 150, flavor: 'Elegant løst under pres.' },
          choiceB: { label: 'Vent på ordre', payBonus: -50, flavor: 'Kaos i 20 minutter.' },
        },
        {
          prompt: 'Skibskaptajnen inviterer dig ombord på en hurtig rundtur.',
          choiceA: { label: 'Hop ombord', payBonus: 0, flavor: 'Det er fantastisk — men du kommer lidt for sent tilbage.' },
          choiceB: { label: 'Tak nej, du er på arbejde', payBonus: 80, flavor: 'Chefen nikker anerkendende.' },
        },
      ],
    },
  ],

  // ── PARIS ─────────────────────────────────────────────────────
  paris: [
    {
      id: 'par_waiter',
      tier: 1,
      title: 'Tjener på brasserie',
      emoji: '☕',
      description: 'Serverer kaffe og croissanter på en travl parisisk brasserie.',
      pay: 120,
      durationHours: 3,
      events: [
        {
          prompt: 'En turistgruppe ankommer og kræver dit bord.',
          choiceA: { label: 'Skru op for charmen', payBonus: 60, flavor: 'De er henrykte og tipper godt.' },
          choiceB: { label: 'Hold dig neutral', payBonus: 10, flavor: 'De spiser og forsvinder.' },
        },
        {
          prompt: 'En gæst sender sin croissant retur — "pas assez frais".',
          choiceA: { label: 'Hent en ny straks', payBonus: 30, flavor: 'Han bliver imponeret.' },
          choiceB: { label: 'Argumentér imod', payBonus: -40, flavor: 'Det ender med en scene.' },
        },
      ],
    },
    {
      id: 'par_guide',
      tier: 1,
      title: 'Turistguide',
      emoji: '🗼',
      description: 'Guider grupper rundt ved Eiffeltårnet og Louvre.',
      pay: 150,
      durationHours: 4,
      events: [
        {
          prompt: 'En gæst spørger om noget du ikke ved.',
          choiceA: { label: 'Improviser overbevisende', payBonus: 80, flavor: 'De tror på hvert ord.' },
          choiceB: { label: 'Indrøm det ærligt', payBonus: 20, flavor: 'De sætter ærligheden pris på.' },
        },
      ],
    },
    {
      id: 'par_sommelier',
      tier: 2,
      title: 'Sommelier-assistent',
      emoji: '🍷',
      description: 'Hjælper en anerkendt sommelier i en Michelin-restaurant.',
      pay: 280,
      durationHours: 5,
      unlocksFrom: { jobId: 'par_waiter', count: 3 },
      events: [
        {
          prompt: 'Sommelieren beder dig vælge en vin til et særligt bord.',
          choiceA: { label: 'Vælg den dyreste', payBonus: 100, flavor: 'Bordet er begejstret. Chefen er tilfreds.' },
          choiceB: { label: 'Vælg efter smag', payBonus: 60, flavor: 'En solid beslutning.' },
        },
        {
          prompt: 'Du spilder lidt rødvin på en gæsts hvide skjorte.',
          choiceA: { label: 'Undskyld professionelt', payBonus: -30, flavor: 'Gæsten er mild — det kunne være værre.' },
          choiceB: { label: 'Forsøg at skjule det', payBonus: -100, flavor: 'Han opdager det. Det er slemt.' },
        },
      ],
    },
  ],

  // ── AMSTERDAM ─────────────────────────────────────────────────
  amsterdam: [
    {
      id: 'ams_courier',
      tier: 1,
      title: 'Cykelkurer',
      emoji: '🚲',
      description: 'Leverer pakker på tværs af kanalerne i Amsterdam.',
      pay: 80,
      durationHours: 2,
      events: [
        {
          prompt: 'En bro er hævet og blokerer din rute.',
          choiceA: { label: 'Vent på broen', payBonus: -20, flavor: 'Du sidder og ser på vandet i 10 minutter.' },
          choiceB: { label: 'Find omvej', payBonus: 30, flavor: 'Du ankommer kun lidt forsinket.' },
        },
      ],
    },
    {
      id: 'ams_museum',
      tier: 1,
      title: 'Museumsassistent',
      emoji: '🎨',
      description: 'Hjælper besøgende i Rijksmuseum.',
      pay: 100,
      durationHours: 4,
      events: [
        {
          prompt: 'Et barn er ved at røre ved et maleri.',
          choiceA: { label: 'Grib ind straks', payBonus: 50, flavor: 'Forældrene er taknemlige.' },
          choiceB: { label: 'Råb "HEJ!"', payBonus: 10, flavor: 'Det virker, men det var lidt dramatisk.' },
        },
        {
          prompt: 'En journalist vil interviewe dig om museet.',
          choiceA: { label: 'Sig ja', payBonus: 40, flavor: 'Du ender på forsiden af en turistguide.' },
          choiceB: { label: 'Afvis høfligt', payBonus: 0, flavor: 'Du går tilbage til arbejdet.' },
        },
      ],
    },
  ],

  // ── ZÜRICH ────────────────────────────────────────────────────
  zürich: [
    {
      id: 'zrh_bank',
      tier: 1,
      title: 'Bankassistent',
      emoji: '🏦',
      description: 'Hjælper med dataindtastning i en privat schweizisk bank.',
      pay: 320,
      durationHours: 6,
      events: [
        {
          prompt: 'Du opdager en fejl i et regneark med mange nuller.',
          choiceA: { label: 'Ret det selv stille', payBonus: 0, flavor: 'Ingen ved det. Du sover dårligt.' },
          choiceB: { label: 'Eskalér til chefen', payBonus: 120, flavor: 'Han er imponeret af din integritet.' },
        },
        {
          prompt: 'En kollega hvisker at der er et hul i systemet man kan udnytte.',
          choiceA: { label: 'Rapportér det', payBonus: 200, flavor: 'Du får en sikkerhedsbonus.' },
          choiceB: { label: 'Ignorer det', payBonus: 0, flavor: 'Du tænker på det resten af dagen.' },
        },
      ],
    },
  ],

  // ── ROM ───────────────────────────────────────────────────────
  roma: [
    {
      id: 'rom_guide',
      tier: 1,
      title: 'Colosseum-guide',
      emoji: '🏛️',
      description: 'Guider turister rundt i og omkring Colosseum.',
      pay: 130,
      durationHours: 4,
      events: [
        {
          prompt: 'En turist hævder at vide mere end dig om gladiatorer.',
          choiceA: { label: 'Lad ham skinne', payBonus: 50, flavor: 'Han tipper fantastisk.' },
          choiceB: { label: 'Korriger ham venligt', payBonus: 20, flavor: 'Han er lidt fornærmet.' },
        },
        {
          prompt: 'Solen banker ned og gruppen er ved at kollapse af varme.',
          choiceA: { label: 'Køb is til alle', payBonus: -40, flavor: 'De er evigt taknemlige.' },
          choiceB: { label: 'Find skygge og pause', payBonus: 0, flavor: 'En kortere men fornuftig beslutning.' },
        },
      ],
    },
    {
      id: 'rom_pizza',
      tier: 1,
      title: 'Pizzabager',
      emoji: '🍕',
      description: 'Laver autentisk napolitansk pizza i en travl restaurant nær Vatikanet.',
      pay: 100,
      durationHours: 3,
      events: [
        {
          prompt: 'Ovnen er for varm og pizzaen er ved at brænde.',
          choiceA: { label: 'Træk den ud tidligt', payBonus: 0, flavor: 'Den er lidt bleg, men ok.' },
          choiceB: { label: 'Lad den sidde lidt endnu', payBonus: 40, flavor: 'Perfekt sprød kant!' },
        },
      ],
    },
  ],

  // ── DEFAULT ───────────────────────────────────────────────────
  default: [
    {
      id: 'def_barista',
      tier: 1,
      title: 'Barista',
      emoji: '☕',
      description: 'Laver kaffe i en lokal café.',
      pay: 80,
      durationHours: 3,
      events: [
        {
          prompt: 'En kunde klager over sin kaffe.',
          choiceA: { label: 'Lav en ny gratis', payBonus: 20, flavor: 'Hun smiler og giver dig et tip.' },
          choiceB: { label: 'Stands fast', payBonus: -10, flavor: 'Hun forlader stedet misfornøjet.' },
        },
      ],
    },
    {
      id: 'def_cleaner',
      tier: 1,
      title: 'Rengøringsassistent',
      emoji: '🧹',
      description: 'Rydder op på et lokalt hotel.',
      pay: 70,
      durationHours: 3,
      events: [
        {
          prompt: 'Du finder en tyk konvolut på gulvet i et værelse.',
          choiceA: { label: 'Aflevér den i receptionen', payBonus: 50, flavor: 'Personalet er imponeret af din ærlighed.' },
          choiceB: { label: 'Kig hvad der er i', payBonus: -30, flavor: 'Der var ikke noget godt i den alligevel.' },
        },
      ],
    },
    {
      id: 'def_market',
      tier: 1,
      title: 'Markedshandler',
      emoji: '🛒',
      description: 'Sælger lokale varer på et torv.',
      pay: 90,
      durationHours: 4,
      events: [
        {
          prompt: 'En storindkøber vil købe dit hele lager på én gang.',
          choiceA: { label: 'Sælg alt', payBonus: 60, flavor: 'Du er færdig tidligt.' },
          choiceB: { label: 'Hold fast i prisen', payBonus: 30, flavor: 'Han forhandler — du vinder lidt.' },
        },
        {
          prompt: 'Det begynder at true med regn.',
          choiceA: { label: 'Pak hurtigt ned', payBonus: -20, flavor: 'Du redder varerne men mister salg.' },
          choiceB: { label: 'Bliv og se hvad sker', payBonus: 40, flavor: 'Det blæser over — og kunderne beundrer dit mod.' },
        },
      ],
    },
    {
      id: 'def_nightwatch',
      tier: 1,
      title: 'Nattevagt',
      emoji: '🔦',
      description: 'Holder øje med et lokalt museum eller lager om natten.',
      pay: 110,
      durationHours: 8,
      events: [
        {
          prompt: 'En alarm går i gang klokken 3 om natten.',
          choiceA: { label: 'Tjek det selv', payBonus: 80, flavor: 'Det var bare en kat. Du er helten.' },
          choiceB: { label: 'Ring til politiet', payBonus: 0, flavor: 'De finder ingenting. De er lidt irriterede.' },
        },
      ],
    },
  ],
};
