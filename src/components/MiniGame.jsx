import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════
// FÆLLES SHELL
// ═══════════════════════════════════════════════════════════
const MiniGameShell = ({ title, emoji, instruction, timeLimit = 20, children, score, maxScore, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const firedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(p => {
        const next = Math.max(0, p - 0.1);
        if (next <= 0 && !firedRef.current) {
          firedRef.current = true;
          onTimeUp?.();
        }
        return next;
      });
    }, 100);
    return () => clearInterval(t);
  }, []);

  const pct = timeLeft / timeLimit;
  const barColor = pct > 0.5 ? 'bg-green-500' : pct > 0.25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
    <div className="p-4 border-b border-white/5 bg-slate-900">
    <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
    <span className="text-2xl">{emoji}</span>
    <div>
    <div className="font-black uppercase text-white text-sm leading-none">{title}</div>
    <div className="text-[9px] text-slate-500 uppercase font-black mt-0.5">{instruction}</div>
    </div>
    </div>
    {maxScore > 0 && (
      <div className="text-right">
      <div className="font-black text-xl text-white tabular-nums">{score}<span className="text-slate-600 text-sm">/{maxScore}</span></div>
      <div className="text-[9px] text-slate-500 uppercase font-black">point</div>
      </div>
    )}
    </div>
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
    <div className={`h-full rounded-full ${barColor}`}
    style={{ width: `${pct * 100}%`, transition: 'width 0.1s linear' }} />
    </div>
    </div>
    <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
    </div>
  );
};

const calcBonus = (score, maxScore, maxBonus) => {
  if (maxScore === 0) return 0;
  const pct = score / maxScore;
  if (pct >= 0.8) return maxBonus;
  if (pct >= 0.5) return Math.round(maxBonus * 0.33);
  if (pct >= 0.2) return 0;
  return -Math.round(maxBonus * 0.4);
};

