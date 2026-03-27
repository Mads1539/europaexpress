import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════
// FÆLLES SHELL — wrapper om alle mini-spil
// ═══════════════════════════════════════════════════════════
const MiniGameShell = ({ title, emoji, instruction, timeLimit = 15, children, score, maxScore }) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 0.1)), 100);
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
    <div
    className={`h-full rounded-full transition-all ${barColor}`}
    style={{ width: `${pct * 100}%`, transition: 'width 0.1s linear' }}
    />
    </div>
    </div>
    <div className="flex-1 overflow-hidden flex flex-col">
    {children}
    </div>
    </div>
  );
};

const calcBonus = (score, maxScore, maxBonus) => {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * maxBonus);
};

// ═══════════════════════════════════════════════════════════
// ENGINE 1: QUIZ — Turistguide
// ═══════════════════════════════════════════════════════════
const QUIZ_DATA = {
  København: [
    { q: 'Hvad hedder den lille havfrue på dansk?', a: 'Den Lille Havfrue', opts: ['Den Lille Havfrue', 'Arielle', 'Marina', 'Sirenita'] },
    { q: 'Hvilket år blev Tivoli åbnet?', a: '1843', opts: ['1843', '1901', '1776', '1922'] },
    { q: 'Hvad er Nyhavn kendt for?', a: 'Farverige huse langs kanalen', opts: ['Farverige huse langs kanalen', 'En stor kirke', 'Et berømt marked', 'En gammel borg'] },
  ],
  Hamburg: [
    { q: 'Hamburg ligger ved hvilken flod?', a: 'Elben', opts: ['Elben', 'Rhinen', 'Weser', 'Donau'] },
    { q: 'Hvad hedder Hamburgs store musikarena?', a: 'Elbphilharmonie', opts: ['Elbphilharmonie', 'Hamburger Dom', 'Reeperbahn Hall', 'Alster Arena'] },
    { q: 'Hamburg er Tysklands ... største by?', a: 'Næststørste', opts: ['Næststørste', 'Største', 'Tredjestørste', 'Fjerdestørste'] },
  ],
  Paris: [
    { q: 'I hvilket år blev Eiffeltårnet bygget?', a: '1889', opts: ['1889', '1901', '1856', '1923'] },
    { q: 'Hvad hedder Paris\' største museum?', a: 'Louvre', opts: ['Louvre', 'Orsay', 'Pompidou', 'Rodin'] },
    { q: 'Hvilken flod løber gennem Paris?', a: 'Seine', opts: ['Seine', 'Loire', 'Rhône', 'Garonne'] },
  ],
  Amsterdam: [
    { q: 'Hvor mange kanaler har Amsterdam cirka?', a: '165', opts: ['165', '42', '300', '88'] },
    { q: 'Hvad producerer Holland mest af i verden?', a: 'Tulipaner', opts: ['Tulipaner', 'Ost', 'Øl', 'Vindmøller'] },
    { q: 'Hvem malede "Nattevagten"?', a: 'Rembrandt', opts: ['Rembrandt', 'Vermeer', 'Van Gogh', 'Rubens'] },
  ],
  default: [
    { q: 'Hvad er Euro-symbolet?', a: '€', opts: ['€', '$', '£', '¥'] },
    { q: 'Hvilket kontinent er Europa på?', a: 'Europa', opts: ['Europa', 'Asien', 'Afrika', 'Oceanien'] },
    { q: 'Hvad er Europas længste flod?', a: 'Volga', opts: ['Volga', 'Donau', 'Rhinen', 'Themsen'] },
  ],
};