// ═══════════════════════════════════════════════════════════
// ENGINE: CLEANER — Café L1 / Restaurant L1
// Tryk på beskidte tallerkner for at gøre dem rene
// ═══════════════════════════════════════════════════════════
const DIRTY_ITEMS = ['🍽️','🥛','🍵','🫖','🥂','🍶','🧃','🥤'];
const CleanerEngine = ({ onComplete, maxBonus = 160 }) => {
  const COUNT = 12;
  const [items, setItems] = useState(() =>
  Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    emoji: DIRTY_ITEMS[i % DIRTY_ITEMS.length],
    dirty: true,
  }))
  );
  const cleaned = items.filter(i => !i.dirty).length;
  const doneRef = useRef(false);

  const tap = (id) => {
    if (doneRef.current) return;
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, dirty: false } : i);
      if (next.every(i => !i.dirty) && !doneRef.current) {
        doneRef.current = true;
        setTimeout(() => onComplete(calcBonus(next.length, COUNT, maxBonus)), 200);
      }
      return next;
    });
  };

  const handleTimeUp = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(calcBonus(cleaned, COUNT, maxBonus));
  };

  return (
    <MiniGameShell title="Opvask!" emoji="🫧" instruction="Tryk på alle beskidte tallerkner"
    timeLimit={25} score={cleaned} maxScore={COUNT} onTimeUp={handleTimeUp}>
    <div className="flex-1 flex flex-col justify-center items-center p-6 gap-4">
    <div className="grid grid-cols-4 gap-3 w-full max-w-xs">
    {items.map(item => (
      <button key={item.id} onClick={() => tap(item.id)}
      className={`h-16 rounded-2xl text-3xl transition-all border active:scale-90 ${
        item.dirty
        ? 'bg-amber-900/40 border-amber-700/50 hover:bg-amber-700/40'
        : 'bg-green-500/20 border-green-500/40 scale-95'
      }`}>
      {item.dirty ? item.emoji : '✓'}
      </button>
    ))}
    </div>
    <div className="text-[9px] font-black uppercase text-slate-500">{cleaned} / {COUNT} rene</div>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE: MEMORY — Café L2 / Restaurant L2
// Husk rækkefølgen af emojis
// ═══════════════════════════════════════════════════════════
const MemoryEngine = ({ onComplete, items, maxBonus = 180 }) => {
  const ITEMS = items || ['🥐','☕','🥗','🍺','🥩','🍰','🥤','🍳'];
  const [phase, setPhase] = useState('show');
  const [order, setOrder] = useState([]);
  const [picked, setPicked] = useState([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const maxRounds = 3;
  const doneRef = useRef(false);

  const startRound = useCallback((r) => {
    const count = r + 1;
    const shuffled = [...ITEMS].sort(() => Math.random() - 0.5).slice(0, count);
    setOrder(shuffled);
    setPicked([]);
    setPhase('show');
    setTimeout(() => setPhase('pick'), 1500 + count * 300);
  }, []);

  useEffect(() => { startRound(round); }, [round]);

  const pick = (item) => {
    if (phase !== 'pick' || doneRef.current) return;
    const newPicked = [...picked, item];
    setPicked(newPicked);
    if (newPicked.length === order.length) {
      const correct = newPicked.every((p, i) => p === order[i]);
      const newScore = correct ? score + 1 : score;
      setScore(newScore);
      if (round >= maxRounds) {
        doneRef.current = true;
        setPhase('done');
        onComplete(calcBonus(newScore, maxRounds, maxBonus));
      } else {
        setTimeout(() => setRound(r => r + 1), 800);
      }
    }
  };

  const handleTimeUp = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(calcBonus(score, maxRounds, maxBonus));
  };

  return (
    <MiniGameShell title="Husk ordren!" emoji="🧠" instruction="Husk hvad der bliver bestilt"
    timeLimit={30} score={score} maxScore={maxRounds} onTimeUp={handleTimeUp}>
    <div className="flex-1 flex flex-col justify-center items-center p-6 gap-6">
    {phase === 'show' && (
      <>
      <div className="text-[9px] font-black uppercase text-slate-500">Husk denne ordre!</div>
      <div className="flex gap-3 flex-wrap justify-center">
      {order.map((item, i) => <div key={i} className="text-5xl animate-pulse">{item}</div>)}
      </div>
      </>
    )}
    {phase === 'pick' && (
      <>
      <div className="text-[9px] font-black uppercase text-slate-500">
      Hvad blev bestilt? ({picked.length}/{order.length})
      </div>
      <div className="flex gap-2 min-h-[56px] flex-wrap justify-center">
      {picked.map((p, i) => <div key={i} className="text-4xl">{p}</div>)}
      </div>
      <div className="grid grid-cols-4 gap-3">
      {ITEMS.map(item => (
        <button key={item} onClick={() => pick(item)}
        className="text-3xl p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-600/20 active:scale-90 transition-all">
        {item}
        </button>
      ))}
      </div>
      </>
    )}
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE: RECIPE — Restaurant L3
// Følg opskrift under tidspres
// ═══════════════════════════════════════════════════════════
const RECIPE_INGREDIENTS = ['🥩','🧅','🍄','🌿','🧄','🫑','🥕','🍋'];
const RecipeEngine = ({ onComplete, maxBonus = 220 }) => {
  const generateRecipe = () => {
    const count = 3 + Math.floor(Math.random() * 2);
    return Array.from({ length: count }, () => ({
      emoji: RECIPE_INGREDIENTS[Math.floor(Math.random() * RECIPE_INGREDIENTS.length)],
                                                amount: 1 + Math.floor(Math.random() * 3),
    }));
  };

  const [recipes] = useState(() => [generateRecipe(), generateRecipe(), generateRecipe()]);
  const [ri, setRi] = useState(0);
  const [progress, setProgress] = useState({});
  const [score, setScore] = useState(0);
  const doneRef = useRef(false);

  const currentRecipe = recipes[ri];
  const isComplete = currentRecipe?.every(ing => (progress[ing.emoji] ?? 0) >= ing.amount);

  useEffect(() => {
    if (isComplete && !doneRef.current) {
      const newScore = score + 1;
      setScore(newScore);
      if (ri + 1 >= recipes.length) {
        doneRef.current = true;
        onComplete(calcBonus(newScore, recipes.length, maxBonus));
      } else {
        setTimeout(() => { setRi(r => r + 1); setProgress({}); }, 600);
      }
    }
  }, [isComplete]);

  const tap = (emoji) => {
    if (doneRef.current) return;
    setProgress(prev => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
  };

  const handleTimeUp = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(calcBonus(score, recipes.length, maxBonus));
  };

  return (
    <MiniGameShell title="Line Cook!" emoji="👨‍🍳" instruction="Tilbered opskriften i rækkefølge"
    timeLimit={35} score={score} maxScore={recipes.length} onTimeUp={handleTimeUp}>
    <div className="flex-1 flex flex-col justify-center p-6 gap-5">
    <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5">
    <div className="text-[9px] font-black uppercase text-slate-500 mb-3">Opskrift {ri + 1}/{recipes.length}</div>
    <div className="flex flex-wrap gap-3 justify-center">
    {currentRecipe?.map((ing, i) => {
      const done = (progress[ing.emoji] ?? 0) >= ing.amount;
      return (
        <div key={i} className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-sm font-black transition-all ${
          done ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-white'
        }`}>
        <span>{ing.emoji}</span>
        <span>{progress[ing.emoji] ?? 0}/{ing.amount}</span>
        {done && <span>✓</span>}
        </div>
      );
    })}
    </div>
    </div>
    <div className="grid grid-cols-4 gap-3">
    {RECIPE_INGREDIENTS.map(ing => (
      <button key={ing} onClick={() => tap(ing)}
      className="text-3xl p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-600/20 active:scale-90 transition-all">
      {ing}
      </button>
    ))}
    </div>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE: STACKER — Havn L1+L3 / Lufthavn L1
// Slip objektet i zonen på det rigtige tidspunkt
// ═══════════════════════════════════════════════════════════
const StackerEngine = ({ onComplete, emoji = '📦', label = 'SLIP!', maxBonus = 200, rounds = 5 }) => {
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(1.2);
  const roundRef = useRef(0);
  const animRef = useRef();
  const doneRef = useRef(false);
  const [pos, setPos] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [tower, setTower] = useState([]);

  useEffect(() => {
    const animate = () => {
      posRef.current += dirRef.current * speedRef.current;
      if (posRef.current >= 100) { posRef.current = 100; dirRef.current = -1; }
      if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }
      setPos(posRef.current);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const tap = () => {
    if (doneRef.current) return;
    const inZone = posRef.current >= 35 && posRef.current <= 65;
    const newScore = inZone ? score + 1 : score;
    setScore(newScore);
    setFeedback(inZone ? 'good' : 'miss');
    setTower(prev => [...prev, inZone ? 'good' : 'miss']);
    setTimeout(() => setFeedback(null), 400);
    roundRef.current += 1;
    if (roundRef.current >= rounds) {
      doneRef.current = true;
      cancelAnimationFrame(animRef.current);
      setTimeout(() => onComplete(calcBonus(newScore, rounds, maxBonus)), 500);
    } else {
      speedRef.current += 0.35;
    }
  };

  const handleTimeUp = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(animRef.current);
    onComplete(calcBonus(score, rounds, maxBonus));
  };

  return (
    <MiniGameShell title="Stabling" emoji={emoji} instruction="Slip når objektet er i den grønne zone"
    timeLimit={30} score={score} maxScore={rounds} onTimeUp={handleTimeUp}>
    <div className="flex-1 flex flex-col justify-center items-center p-6 gap-5">
    {/* Tårn */}
    <div className="flex flex-col-reverse gap-1 h-16 justify-end">
    {tower.map((t, i) => (
      <div key={i} className={`h-3 w-16 rounded-sm ${t === 'good' ? 'bg-green-500' : 'bg-red-500/50'}`} />
    ))}
    </div>
    {/* Skinne */}
    <div className="relative w-full h-16 bg-slate-800/60 rounded-2xl border border-white/5 overflow-hidden">
    <div className="absolute top-0 bottom-0 left-[35%] right-[35%] bg-green-500/20 border-x border-green-500/40" />
    <div className="absolute top-1/2 -translate-y-1/2 text-3xl transition-none"
    style={{ left: `calc(${pos}% - 20px)` }}>
    {emoji}
    </div>
    </div>
    <div className={`text-xl font-black transition-all ${feedback === 'good' ? 'text-green-400' : feedback === 'miss' ? 'text-red-400' : 'opacity-0'}`}>
    {feedback === 'good' ? '✓ Perfekt!' : '✗ Misset!'}
    </div>
    <button onClick={tap}
    className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 font-black uppercase text-xl tracking-widest transition-all shadow-lg shadow-blue-900/50">
    {label}
    </button>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE: GEO_SORT — Havn L2 / Lufthavn L2 / Bank L3
// Sorter til indland eller udland baseret på spillerens land
// ═══════════════════════════════════════════════════════════
const GeoSortEngine = ({ onComplete, playerCountry, skin = 'cargo', maxBonus = 200 }) => {
  const CITY_SAMPLES = [
    { name: 'København', country: 'DK' }, { name: 'Odense', country: 'DK' },
    { name: 'Aarhus', country: 'DK' }, { name: 'Aalborg', country: 'DK' },
    { name: 'Göteborg', country: 'SE' }, { name: 'Stockholm', country: 'SE' },
    { name: 'Malmö', country: 'SE' }, { name: 'Oslo', country: 'NO' },
    { name: 'Hamburg', country: 'DE' }, { name: 'Berlin', country: 'DE' },
    { name: 'Paris', country: 'FR' }, { name: 'Amsterdam', country: 'NL' },
    { name: 'London', country: 'GB' }, { name: 'Roma', country: 'IT' },
  ];

  const CURRENCY_MAP = {
    DK: { symbol: '🇩🇰', name: 'Dansk Krone', code: 'DKK' },
    SE: { symbol: '🇸🇪', name: 'Svensk Krone', code: 'SEK' },
    NO: { symbol: '🇳🇴', name: 'Norsk Krone', code: 'NOK' },
    DE: { symbol: '🇩🇪', name: 'Euro', code: 'EUR' },
    FR: { symbol: '🇫🇷', name: 'Euro', code: 'EUR' },
    NL: { symbol: '🇳🇱', name: 'Euro', code: 'EUR' },
    GB: { symbol: '🇬🇧', name: 'Pund', code: 'GBP' },
    IT: { symbol: '🇮🇹', name: 'Euro', code: 'EUR' },
  };

  const generateItems = () =>
  Array.from({ length: 12 }, () => {
    const city = CITY_SAMPLES[Math.floor(Math.random() * CITY_SAMPLES.length)];
    return { ...city, id: Math.random() };
  });

  const [items] = useState(generateItems);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const doneRef = useRef(false);

  const current = items[index];
  const isLocal = current?.country === playerCountry;

  const choose = (guessLocal) => {
    if (doneRef.current || feedback) return;
    const correct = guessLocal === isLocal;
    const newScore = correct ? score + 1 : score;
    setScore(newScore);
    setFeedback(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setFeedback(null);
      const next = index + 1;
      if (next >= items.length) {
        doneRef.current = true;
        onComplete(calcBonus(newScore, items.length, maxBonus));
      } else {
        setIndex(next);
      }
    }, 500);
  };

  const handleTimeUp = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(calcBonus(score, items.length, maxBonus));
  };

  const skinConfig = {
    cargo: { title: 'Fragtsortering', emoji: '📦', instruction: 'Indland eller udland?', leftLabel: '🏠 Indland', rightLabel: '✈️ Udland' },
    passport: { title: 'Pas-tjek', emoji: '🛂', instruction: 'Indenrigs eller udenrigs?', leftLabel: '🏠 Indenrigs', rightLabel: '✈️ Udenrigs' },
    currency: { title: 'Valutahandler', emoji: '💱', instruction: 'Lokal eller fremmed valuta?', leftLabel: '🏠 Lokal', rightLabel: '🌍 Fremmed' },
  };
  const cfg = skinConfig[skin] || skinConfig.cargo;

  return (
    <MiniGameShell title={cfg.title} emoji={cfg.emoji} instruction={cfg.instruction}
    timeLimit={30} score={score} maxScore={items.length} onTimeUp={handleTimeUp}>
    <div className="flex-1 flex flex-col justify-center p-6 gap-5">
    <div className={`bg-slate-800/60 rounded-2xl p-6 border text-center transition-all ${
      feedback === 'correct' ? 'border-green-500/50 bg-green-500/10' :
      feedback === 'wrong' ? 'border-red-500/50 bg-red-500/10' : 'border-white/5'
    }`}>
    {skin === 'currency' ? (
      <>
      <div className="text-4xl mb-2">{CURRENCY_MAP[current?.country]?.symbol ?? '💵'}</div>
      <div className="font-black text-2xl text-white">{CURRENCY_MAP[current?.country]?.name ?? '?'}</div>
      <div className="text-slate-500 text-xs mt-1">{CURRENCY_MAP[current?.country]?.code}</div>
      </>
    ) : (
      <>
      <div className="text-[9px] font-black uppercase text-slate-500 mb-1">Destination</div>
      <div className="font-black text-3xl text-white">{current?.name}</div>
      <div className="text-slate-500 text-xs mt-1">{current?.country}</div>
      </>
    )}
    {feedback && (
      <div className={`text-xl font-black mt-3 ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
      {feedback === 'correct' ? '✓ Korrekt!' : '✗ Forkert!'}
      </div>
    )}
    </div>
    <div className="grid grid-cols-2 gap-3">
    <button onClick={() => choose(true)}
    className="py-5 rounded-2xl bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 active:scale-95 font-black text-white text-sm transition-all">
    {cfg.leftLabel}
    </button>
    <button onClick={() => choose(false)}
    className="py-5 rounded-2xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 active:scale-95 font-black text-white text-sm transition-all">
    {cfg.rightLabel}
    </button>
    </div>
    <div className="text-[9px] font-black uppercase text-slate-600 text-center">
    {index + 1} / {items.length} — Du er i {playerCountry}
    </div>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE: SWIPER — Lufthavn L3 / Bank L1
// Svirp til venstre eller højre baseret på kategori
// ═══════════════════════════════════════════════════════════
const SwiperEngine = ({ onComplete, skin = 'security', maxBonus = 180 }) => {
  const SKINS = {
    security: {
      title: 'Sikkerhedstjek', emoji: '🔍',
      instruction: 'Tilladt til venstre — Forbudt til højre',
      left: { label: '✅ Tilladt', items: ['🧸','👕','⚽','🤿','👟','📚','🎮','🪆'] },
      right: { label: '🚫 Forbudt', items: ['✂️','🔋','🔫','💣','🪓','🧨','🔪','🪤'] },
    },
    money: {
      title: 'Pengesorterer', emoji: '💵',
      instruction: 'Penge til venstre — Skrald til højre',
      left: { label: '💵 Penge', items: ['💵','💶','💴','💷','💰','🪙'] },
      right: { label: '🗑️ Skrald', items: ['📎','🍬','🧾','🗝️','🪝','📌'] },
    },
  };

  const cfg = SKINS[skin] || SKINS.security;
  const allItems = [...cfg.left.items.map(e => ({ emoji: e, correct: 'left' })),
  ...cfg.right.items.map(e => ({ emoji: e, correct: 'right' }))];

  const [items] = useState(() => [...allItems, ...allItems].sort(() => Math.random() - 0.5).slice(0, 16));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [swipeDir, setSwipeDir] = useState(null);
  const doneRef = useRef(false);
  const touchStartX = useRef(null);

  const choose = (dir) => {
    if (doneRef.current || feedback) return;
    const current = items[index];
    const correct = dir === current.correct;
    const newScore = correct ? score + 1 : score;
    setScore(newScore);
    setFeedback(correct ? 'correct' : 'wrong');
    setSwipeDir(dir);
    setTimeout(() => {
      setFeedback(null);
      setSwipeDir(null);
      const next = index + 1;
      if (next >= items.length) {
        doneRef.current = true;
        onComplete(calcBonus(newScore, items.length, maxBonus));
      } else {
        setIndex(next);
      }
    }, 400);
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) choose(diff < 0 ? 'left' : 'right');
    touchStartX.current = null;
  };

  const handleTimeUp = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(calcBonus(score, items.length, maxBonus));
  };

  const current = items[index];

  return (
    <MiniGameShell title={cfg.title} emoji={cfg.emoji} instruction={cfg.instruction}
    timeLimit={30} score={score} maxScore={items.length} onTimeUp={handleTimeUp}>
    <div className="flex-1 flex flex-col justify-center p-6 gap-5">
    <div
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    className={`bg-slate-800/60 rounded-2xl p-8 border text-center transition-all select-none ${
      feedback === 'correct' ? 'border-green-500/50 bg-green-500/10' :
      feedback === 'wrong' ? 'border-red-500/50 bg-red-500/10' : 'border-white/5'
    } ${swipeDir === 'left' ? '-translate-x-4' : swipeDir === 'right' ? 'translate-x-4' : ''}`}
    style={{ transition: 'transform 0.2s, background 0.2s' }}
    >
    <div className="text-6xl mb-3">{current?.emoji}</div>
    {feedback && (
      <div className={`text-lg font-black ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
      {feedback === 'correct' ? '✓' : '✗'}
      </div>
    )}
    </div>
    <div className="grid grid-cols-2 gap-3">
    <button onClick={() => choose('left')}
    className="py-4 rounded-2xl bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 active:scale-95 font-black text-white text-sm transition-all">
    ← {cfg.left.label}
    </button>
    <button onClick={() => choose('right')}
    className="py-4 rounded-2xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 active:scale-95 font-black text-white text-sm transition-all">
    {cfg.right.label} →
    </button>
    </div>
    <div className="text-[9px] font-black uppercase text-slate-600 text-center">
    {index + 1} / {items.length} — Svirp eller tryk
    </div>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE: MEMORY_NUMPAD — Bank L2
// Husk en talkode og indtast den på et keypad
// ═══════════════════════════════════════════════════════════
const MemoryNumpadEngine = ({ onComplete, maxBonus = 200 }) => {
  const generateCode = (len) => Array.from({ length: len }, () => Math.floor(Math.random() * 10));

  const [round, setRound] = useState(1);
  const [code] = useState(() => [generateCode(4), generateCode(5), generateCode(6)]);
  const [phase, setPhase] = useState('show');
  const [input, setInput] = useState([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const doneRef = useRef(false);

  const currentCode = code[round - 1];

  useEffect(() => {
    setPhase('show');
    setInput([]);
    const timeout = setTimeout(() => setPhase('enter'), 1500 + round * 300);
    return () => clearTimeout(timeout);
  }, [round]);

  const pressKey = (n) => {
    if (phase !== 'enter' || doneRef.current) return;
    const newInput = [...input, n];
    setInput(newInput);
    if (newInput.length === currentCode.length) {
      const correct = newInput.every((v, i) => v === currentCode[i]);
      const newScore = correct ? score + 1 : score;
      setScore(newScore);
      setFeedback(correct ? 'correct' : 'wrong');
      setTimeout(() => {
        setFeedback(null);
        if (round >= code.length) {
          doneRef.current = true;
          onComplete(calcBonus(newScore, code.length, maxBonus));
        } else {
          setRound(r => r + 1);
        }
      }, 800);
    }
  };

  const handleTimeUp = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(calcBonus(score, code.length, maxBonus));
  };

  return (
    <MiniGameShell title="Pinkode" emoji="🔐" instruction="Husk og gentag koden"
    timeLimit={35} score={score} maxScore={code.length} onTimeUp={handleTimeUp}>
    <div className="flex-1 flex flex-col justify-center items-center p-6 gap-5">
    {phase === 'show' ? (
      <div className="text-center">
      <div className="text-[9px] font-black uppercase text-slate-500 mb-4">Husk denne kode!</div>
      <div className="flex gap-3 justify-center">
      {currentCode.map((n, i) => (
        <div key={i} className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center font-black text-2xl text-white animate-pulse">
        {n}
        </div>
      ))}
      </div>
      </div>
    ) : (
      <>
      <div className="flex gap-2 justify-center min-h-[48px]">
      {Array.from({ length: currentCode.length }).map((_, i) => (
        <div key={i} className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-lg transition-all ${
          i < input.length
          ? feedback === 'correct' ? 'bg-green-500/30 border-green-500 text-green-300'
          : feedback === 'wrong' ? 'bg-red-500/30 border-red-500 text-red-300'
          : 'bg-blue-600/20 border-blue-500/40 text-white'
          : 'bg-slate-800 border-white/10 text-slate-600'
        }`}>
        {i < input.length ? input[i] : '·'}
        </div>
      ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
      {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
        <button key={i}
        onClick={() => {
          if (k === '⌫') setInput(p => p.slice(0, -1));
          else if (k !== '') pressKey(k);
        }}
        className={`h-14 rounded-2xl font-black text-xl transition-all active:scale-90 border ${
          k === '' ? 'opacity-0 pointer-events-none' :
          'bg-white/5 border-white/10 text-white hover:bg-blue-600/20'
        }`}>
        {k}
        </button>
      ))}
      </div>
      </>
    )}
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// KATEGORI → ENGINE MAPPING
// ═══════════════════════════════════════════════════════════
const ENGINE_MAP = {
  cafe: {
    1: (props) => <CleanerEngine {...props} maxBonus={120} />,
    2: (props) => <MemoryEngine {...props} items={['☕','🥐','🥨','🍪','🧁','🍵','🫖','🍰']} maxBonus={160} />,
  },
  restaurant: {
    1: (props) => <CleanerEngine {...props} maxBonus={120} />,
    2: (props) => <MemoryEngine {...props} items={['🍕','🌮','🍔','🍷','🍺','🥙','🍝','🥗']} maxBonus={170} />,
    3: (props) => <RecipeEngine {...props} maxBonus={220} />,
  },
  havn: {
    1: (props) => <StackerEngine {...props} emoji="📦" label="STOP! 📦" maxBonus={180} rounds={5} />,
    2: (props) => <GeoSortEngine {...props} skin="cargo" maxBonus={200} />,
    3: (props) => <StackerEngine {...props} emoji="🏗️" label="SLIP! 🏗️" maxBonus={240} rounds={7} />,
  },
  lufthavn: {
    1: (props) => <StackerEngine {...props} emoji="🧳" label="STOP! 🧳" maxBonus={180} rounds={5} />,
    2: (props) => <GeoSortEngine {...props} skin="passport" maxBonus={200} />,
    3: (props) => <SwiperEngine {...props} skin="security" maxBonus={220} />,
  },
  bank: {
    1: (props) => <SwiperEngine {...props} skin="money" maxBonus={160} />,
    2: (props) => <MemoryNumpadEngine {...props} maxBonus={200} />,
    3: (props) => <GeoSortEngine {...props} skin="currency" maxBonus={240} />,
  },
};

// ═══════════════════════════════════════════════════════════
// HOVED-EXPORT
// ═══════════════════════════════════════════════════════════
export const MiniGame = ({ job, city, playerCountry, onComplete }) => {
  const category = job?.category;
  const level = job?.requiredLevel ?? 1;
  const engineFn = ENGINE_MAP[category]?.[level];

  if (!engineFn) {
    // Fallback hvis kategori/level ikke matcher
    return <MemoryEngine onComplete={onComplete} maxBonus={150} />;
  }

  return engineFn({ onComplete, playerCountry, city });
};

export default MiniGame;