const QuizEngine = ({ city, onComplete }) => {
  // FIX: låst fast ved mount så spørgsmålene ikke re-shuffles
  const questions = useRef(
    [...(QUIZ_DATA[city] || QUIZ_DATA.default)].sort(() => Math.random() - 0.5).slice(0, 3)
  );
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [done, setDone] = useState(false);

  const answer = (opt) => {
    if (chosen) return;
    const correct = opt === questions.current[qi].a;
    setChosen(opt);
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);
    setTimeout(() => {
      if (qi + 1 >= questions.current.length) {
        setDone(true);
        onComplete(calcBonus(newScore, questions.current.length, 200));
      } else {
        setQi(q => q + 1);
        setChosen(null);
      }
    }, 900);
  };

  if (done) return null;
  const q = questions.current[qi];

  return (
    <MiniGameShell title="Turistguide Quiz" emoji="🗺️" instruction="Svar rigtigt på spørgsmålene" timeLimit={20} score={score} maxScore={questions.current.length}>
    <div className="flex-1 flex flex-col justify-center p-6 gap-5">
    <div className="text-center">
    <div className="text-[9px] font-black uppercase text-slate-500 mb-2">Spørgsmål {qi + 1} / {questions.current.length}</div>
    <div className="font-black text-lg text-white leading-snug">{q.q}</div>
    </div>
    <div className="grid grid-cols-2 gap-3">
    {q.opts.map(opt => {
      const isChosen = chosen === opt;
      const isCorrect = opt === q.a;
      let cls = 'bg-white/5 border-white/10 text-white';
      if (isChosen && isCorrect) cls = 'bg-green-500/30 border-green-500 text-green-300';
      else if (isChosen && !isCorrect) cls = 'bg-red-500/30 border-red-500 text-red-300';
      else if (chosen && isCorrect) cls = 'bg-green-500/20 border-green-500/50 text-green-400';
      return (
        <button key={opt} onClick={() => answer(opt)}
        className={`p-3 rounded-2xl border font-black text-sm transition-all active:scale-95 ${cls}`}>
        {opt}
        </button>
      );
    })}
    </div>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE 2: MEMORY — Tjener/Café
// ═══════════════════════════════════════════════════════════
const MENU_ITEMS = ['🥐', '☕', '🥗', '🍺', '🥩', '🍰', '🥤', '🍳'];

const MemoryEngine = ({ onComplete }) => {
  const [phase, setPhase] = useState('show');
  const [order, setOrder] = useState([]);
  const [picked, setPicked] = useState([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const maxRounds = 3;

  const startRound = useCallback((r) => {
    const count = r + 1;
    const items = [...MENU_ITEMS].sort(() => Math.random() - 0.5).slice(0, count);
    setOrder(items);
    setPicked([]);
    setPhase('show');
    setTimeout(() => setPhase('pick'), 1500 + count * 300);
  }, []);

  useEffect(() => { startRound(round); }, [round]);

  const pick = (item) => {
    if (phase !== 'pick') return;
    const newPicked = [...picked, item];
    setPicked(newPicked);
    if (newPicked.length === order.length) {
      const correct = newPicked.every((p, i) => p === order[i]);
      const newScore = correct ? score + 1 : score;
      setScore(newScore);
      if (round >= maxRounds) {
        setPhase('done');
        onComplete(calcBonus(newScore, maxRounds, 180));
      } else {
        setTimeout(() => setRound(r => r + 1), 800);
      }
    }
  };

  return (
    <MiniGameShell title="Husk ordren!" emoji="☕" instruction="Husk hvad bordet bestiller" timeLimit={25} score={score} maxScore={maxRounds}>
    <div className="flex-1 flex flex-col justify-center items-center p-6 gap-6">
    {phase === 'show' && (
      <>
      <div className="text-[9px] font-black uppercase text-slate-500">Husk denne ordre!</div>
      <div className="flex gap-3 flex-wrap justify-center">
      {order.map((item, i) => (
        <div key={i} className="text-5xl animate-pulse">{item}</div>
      ))}
      </div>
      </>
    )}
    {phase === 'pick' && (
      <>
      <div className="text-[9px] font-black uppercase text-slate-500">
      Hvad bestilte de? ({picked.length}/{order.length})
      </div>
      <div className="flex gap-2 min-h-[56px] flex-wrap justify-center">
      {picked.map((p, i) => <div key={i} className="text-4xl">{p}</div>)}
      </div>
      <div className="grid grid-cols-4 gap-3">
      {MENU_ITEMS.map(item => (
        <button key={item} onClick={() => pick(item)}
        className="text-3xl p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-600/20 hover:border-blue-500/40 active:scale-90 transition-all">
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
// ENGINE 3: SORT — Bankassistent
// ═══════════════════════════════════════════════════════════
const SortEngine = ({ onComplete }) => {
  const [numbers] = useState(() =>
  Array.from({ length: 9 }, (_, i) => i + 1).sort(() => Math.random() - 0.5)
  );
  const [nextExpected, setNextExpected] = useState(1);
  const [correct, setCorrect] = useState([]);
  const [wrong, setWrong] = useState(null);
  const [score, setScore] = useState(0);
  const maxScore = 9;

  const tap = (n) => {
    if (correct.includes(n)) return;
    if (n === nextExpected) {
      const newCorrect = [...correct, n];
      setCorrect(newCorrect);
      setNextExpected(e => e + 1);
      setScore(newCorrect.length);
      if (newCorrect.length === maxScore) {
        onComplete(calcBonus(maxScore, maxScore, 220));
      }
    } else {
      setWrong(n);
      setTimeout(() => setWrong(null), 400);
    }
  };

  return (
    <MiniGameShell title="Tallsortering" emoji="🏦" instruction="Tryk tallene i stigende rækkefølge" timeLimit={20} score={score} maxScore={maxScore}>
    <div className="flex-1 flex flex-col justify-center items-center p-6 gap-4">
    <div className="text-[9px] font-black uppercase text-slate-500">Næste: <span className="text-white">{nextExpected}</span></div>
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
    {numbers.map(n => {
      const isDone = correct.includes(n);
      const isWrong = wrong === n;
      return (
        <button key={n} onClick={() => tap(n)}
        className={`h-16 rounded-2xl font-black text-2xl transition-all active:scale-90 border ${
          isDone ? 'bg-green-500/20 border-green-500/50 text-green-400 scale-95'
          : isWrong ? 'bg-red-500/30 border-red-500 text-red-400 animate-pulse'
          : 'bg-white/5 border-white/10 text-white hover:bg-blue-600/20 hover:border-blue-500/40'
        }`}>
        {isDone ? '✓' : n}
        </button>
      );
    })}
    </div>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE 4: STACK — Havnearbejder
// ═══════════════════════════════════════════════════════════
const StackEngine = ({ onComplete }) => {
  const [pos, setPos] = useState(0);
  const dirRef = useRef(1);
  const speedRef = useRef(1.5);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const maxRounds = 5;
  const roundRef = useRef(0);
  const posRef = useRef(0);
  const animRef = useRef();

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
    if (done) return;
    const inZone = posRef.current >= 35 && posRef.current <= 65;
    const newScore = inZone ? score + 1 : score;
    setScore(newScore);
    setFeedback(inZone ? 'good' : 'miss');
    setTimeout(() => setFeedback(null), 500);
    roundRef.current += 1;
    if (roundRef.current >= maxRounds) {
      setDone(true);
      onComplete(calcBonus(newScore, maxRounds, 200));
    } else {
      speedRef.current += 0.4;
    }
  };

  return (
    <MiniGameShell title="Stabling" emoji="🏗️" instruction="Tryk når kassen er i zonen" timeLimit={30} score={score} maxScore={maxRounds}>
    <div className="flex-1 flex flex-col justify-center items-center p-6 gap-6">
    <div className="text-[9px] font-black uppercase text-slate-500">
    Kasse {Math.min(roundRef.current + 1, maxRounds)} / {maxRounds}
    </div>
    <div className="relative w-full h-16 bg-slate-800/60 rounded-2xl border border-white/5 overflow-hidden">
    <div className="absolute top-0 bottom-0 left-[35%] right-[35%] bg-green-500/20 border-x border-green-500/40" />
    <div
    className="absolute top-1/2 -translate-y-1/2 text-3xl transition-none"
    style={{ left: `calc(${pos}% - 20px)` }}
    >
    📦
    </div>
    </div>
    <div className={`text-2xl font-black transition-all ${feedback === 'good' ? 'text-green-400' : feedback === 'miss' ? 'text-red-400' : 'opacity-0'}`}>
    {feedback === 'good' ? '✓ Perfekt!' : '✗ Misset!'}
    </div>
    <button onClick={tap}
    className="w-full py-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 font-black uppercase text-xl tracking-widest transition-all shadow-lg shadow-blue-900/50">
    STAB! 📦
    </button>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// ENGINE 5: ROUTE — Cykelkurer
// ═══════════════════════════════════════════════════════════
const ROUTE_SCENARIOS = [
  {
    situation: 'Det regner kraftigt fra vest.',
    routes: [
      { label: 'Rute A', desc: 'Går mod vest langs kanalen', correct: false, icon: '🌧️' },
      { label: 'Rute B', desc: 'Indre gader med tag over', correct: true, icon: '🏙️' },
      { label: 'Rute C', desc: 'Motorvejen — hurtig men åben', correct: false, icon: '🛣️' },
    ],
  },
{
  situation: 'Der er vejarbejde på hovedgaden.',
  routes: [
    { label: 'Rute A', desc: 'Hovedgaden — direkte', correct: false, icon: '🚧' },
    { label: 'Rute B', desc: 'Omvej via parken', correct: true, icon: '🌳' },
    { label: 'Rute C', desc: 'Cykelsuperstien', correct: true, icon: '🚲' },
  ],
},
{
  situation: 'Der er marked på torvet i dag.',
  routes: [
    { label: 'Rute A', desc: 'Igennem torvet', correct: false, icon: '🛒' },
    { label: 'Rute B', desc: 'Bag om biblioteket', correct: true, icon: '📚' },
    { label: 'Rute C', desc: 'Langs havnen', correct: true, icon: '⚓' },
  ],
},
];

const RouteEngine = ({ onComplete }) => {
  const [si, setSi] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  // FIX: låst fast ved mount
  const scenarios = useRef([...ROUTE_SCENARIOS].sort(() => Math.random() - 0.5).slice(0, 3));
  const maxRounds = scenarios.current.length;

  const pick = (route) => {
    if (chosen) return;
    setChosen(route);
    const isCorrect = route.correct;
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);
    setTimeout(() => {
      if (si + 1 >= maxRounds) {
        onComplete(calcBonus(newScore, maxRounds, 160));
      } else {
        setSi(s => s + 1);
        setChosen(null);
      }
    }, 900);
  };

  const scenario = scenarios.current[si];

  return (
    <MiniGameShell title="Rutevælger" emoji="🚲" instruction="Vælg den bedste rute" timeLimit={25} score={score} maxScore={maxRounds}>
    <div className="flex-1 flex flex-col justify-center p-6 gap-5">
    <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5 text-center">
    <div className="text-[9px] font-black uppercase text-slate-500 mb-1">Situation</div>
    <div className="font-black text-white text-base">{scenario.situation}</div>
    </div>
    <div className="space-y-3">
    {scenario.routes.map((route, i) => {
      const isChosen = chosen === route;
      const isCorrect = route.correct;
      let cls = 'bg-white/5 border-white/10 text-white';
      if (isChosen && isCorrect) cls = 'bg-green-500/30 border-green-500 text-green-300';
      else if (isChosen && !isCorrect) cls = 'bg-red-500/30 border-red-500 text-red-300';
      else if (chosen && isCorrect) cls = 'bg-green-500/20 border-green-500/50 text-green-400';
      return (
        <button key={i} onClick={() => pick(route)}
        className={`w-full p-4 rounded-2xl border transition-all active:scale-[0.98] text-left ${cls}`}>
        <div className="flex items-center gap-3">
        <span className="text-2xl">{route.icon}</span>
        <div>
        <div className="font-black text-sm">{route.label}</div>
        <div className="text-[10px] opacity-70 mt-0.5">{route.desc}</div>
        </div>
        </div>
        </button>
      );
    })}
    </div>
    </div>
    </MiniGameShell>
  );
};

// ═══════════════════════════════════════════════════════════
// HOVED-EXPORT — vælger engine baseret på job-type
// ═══════════════════════════════════════════════════════════
const JOB_MINIGAME_MAP = {
  'cph_guide': 'quiz', 'par_guide': 'quiz', 'rom_guide': 'quiz',
  'cph_waiter': 'memory', 'par_waiter': 'memory', 'hh_fish': 'memory', 'rom_pizza': 'memory', 'def_barista': 'memory',
  'zrh_bank': 'sort',
  'hh_dock': 'stack', 'hh_harbormaster': 'stack', 'cph_harbor': 'stack',
  'ams_courier': 'route', 'cph_bike': 'route',
};

const DEFAULT_MINIGAME_BY_TIER = { 1: 'memory', 2: 'sort' };

export const MiniGame = ({ job, city, onComplete }) => {
  // FIX: log job.id så vi kan se hvad der matcher
  const baseId = job?.id?.split('_').slice(0, 2).join('_') ?? '';
  const type = JOB_MINIGAME_MAP[job?.id] || JOB_MINIGAME_MAP[baseId] || DEFAULT_MINIGAME_BY_TIER[job?.tier] || 'memory';
  console.log('🎮 job.id:', job?.id, '| baseId:', baseId, '| type:', type);

  const engines = {
    quiz: <QuizEngine city={city} onComplete={onComplete} />,
    memory: <MemoryEngine onComplete={onComplete} />,
    sort: <SortEngine onComplete={onComplete} />,
    stack: <StackEngine onComplete={onComplete} />,
    route: <RouteEngine onComplete={onComplete} />,
  };

  return engines[type] || engines.memory;
};

export default MiniGame;
