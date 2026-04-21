import React, { useRef, useState } from 'react'; // Tilføj useState her
import {
  MapPin, Users, User, Ticket, Info,
  Train, Bus, Globe, Plane,
  ChevronRight, Flag, AlertTriangle, RotateCcw, Navigation, Clock
} from 'lucide-react';

import { CITIES, TRANSIT_LINES, TRAVEL_TYPES } from '../../../constants.js';
import { formatTime } from '../../../utils/formatting.js';
import { calculateStopInfo } from '../../../utils/formatting.js';
import { MiniGame } from '../../../Components/MiniGame.jsx';
import { StaticMiniMap } from '../../../Components/StaticMiniMap.jsx';
import {
  JOB_CATEGORIES,
  getLevelFromXP,
  getXPToNextLevel,
} from '../../../data/jobs.js';
import { countryFlags } from '../../../data/countries.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../../firebase.js';
// ─────────────────────────────────────────────────────────────────────────────
// PlayerView
//
// Props:
//   currentPlayer       – spillerens objekt fra gameState.players
//   gameState           – hele gameState fra Firebase
//   interpolatedTime    – det flydende ur (number)
//   playerTab / setPlayerTab
//   activeTab / setActiveTab
//   selectedDeparture / setSelectedDeparture
//   departures          – beregnet afgangsliste (fra App.jsx useMemo)
//   jobMarket           – liste af tilgængelige jobs i nuværende by
//   selectedJob / setSelectedJob
//   jobScreen / setJobScreen
//   jobEventChoice / setJobEventChoice
//   showMiniGame / setShowMiniGame
//   currentEventIndex / setCurrentEventIndex
//   eventResults / setEventResults
//   jackpotEvent
//   ticketScrollRef     – ref til horisontal scroll-container i billet
//   currentStopRef      – ref til det aktuelle stop i billet
//   travel(dep)         – starter en rejse
//   handleLocalTravel(city, mode)
//   handleStepOffNextStation()
// ─────────────────────────────────────────────────────────────────────────────

export function PlayerView({
  currentPlayer,
  gameState,
  interpolatedTime,
  playerTab, setPlayerTab,
  activeTab, setActiveTab,
  selectedDeparture, setSelectedDeparture,
  departures,
  jobMarket,
  selectedJob, setSelectedJob,
  jobScreen, setJobScreen,
  jobEventChoice, setJobEventChoice,
  showMiniGame, setShowMiniGame,
  currentEventIndex, setCurrentEventIndex,
  eventResults, setEventResults,
  jackpotEvent,
  ticketScrollRef,
  currentStopRef,
  travel,
  handleLocalTravel,
  handleStepOffNextStation,
  playerId,
  localTransportMode,
  setLocalTransportMode,
  getNearbyStations,
  handleTakeJob,
  subFilter, setSubFilter,
}) {

return (
    <div className="h-screen bg-black flex flex-col text-white font-mono select-none overflow-hidden">
      {/* TOP BAR: Profil & Økonomi - Tactical HUD Overhaul */}
      <div className="relative p-5 bg-[#0a0f1c]/80 backdrop-blur-2xl border-b border-white/5 overflow-hidden">
        {/* Subtil gradient glød i baggrunden */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 via-transparent to-green-500/5 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          {/* VENSTRE: Spiller Identitet */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {/* Avatar med status-ring */}
              <div className="text-3xl bg-slate-800/50 p-3 rounded-2xl border border-white/10 shadow-inner relative z-10">
                {currentPlayer.avatar}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0f1c] z-20 ${currentPlayer.isTraveling ? "bg-amber-500 animate-pulse" : "bg-green-500"}`}
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80">
                  Rejsende
                </span>
                <span className="text-[9px] font-mono text-slate-500 px-1.5 py-0.5 border border-slate-800 rounded">
                  ID: {currentPlayer.id?.slice(0, 5)}
                </span>
              </div>
              <div className="text-xl font-black italic tracking-tighter uppercase text-white leading-tight">
                {currentPlayer.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin
                  size={10}
                  className={
                    currentPlayer.isTraveling
                      ? "text-amber-500"
                      : "text-blue-500"
                  }
                />
                <span
                  className={`text-[10px] font-bold uppercase tracking-tight ${currentPlayer.isTraveling ? "text-amber-500 italic" : "text-slate-400"}`}
                >
                  {currentPlayer.isTraveling
                    ? "In Transit // Relocating"
                    : currentPlayer.currentCity}
                </span>
              </div>
            </div>
          </div>

          {/* HØJRE: Finanser & XP Bar */}
          <div className="flex flex-col items-end">
            <div className="bg-black/30 border border-white/5 px-4 py-2 rounded-2xl flex flex-col items-end shadow-xl">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                Penge
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                  {currentPlayer.money?.toLocaleString()}
                </span>
                <span className="text-sm font-black text-green-700">€</span>
              </div>
            </div>

            {/* XP/Level indikator (valgfri, men ser pro ud) */}
            <div className="mt-2 w-32">
              <div className="flex justify-between text-[7px] font-black uppercase text-slate-500 mb-1 px-1">
                <span>
                  Level {getLevelFromXP ? getLevelFromXP(currentPlayer.xp) : 1}
                </span>
                <span>XP</span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-1000"
                  style={{ width: "65%" }} // Erstat med din XP beregning
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dekorative hjørne-detaljer typisk for HUDs */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-500/30" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-500/30" />
      </div>
            {/* HOVEDINDHOLD */}
      <div className="flex-1 overflow-y-auto relative">
        {currentPlayer.isTraveling ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in duration-500 overflow-y-auto font-sans select-none">
            {(() => {
              const travelType =
                currentPlayer.travelType ||
                currentPlayer.segments?.[0]?.type ||
                "train";
              const activeRoute = TRANSIT_LINES.find(
                (line) => line.id === currentPlayer?.segments?.[0]?.lineId,
              ) || { color: "#2563eb", name: "Europa Express", label: "EX" };

              const finalArrival =
                currentPlayer.segments?.[currentPlayer.segments?.length - 1]
                  ?.arrival;
              const isActuallyArrived = interpolatedTime > finalArrival;
              const departureTime = currentPlayer.segments?.[0]?.departure;
              const fromCity = currentPlayer.segments?.[0]?.from || "...";
              const toCity = currentPlayer.destinationCity || "...";

              // Transport-specifikke konfigurationer
 const TICKET_CONFIG = {
                walking: {
                  accent: "#16a34a",
                  ticketStyle: "walking",
                },
                taxi: {
                  accent: "#ca8a04",
                  ticketStyle: "taxi",
                },
                train: {
                  accent: activeRoute.color || "#1d4ed8",
                  label: activeRoute.label || "RE",
                  description: activeRoute.name?.toUpperCase() || "REGIONALTOG",
                  ticketStyle: "train",
                },
                bus: {
                  accent: "#c2410c",
                  label: activeRoute.label || "BUS",
                  description: activeRoute.name?.toUpperCase() || "FLEXBUS",
                  ticketStyle: "bus",
                },
                flight: {
                  accent: "#0284c7",
                  label: activeRoute.label || "SK",
                  description: activeRoute.name?.toUpperCase() || "EUROPA AIRWAYS",
                  ticketStyle: "flight",
                },
                ferry: {
                  accent: "#0f766e",
                  label: activeRoute.label || "FERRY",
                  description: activeRoute.name?.toUpperCase() || "SCANDLINES",
                  ticketStyle: "ferry",
                },
                highspeed: {
                  accent: "#b91c1c",
                  label: activeRoute.label || "EC",
                  description: activeRoute.name?.toUpperCase() || "EUROSTAR / ICE",
                  ticketStyle: "highspeed",
                },
                metro: {
                  accent: "#0369a1",
                  label: activeRoute.label || "M",
                  description: activeRoute.name?.toUpperCase() || "METRO / S-TOG",
                  ticketStyle: "metro",
                },
              };

              const cfg = TICKET_CONFIG[travelType] || TICKET_CONFIG.train;
              const isDark = travelType === "flight";

              return (
                <>
                  {/* ===== WALKING: Håndskrevet gå-pas på linjeret papir ===== */}
                  {cfg.ticketStyle === "walking" && (
                    <div className="w-full max-w-sm">
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap');
                        .walking-paper {
                          background: #fdf6e3;
                          background-image: repeating-linear-gradient(transparent, transparent 27px, #d4c9a8 27px, #d4c9a8 28px);
                          font-family: 'Caveat', cursive;
                        }
                      `}</style>
                      <div className="walking-paper rounded-2xl shadow-[4px_6px_20px_rgba(0,0,0,0.35)] overflow-hidden border-2 border-amber-200/60 rotate-[-0.5deg]">
                        <div className="relative h-5 bg-green-700 overflow-hidden">
                          <svg viewBox="0 0 400 20" className="absolute bottom-0 w-full" preserveAspectRatio="none">
                            <path d="M0,0 Q20,18 40,8 Q60,0 80,14 Q100,20 120,6 Q140,0 160,16 Q180,20 200,4 Q220,0 240,18 Q260,20 280,8 Q300,0 320,14 Q340,20 360,6 Q380,0 400,12 L400,0 Z" fill="#fdf6e3"/>
                          </svg>
                          <span className="absolute top-1 left-4 text-green-100 text-[9px] font-black uppercase tracking-[0.3em]">🌿 Gå-pas</span>
                        </div>
                        <div className="p-5 pb-4">
                          <div className="text-4xl font-black text-green-800 leading-none mb-1">Til fods</div>
                          <div className="text-amber-700 text-sm mb-5">ingen billet nødvendig</div>
                          <div className="flex justify-between items-end mb-5">
                            <div>
                              <div className="text-[10px] text-amber-600 uppercase tracking-widest mb-0.5">Fra</div>
                              <div className="text-2xl text-slate-800">{fromCity}</div>
                              <div className="text-amber-700 text-sm">{departureTime != null ? formatTime(departureTime) : "--:--"}</div>
                            </div>
                            <div className="text-3xl">🚶‍♂️</div>
                            <div className="text-right">
                              <div className="text-[10px] text-amber-600 uppercase tracking-widest mb-0.5">Til</div>
                              <div className="text-2xl text-slate-800">{toCity}</div>
                              <div className="text-amber-700 text-sm">{finalArrival != null ? formatTime(finalArrival) : "--:--"}</div>
                            </div>
                          </div>
                          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                            <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-6 pt-3 px-4">
                              <div className="flex items-center min-w-max">
                                {currentPlayer.segments?.map((seg, idx) => {
                                  const isPast = interpolatedTime > seg.arrival;
                                  const isCurr = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;
                                  return (
                                    <React.Fragment key={idx}>
                                      <div ref={isCurr ? currentStopRef : null} className="flex flex-col items-center relative">
                                        <div className="w-4 h-4 rounded-full border-[3px] z-20 transition-all"
                                          style={{ backgroundColor: isPast ? "#16a34a" : "#fff", borderColor: isCurr ? "#16a34a" : isPast ? "transparent" : "#d4c9a8", transform: isCurr ? "scale(1.4)" : "scale(1)" }} />
                                        <span className="text-[8px] mt-1 absolute -bottom-5 whitespace-nowrap text-amber-800" style={{fontFamily:'Caveat',fontWeight:600}}>{seg.from}</span>
                                      </div>
                                      <div className="relative w-14 h-[2px] bg-amber-200 -mx-0.5 z-10">
                                        <div className="absolute left-0 top-0 h-full bg-green-600 transition-all duration-1000" style={{ width: isPast ? "100%" : isCurr ? "50%" : "0%" }} />
                                      </div>
                                      {idx === currentPlayer.segments.length - 1 && (
                                        <div className="flex flex-col items-center relative">
                                          <div className="w-4 h-4 rounded-full border-[3px] border-amber-300 bg-white z-20" />
                                          <span className="text-[8px] mt-1 absolute -bottom-5 whitespace-nowrap text-amber-800" style={{fontFamily:'Caveat',fontWeight:600}}>{seg.to}</span>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between items-center">
                            <span className="text-amber-600 text-sm">Pris:</span>
                            <span className="text-3xl text-green-700">GRATIS ✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== TAXI: Sort termisk kvittering med gult taksameter ===== */}
                  {cfg.ticketStyle === "taxi" && (
                    <div className="w-full max-w-sm">
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
                        .taxi-receipt { font-family: 'Share Tech Mono', monospace; }
                        @keyframes taxi-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
                        .taxi-blink { animation: taxi-blink 1.2s infinite; }
                      `}</style>
                      <div className="taxi-receipt bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(202,138,4,0.25)] border border-yellow-500/20">
                        <div className="h-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-5">
                            <div>
                              <div className="text-yellow-400 text-[10px] tracking-[0.4em] uppercase mb-0.5">Taxa Service</div>
                              <div className="text-white text-2xl font-black uppercase">Kvittering</div>
                            </div>
                            <div className="bg-yellow-400 text-black px-3 py-2 rounded-lg">
                              <div className="text-[9px] font-black uppercase tracking-widest">Fare</div>
                              <div className="text-xl font-black">{Math.round(Math.max(0, (interpolatedTime - (departureTime || 0)) * 2))}€</div>
                            </div>
                          </div>
                          <div className="border-t border-dashed border-white/10 mb-4" />
                          <div className="space-y-3 mb-5">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                              <div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest">Afhentning</div>
                                <div className="text-white text-sm">{fromCity} — {departureTime != null ? formatTime(departureTime) : "--:--"}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-white shrink-0" />
                              <div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest">Destination</div>
                                <div className="text-white text-sm">{toCity} — {finalArrival != null ? formatTime(finalArrival) : "--:--"}</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-black rounded-xl p-4 border border-yellow-500/30 mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-500 text-[10px] uppercase tracking-widest">Taksameter</span>
                              <span className="taxi-blink text-[8px] text-yellow-400 uppercase tracking-widest">● Live</span>
                            </div>
                            <div className="text-yellow-400 text-4xl text-right">
                              {Math.round(Math.max(0, (interpolatedTime - (departureTime || 0)) * 2)).toString().padStart(3,"0")}
                              <span className="text-xl">€</span>
                            </div>
                          </div>
                          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                            <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-6 pt-3 px-4">
                              <div className="flex items-center min-w-max">
                                {currentPlayer.segments?.map((seg, idx) => {
                                  const isPast = interpolatedTime > seg.arrival;
                                  const isCurr = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;
                                  return (
                                    <React.Fragment key={idx}>
                                      <div ref={isCurr ? currentStopRef : null} className="flex flex-col items-center relative">
                                        <div className="w-4 h-4 rounded-full border-[3px] z-20 transition-all"
                                          style={{ backgroundColor: isPast ? "#ca8a04" : "#1a1a1a", borderColor: isCurr ? "#fbbf24" : isPast ? "transparent" : "#374151", transform: isCurr ? "scale(1.4)" : "scale(1)" }} />
                                        <span className="text-[8px] font-mono mt-1 absolute -bottom-5 whitespace-nowrap text-slate-500 uppercase">{seg.from}</span>
                                      </div>
                                      <div className="relative w-14 h-[2px] bg-slate-800 -mx-0.5 z-10">
                                        <div className="absolute left-0 top-0 h-full bg-yellow-500 transition-all duration-1000" style={{ width: isPast ? "100%" : isCurr ? "50%" : "0%" }} />
                                      </div>
                                      {idx === currentPlayer.segments.length - 1 && (
                                        <div className="flex flex-col items-center relative">
                                          <div className="w-4 h-4 rounded-full border-[3px] border-slate-700 bg-[#1a1a1a] z-20" />
                                          <span className="text-[8px] font-mono mt-1 absolute -bottom-5 whitespace-nowrap text-slate-500 uppercase">{seg.to}</span>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />
                      </div>
                    </div>
                  )}

                  {/* ===== REGIONALTOG: Klassisk nordisk jernbanebillet med punch-huller ===== */}
                  {cfg.ticketStyle === "train" && (
                    <div className="w-full max-w-sm">
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;700;900&display=swap');
                        .train-ticket { font-family: 'Source Serif 4', serif; }
                        .train-punch { width:18px; height:18px; border-radius:50%; background:#0f172a; flex-shrink:0; }
                      `}</style>
                      <div className="train-ticket bg-[#f7f3e9] rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
                        style={{ borderTop: `8px solid ${cfg.accent}` }}>
                        <div className="flex justify-between px-4 -mt-1 mb-0">
                          {[...Array(7)].map((_, i) => <div key={i} className="train-punch" />)}
                        </div>
                        <div className="px-6 pt-3 pb-2">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-[8px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-0.5">Regionaltog</div>
                              <div className="text-2xl font-black italic text-slate-900 leading-none uppercase tracking-tighter">{cfg.description}</div>
                            </div>
                            <div className="px-3 py-2 rounded-lg text-white font-black text-xl shadow-md" style={{ backgroundColor: cfg.accent }}>
                              {cfg.label}
                            </div>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-5">
                            <div>
                              <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Fra</div>
                              <div className="text-xl font-black text-slate-900 leading-tight">{fromCity}</div>
                              <div className="text-[11px] font-bold mt-0.5" style={{ color: cfg.accent }}>{departureTime != null ? formatTime(departureTime) : "--:--"}</div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="text-lg">🚆</div>
                              <div className="w-12 border-t border-dashed border-slate-300" />
                            </div>
                            <div className="text-right">
                              <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Til</div>
                              <div className="text-xl font-black text-slate-900 leading-tight">{toCity}</div>
                              <div className="text-[11px] font-bold mt-0.5" style={{ color: cfg.accent }}>{finalArrival != null ? formatTime(finalArrival) : "--:--"}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-inner mb-4">
                            <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-7 pt-4 px-6">
                              <div className="flex items-center min-w-max">
                                {currentPlayer.segments?.map((seg, idx) => {
                                  const isPast = interpolatedTime > seg.arrival;
                                  const isCurr = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;
                                  return (
                                    <React.Fragment key={idx}>
                                      <div ref={isCurr ? currentStopRef : null} className="flex flex-col items-center relative">
                                        <div className="w-5 h-5 rounded-full border-[3px] z-20 transition-all duration-500"
                                          style={{ backgroundColor: isPast ? cfg.accent : "#fff", borderColor: isCurr ? cfg.accent : isPast ? "transparent" : "#cbd5e1", transform: isCurr ? "scale(1.3)" : "scale(1)" }} />
                                        <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap text-slate-400 uppercase tracking-tight">{seg.from}</span>
                                      </div>
                                      <div className="relative w-16 h-[3px] -mx-0.5 z-10" style={{ backgroundColor: "#e2e8f0" }}>
                                        <div className="absolute left-0 top-0 h-full transition-all duration-1000" style={{ width: isPast ? "100%" : isCurr ? "50%" : "0%", backgroundColor: cfg.accent }} />
                                      </div>
                                      {idx === currentPlayer.segments.length - 1 && (
                                        <div className="flex flex-col items-center relative">
                                          <div className="w-5 h-5 rounded-full border-[3px] border-slate-200 bg-white z-20" />
                                          <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap text-slate-400 uppercase tracking-tight">{seg.to}</span>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-center opacity-30 mb-1">
                            <div className="flex gap-[2px] h-7 w-full justify-center">
                              {[...Array(38)].map((_, i) => <div key={i} className={`bg-slate-900 ${i % 3 === 0 ? "w-[3px]" : "w-[1px]"}`} />)}
                            </div>
                            <p className="text-[7px] font-mono text-slate-600 tracking-[0.5em] mt-1">{cfg.label}-{playerId?.slice(0,8).toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="flex justify-between px-4 mt-0">
                          {[...Array(7)].map((_, i) => <div key={i} className="train-punch" />)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== HØJHASTIGHEDSTOG: Premium mørk med rød stålstribe ===== */}
                  {cfg.ticketStyle === "highspeed" && (
                    <div className="w-full max-w-sm">
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800;900&display=swap');
                        .hs-ticket { font-family: 'Barlow Condensed', sans-serif; }
                        @keyframes hs-streak { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
                        .hs-streak { animation: hs-streak 2.5s ease-in-out infinite; }
                      `}</style>
                      <div className="hs-ticket rounded-2xl overflow-hidden shadow-[0_12px_50px_rgba(185,28,28,0.3),0_0_0_1px_rgba(255,255,255,0.05)]"
                        style={{ background: "linear-gradient(160deg, #1c1917 0%, #0c0a09 60%, #1c0000 100%)" }}>
                        <div className="relative h-1.5 overflow-hidden" style={{ background: "linear-gradient(90deg, #7f1d1d, #dc2626, #ef4444, #dc2626, #7f1d1d)" }}>
                          <div className="hs-streak absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        </div>
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <div className="text-red-500 text-[9px] tracking-[0.4em] uppercase font-bold mb-0.5">Højhastighedstog</div>
                              <div className="text-white text-3xl font-black uppercase tracking-tight leading-none">{cfg.description}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Linje</div>
                              <div className="text-3xl font-black text-red-500">{cfg.label}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-[1fr_60px_1fr] items-center mb-6">
                            <div>
                              <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Afgang</div>
                              <div className="text-4xl font-black text-white uppercase leading-none">{fromCity.slice(0,3)}</div>
                              <div className="text-sm text-slate-400 mt-0.5">{fromCity}</div>
                              <div className="text-red-400 text-xs font-bold mt-1">{departureTime != null ? formatTime(departureTime) : "--:--"}</div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="text-2xl">🚄</div>
                              <div className="text-[7px] text-slate-600 uppercase tracking-widest">300 km/t</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Ankomst</div>
                              <div className="text-4xl font-black text-white uppercase leading-none">{toCity.slice(0,3)}</div>
                              <div className="text-sm text-slate-400 mt-0.5">{toCity}</div>
                              <div className="text-red-400 text-xs font-bold mt-1">{finalArrival != null ? formatTime(finalArrival) : "--:--"}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 mb-5">
                            <div className="px-3 py-1 rounded-lg border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest">1. Klasse</div>
                            <div className="px-3 py-1 rounded-lg border border-white/10 text-slate-400 text-[10px] uppercase tracking-widest">{currentPlayer.name}</div>
                          </div>
                          <div className="rounded-xl p-3 border border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-7 pt-4 px-4">
                              <div className="flex items-center min-w-max">
                                {currentPlayer.segments?.map((seg, idx) => {
                                  const isPast = interpolatedTime > seg.arrival;
                                  const isCurr = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;
                                  return (
                                    <React.Fragment key={idx}>
                                      <div ref={isCurr ? currentStopRef : null} className="flex flex-col items-center relative">
                                        <div className="w-5 h-5 rounded-full border-2 z-20 transition-all"
                                          style={{ backgroundColor: isPast ? "#dc2626" : "transparent", borderColor: isCurr ? "#ef4444" : isPast ? "#dc2626" : "#374151", transform: isCurr ? "scale(1.4)" : "scale(1)", boxShadow: isCurr ? "0 0 12px rgba(239,68,68,0.6)" : "none" }} />
                                        <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap uppercase tracking-tight text-slate-500">{seg.from}</span>
                                      </div>
                                      <div className="relative w-16 h-[2px] bg-slate-800 -mx-0.5 z-10">
                                        <div className="absolute left-0 top-0 h-full bg-red-600 transition-all duration-1000" style={{ width: isPast ? "100%" : isCurr ? "50%" : "0%" }} />
                                      </div>
                                      {idx === currentPlayer.segments.length - 1 && (
                                        <div className="flex flex-col items-center relative">
                                          <div className="w-5 h-5 rounded-full border-2 border-slate-700 bg-transparent z-20" />
                                          <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap uppercase tracking-tight text-slate-500">{seg.to}</span>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="relative h-1.5 overflow-hidden" style={{ background: "linear-gradient(90deg, #7f1d1d, #dc2626, #ef4444, #dc2626, #7f1d1d)" }}>
                          <div className="hs-streak absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== METRO / S-TOG: Magnetkort i modernistisk stil ===== */}
                  {cfg.ticketStyle === "metro" && (
                    <div className="w-full max-w-sm">
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700;900&display=swap');
                        .metro-card { font-family: 'DM Sans', sans-serif; }
                        @keyframes metro-scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
                        .metro-scan { animation: metro-scan 3s ease-in-out infinite; }
                      `}</style>
                      <div className="metro-card rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(3,105,161,0.4)]"
                        style={{ background: "linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)" }}>
                        <div className="relative h-8 bg-[#1e3a4f] overflow-hidden flex items-center px-4">
                          <div className="relative w-full h-3 bg-[#2a2a2a] rounded-sm overflow-hidden">
                            <div className="metro-scan absolute inset-x-0 h-full bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex justify-between items-center mb-5">
                            <div>
                              <div className="text-sky-300 text-[9px] tracking-[0.3em] uppercase font-bold">Urbantransit</div>
                              <div className="text-white text-2xl font-black uppercase">{cfg.description}</div>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-white border-2 border-white/30" style={{ backgroundColor: "#0284c7" }}>
                              {cfg.label}
                            </div>
                          </div>
                          <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/10">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-[8px] text-sky-300 uppercase tracking-widest font-bold mb-1">Afgang</div>
                                <div className="text-white font-black text-lg leading-none">{fromCity}</div>
                                <div className="text-sky-300 text-xs mt-1 font-bold">{departureTime != null ? formatTime(departureTime) : "--:--"}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[8px] text-sky-300 uppercase tracking-widest font-bold mb-1">Ankomst</div>
                                <div className="text-white font-black text-lg leading-none">{toCity}</div>
                                <div className="text-sky-300 text-xs mt-1 font-bold">{finalArrival != null ? formatTime(finalArrival) : "--:--"}</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-black/20 rounded-xl p-3 border border-white/5 mb-4">
                            <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-7 pt-4 px-4">
                              <div className="flex items-center min-w-max">
                                {currentPlayer.segments?.map((seg, idx) => {
                                  const isPast = interpolatedTime > seg.arrival;
                                  const isCurr = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;
                                  return (
                                    <React.Fragment key={idx}>
                                      <div ref={isCurr ? currentStopRef : null} className="flex flex-col items-center relative">
                                        <div className="w-5 h-5 rounded-full border-[3px] border-white z-20 transition-all"
                                          style={{ backgroundColor: isPast ? "#38bdf8" : isCurr ? "#fff" : "transparent", transform: isCurr ? "scale(1.35)" : "scale(1)", boxShadow: isCurr ? "0 0 14px rgba(56,189,248,0.8)" : "none" }} />
                                        <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap text-sky-200 uppercase">{seg.from}</span>
                                      </div>
                                      <div className="relative w-14 h-[3px] bg-white/20 -mx-0.5 z-10 rounded-full">
                                        <div className="absolute left-0 top-0 h-full bg-sky-300 rounded-full transition-all duration-1000" style={{ width: isPast ? "100%" : isCurr ? "50%" : "0%" }} />
                                      </div>
                                      {idx === currentPlayer.segments.length - 1 && (
                                        <div className="flex flex-col items-center relative">
                                          <div className="w-5 h-5 rounded-full border-[3px] border-white/40 bg-transparent z-20" />
                                          <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap text-sky-200 uppercase">{seg.to}</span>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                              <div className="text-[7px] text-sky-400 uppercase tracking-widest">Zone</div>
                              <div className="text-white font-black">1–3</div>
                            </div>
                            <div className="flex-1 bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                              <div className="text-[7px] text-sky-400 uppercase tracking-widest">Passager</div>
                              <div className="text-white font-black text-xs truncate">{currentPlayer.name}</div>
                            </div>
                            <div className="flex-1 bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                              <div className="text-[7px] text-sky-400 uppercase tracking-widest">Type</div>
                              <div className="text-white font-black">Enkelt</div>
                            </div>
                          </div>
                        </div>
                        <div className="h-6 bg-[#1e3a4f] flex items-center justify-center">
                          <div className="text-[7px] font-mono text-sky-800 tracking-[0.5em]">{cfg.label}·{playerId?.slice(0,10).toUpperCase()}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== BUS: Farvestripet retro klippekort ===== */}
                  {cfg.ticketStyle === "bus" && (
                    <div className="w-full max-w-sm">
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
                        .bus-ticket { font-family: 'Nunito', sans-serif; }
                      `}</style>
                      <div className="bus-ticket rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(194,65,12,0.4)] border border-orange-300/40">
                        <div className="flex h-3">
                          {["#f97316","#fb923c","#fdba74","#fb923c","#f97316","#ea580c","#f97316","#fb923c","#fdba74","#fb923c"].map((c,i) => (
                            <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="bg-orange-50 px-5 pt-4 pb-2">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-[8px] text-orange-500 uppercase tracking-[0.3em] font-bold mb-0.5">Bybuskort</div>
                              <div className="text-2xl font-black text-slate-900 uppercase leading-none">{cfg.description}</div>
                            </div>
                            <div className="bg-orange-600 text-white px-3 py-1.5 rounded-xl font-black text-lg shadow-md">{cfg.label}</div>
                          </div>
                          <div className="grid grid-cols-10 gap-1 mb-4">
                            {[...Array(10)].map((_, i) => {
                              const progress = (interpolatedTime - (departureTime || 0)) / Math.max(1, (finalArrival || 0) - (departureTime || 0));
                              const filled = i < Math.floor(progress * 10);
                              return (
                                <div key={i} className={`aspect-square rounded-md flex items-center justify-center text-sm font-black transition-all ${filled ? "bg-orange-600 text-white shadow-sm" : "bg-white border-2 border-orange-200 text-orange-200"}`}>
                                  {filled ? "✓" : ""}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between items-end mb-4 bg-white rounded-xl p-3 border border-orange-100">
                            <div>
                              <div className="text-[8px] text-orange-400 uppercase tracking-widest font-bold">Fra · {departureTime != null ? formatTime(departureTime) : "--:--"}</div>
                              <div className="text-xl font-black text-slate-900">{fromCity}</div>
                            </div>
                            <div className="text-2xl">🚌</div>
                            <div className="text-right">
                              <div className="text-[8px] text-orange-400 uppercase tracking-widest font-bold">Til · {finalArrival != null ? formatTime(finalArrival) : "--:--"}</div>
                              <div className="text-xl font-black text-slate-900">{toCity}</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-orange-100">
                            <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-7 pt-4 px-5">
                              <div className="flex items-center min-w-max">
                                {currentPlayer.segments?.map((seg, idx) => {
                                  const isPast = interpolatedTime > seg.arrival;
                                  const isCurr = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;
                                  return (
                                    <React.Fragment key={idx}>
                                      <div ref={isCurr ? currentStopRef : null} className="flex flex-col items-center relative">
                                        <div className="w-5 h-5 rounded-full border-[3px] z-20 transition-all"
                                          style={{ backgroundColor: isPast ? "#ea580c" : "#fff", borderColor: isCurr ? "#ea580c" : isPast ? "transparent" : "#fed7aa", transform: isCurr ? "scale(1.3)" : "scale(1)" }} />
                                        <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap text-orange-700 uppercase">{seg.from}</span>
                                      </div>
                                      <div className="relative w-14 h-[3px] bg-orange-100 -mx-0.5 z-10 rounded-full">
                                        <div className="absolute left-0 top-0 h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: isPast ? "100%" : isCurr ? "50%" : "0%" }} />
                                      </div>
                                      {idx === currentPlayer.segments.length - 1 && (
                                        <div className="flex flex-col items-center relative">
                                          <div className="w-5 h-5 rounded-full border-[3px] border-orange-200 bg-white z-20" />
                                          <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap text-orange-700 uppercase">{seg.to}</span>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex h-3">
                          {["#f97316","#fb923c","#fdba74","#fb923c","#f97316","#ea580c","#f97316","#fb923c","#fdba74","#fb923c"].map((c,i) => (
                            <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== FLY: Dark premium boarding pass med IATA-koder ===== */}
                  {cfg.ticketStyle === "flight" && (
                    <div className="w-full max-w-sm">
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
                        .flight-pass { font-family: 'IBM Plex Mono', monospace; }
                        @keyframes altitude { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
                        .flight-plane { animation: altitude 3s ease-in-out infinite; display:inline-block; }
                      `}</style>
                      <div className="flight-pass rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                        style={{ background: "linear-gradient(160deg, #020617 0%, #0c1a2e 50%, #020617 100%)" }}>
                        <div className="h-1" style={{ background: "linear-gradient(90deg, #0369a1, #0284c7, #38bdf8, #0284c7, #0369a1)" }} />
                        <div className="p-5 border-b border-white/5" style={{ background: "linear-gradient(180deg, rgba(3,105,161,0.15) 0%, transparent 100%)" }}>
                          <div className="flex justify-between items-start mb-5">
                            <div>
                              <div className="text-sky-400 text-[9px] tracking-[0.4em] uppercase mb-0.5">Boarding Pass</div>
                              <div className="text-white text-2xl font-bold uppercase tracking-tight">{cfg.description}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Flight</div>
                              <div className="text-sky-400 text-2xl font-bold">{cfg.label}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-[1fr_80px_1fr] items-center">
                            <div>
                              <div className="text-white text-5xl font-bold uppercase leading-none">{fromCity.slice(0,3).toUpperCase()}</div>
                              <div className="text-slate-400 text-xs mt-1">{fromCity}</div>
                              <div className="text-sky-400 text-xs font-bold mt-0.5">{departureTime != null ? formatTime(departureTime) : "--:--"}</div>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="flight-plane text-3xl">✈️</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white text-5xl font-bold uppercase leading-none">{toCity.slice(0,3).toUpperCase()}</div>
                              <div className="text-slate-400 text-xs mt-1">{toCity}</div>
                              <div className="text-sky-400 text-xs font-bold mt-0.5">{finalArrival != null ? formatTime(finalArrival) : "--:--"}</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 border-b border-white/5">
                          <div className="p-3 border-r border-white/5">
                            <div className="text-[7px] text-slate-500 uppercase tracking-widest mb-0.5">Passager</div>
                            <div className="text-white font-bold text-xs uppercase truncate">{currentPlayer.name}</div>
                          </div>
                          <div className="p-3 border-r border-white/5">
                            <div className="text-[7px] text-slate-500 uppercase tracking-widest mb-0.5">Gate</div>
                            <div className="text-white font-bold text-xs">{String.fromCharCode(65+Math.floor(Math.random()*6))}{Math.floor(Math.random()*30)+1}</div>
                          </div>
                          <div className="p-3">
                            <div className="text-[7px] text-slate-500 uppercase tracking-widest mb-0.5">Sæde</div>
                            <div className="text-white font-bold text-xs">{Math.floor(Math.random()*30)+1}{String.fromCharCode(65+Math.floor(Math.random()*6))}</div>
                          </div>
                        </div>
                        <div className="p-4 bg-sky-950/30">
                          <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-7 pt-4 px-4">
                            <div className="flex items-center min-w-max">
                              {currentPlayer.segments?.map((seg, idx) => {
                                const isPast = interpolatedTime > seg.arrival;
                                const isCurr = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;
                                return (
                                  <React.Fragment key={idx}>
                                    <div ref={isCurr ? currentStopRef : null} className="flex flex-col items-center relative">
                                      <div className="w-4 h-4 rounded-full border-2 z-20 transition-all"
                                        style={{ backgroundColor: isPast ? "#0ea5e9" : "transparent", borderColor: isCurr ? "#38bdf8" : isPast ? "#0ea5e9" : "#1e3a5f", transform: isCurr ? "scale(1.4)" : "scale(1)", boxShadow: isCurr ? "0 0 10px rgba(56,189,248,0.7)" : "none" }} />
                                      <span className="text-[7px] font-mono mt-1.5 absolute -bottom-6 whitespace-nowrap text-sky-700 uppercase">{seg.from}</span>
                                    </div>
                                    <div className="relative w-14 h-[1px] bg-sky-900 -mx-0.5 z-10">
                                      <div className="absolute left-0 top-0 h-full bg-sky-500 transition-all duration-1000" style={{ width: isPast ? "100%" : isCurr ? "50%" : "0%" }} />
                                    </div>
                                    {idx === currentPlayer.segments.length - 1 && (
                                      <div className="flex flex-col items-center relative">
                                        <div className="w-4 h-4 rounded-full border-2 border-sky-900 bg-transparent z-20" />
                                        <span className="text-[7px] font-mono mt-1.5 absolute -bottom-6 whitespace-nowrap text-sky-700 uppercase">{seg.to}</span>
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="px-5 pb-4 flex flex-col items-center">
                          <div className="flex gap-[2px] h-8 w-full justify-center opacity-20">
                            {[...Array(42)].map((_, i) => <div key={i} className={`bg-sky-200 ${i%3===0?"w-[3px]":"w-[1px]"}`} />)}
                          </div>
                          <div className="text-[7px] text-sky-800 tracking-[0.5em] mt-1">{cfg.label}-{playerId?.slice(0,10).toUpperCase()}</div>
                        </div>
                        <div className="h-1" style={{ background: "linear-gradient(90deg, #0369a1, #0284c7, #38bdf8, #0284c7, #0369a1)" }} />
                      </div>
                    </div>
                  )}

                  {/* ===== FÆRGE: Maritim billet med bølge-SVG og havnedetaljer ===== */}
                  {cfg.ticketStyle === "ferry" && (
                    <div className="w-full max-w-sm">
                      <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&display=swap');
                        .ferry-ticket { font-family: 'Teko', sans-serif; }
                        @keyframes wave { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-20px)} }
                        .wave-anim { animation: wave 4s ease-in-out infinite; }
                      `}</style>
                      <div className="ferry-ticket rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(15,118,110,0.35)]">
                        <div className="relative bg-teal-800 px-5 pt-5 pb-6 overflow-hidden">
                          <div className="absolute bottom-0 left-0 right-0 opacity-20">
                            <div className="wave-anim">
                              <svg viewBox="0 0 400 40" className="w-[200%]">
                                <path d="M0,20 Q50,5 100,20 Q150,35 200,20 Q250,5 300,20 Q350,35 400,20 L400,40 L0,40 Z" fill="white"/>
                              </svg>
                            </div>
                          </div>
                          <div className="relative z-10 flex justify-between items-start mb-5">
                            <div>
                              <div className="text-teal-300 text-[9px] tracking-[0.3em] uppercase font-bold mb-0.5">Færgebillet</div>
                              <div className="text-white text-3xl font-bold uppercase leading-none tracking-wide">{cfg.description}</div>
                            </div>
                            <div className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-teal-200 font-bold text-xl">{cfg.label}</div>
                          </div>
                          <div className="relative z-10 grid grid-cols-[1fr_50px_1fr] items-center">
                            <div>
                              <div className="text-[8px] text-teal-400 uppercase tracking-widest font-bold mb-0.5">Afsejling</div>
                              <div className="text-white text-2xl font-bold leading-none">{fromCity}</div>
                              <div className="text-teal-300 text-sm mt-0.5">{departureTime != null ? formatTime(departureTime) : "--:--"}</div>
                            </div>
                            <div className="text-center"><span className="text-3xl">⛴️</span></div>
                            <div className="text-right">
                              <div className="text-[8px] text-teal-400 uppercase tracking-widest font-bold mb-0.5">Anløbshavn</div>
                              <div className="text-white text-2xl font-bold leading-none">{toCity}</div>
                              <div className="text-teal-300 text-sm mt-0.5">{finalArrival != null ? formatTime(finalArrival) : "--:--"}</div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-teal-800 overflow-hidden h-5">
                          <svg viewBox="0 0 400 20" className="w-full h-full" preserveAspectRatio="none">
                            <path d="M0,0 Q50,18 100,8 Q150,0 200,14 Q250,20 300,6 Q350,0 400,16 L400,20 L0,20 Z" fill="#f0fdfa"/>
                          </svg>
                        </div>
                        <div className="bg-teal-50 px-5 pt-2 pb-4">
                          <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-white rounded-lg p-2 border border-teal-100 text-center shadow-sm">
                              <div className="text-[7px] text-teal-500 uppercase tracking-widest">Passager</div>
                              <div className="font-bold text-slate-800 text-xs truncate">{currentPlayer.name}</div>
                            </div>
                            <div className="flex-1 bg-white rounded-lg p-2 border border-teal-100 text-center shadow-sm">
                              <div className="text-[7px] text-teal-500 uppercase tracking-widest">Dæk</div>
                              <div className="font-bold text-slate-800">Dæk {Math.floor(Math.random()*3)+4}</div>
                            </div>
                            <div className="flex-1 bg-white rounded-lg p-2 border border-teal-100 text-center shadow-sm">
                              <div className="text-[7px] text-teal-500 uppercase tracking-widest">Kabine</div>
                              <div className="font-bold text-slate-800">—</div>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-teal-100">
                            <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-7 pt-4 px-4">
                              <div className="flex items-center min-w-max">
                                {currentPlayer.segments?.map((seg, idx) => {
                                  const isPast = interpolatedTime > seg.arrival;
                                  const isCurr = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;
                                  return (
                                    <React.Fragment key={idx}>
                                      <div ref={isCurr ? currentStopRef : null} className="flex flex-col items-center relative">
                                        <div className="w-5 h-5 rounded-full border-[3px] z-20 transition-all"
                                          style={{ backgroundColor: isPast ? "#0d9488" : "#fff", borderColor: isCurr ? "#0d9488" : isPast ? "transparent" : "#99f6e4", transform: isCurr ? "scale(1.3)" : "scale(1)" }} />
                                        <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap text-teal-700 uppercase">{seg.from}</span>
                                      </div>
                                      <div className="relative w-14 h-[3px] bg-teal-100 -mx-0.5 z-10 rounded-full overflow-hidden">
                                        <div className="absolute left-0 top-0 h-full bg-teal-500 rounded-full transition-all duration-1000" style={{ width: isPast ? "100%" : isCurr ? "50%" : "0%" }} />
                                      </div>
                                      {idx === currentPlayer.segments.length - 1 && (
                                        <div className="flex flex-col items-center relative">
                                          <div className="w-5 h-5 rounded-full border-[3px] border-teal-200 bg-white z-20" />
                                          <span className="text-[8px] font-bold mt-1.5 absolute -bottom-6 whitespace-nowrap text-teal-700 uppercase">{seg.to}</span>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DEBUG PANEL */}
                  <div className="mt-8 w-full max-w-sm p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-[10px]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-400 font-bold uppercase">
                        System Status
                      </span>
                      <span
                        className={
                          isActuallyArrived
                            ? "text-red-400 animate-pulse"
                            : "text-green-400"
                        }
                      >
                        {isActuallyArrived
                          ? "ANKOMMET (VENTER PÅ SYNC)"
                          : "REJSER..."}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <p>
                        Spil-tid:{" "}
                        <span className="text-white">
                          {Math.floor(interpolatedTime)}
                        </span>
                      </p>
                      <p>
                        Ankomst:{" "}
                        <span className="text-white">
                          {finalArrival || "N/A"}
                        </span>
                      </p>
                      <p>
                        Segments:{" "}
                        <span className="text-white">
                          {currentPlayer.segments?.length || 0}
                        </span>
                      </p>
                      <p>
                        Buffer:{" "}
                        <span className="text-white">
                          {(interpolatedTime - finalArrival).toFixed(1)}
                        </span>
                      </p>
                    </div>
                    {isActuallyArrived && (
                      <button
                        onClick={async () => {
                          const sessionRef = doc(
                            db,
                            "artifacts",
                            appId,
                            "public",
                            "data",
                            "sessions",
                            gameState.code,
                          );
                          await updateDoc(sessionRef, {
                            players: gameState.players.map((p) =>
                              p.id === playerId
                                ? { ...p, isTraveling: false, segments: null }
                                : p,
                            ),
                          });
                        }}
                        className="mt-4 w-full py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded uppercase font-black"
                      >
                        Tving ankomst (Nulstil)
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          /* ================== BY-VISNING (STATIONARY VIEW) ================== */
          <>
            {/* TAB: INFO OM BYEN */}
            {playerTab === "info" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {/* VELKOMST BLOK */}
                <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-[32px] border border-white/10 shadow-xl">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-500/20 p-3 rounded-2xl">
                        <MapPin className="text-blue-400" size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black uppercase italic leading-none">
                          {currentPlayer.currentCity}
                        </h2>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
                          {countryFlags[CITIES[currentPlayer.currentCity]?.country] || ''} {CITIES[currentPlayer.currentCity]?.country} •
                          Nuværende lokation
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[9px] font-black uppercase text-slate-500 mb-1">By størrelse</div>
                        <div className="text-sm font-bold text-white capitalize">{CITIES[currentPlayer.currentCity]?.size || 'Ukendt'}</div>
                      </div>
                      <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[9px] font-black uppercase text-slate-500 mb-1">Kategori</div>
                        <div className="text-sm font-bold text-white">{CITIES[currentPlayer.currentCity]?.category?.replace(/^[A-Z]{2}_/, '') || 'Ukendt'}</div>
                      </div>
                      {CITIES[currentPlayer.currentCity]?.parent && (
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <div className="text-[9px] font-black uppercase text-slate-500 mb-1">Del af</div>
                          <div className="text-sm font-bold text-white">{CITIES[currentPlayer.currentCity].parent}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1. LOKAL TRANSPORT PANEL (DASHBOARD) */}
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-5 rounded-[32px] border border-white/10 shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase italic flex items-center gap-2">
                      <Navigation size={16} className="text-blue-400" />
                      Rejs lokalt fra {currentPlayer.currentCity}
                    </h3>
                  </div>

                  {/* TRANSPORTSKIFTER */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={() => setLocalTransportMode("walking")}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                        localTransportMode === "walking"
                          ? "border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                          : "border-white/5 bg-white/5 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div className="text-2xl">🚶</div>
                      <div className="text-center">
                        <div className="font-bold uppercase text-[10px] tracking-wider text-white mb-1">
                          Gåben
                        </div>
                        <div className="text-[8px] text-slate-300">
                          0-10 km • Gratis
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setLocalTransportMode("taxi")}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                        localTransportMode === "taxi"
                          ? "border-yellow-500 bg-yellow-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                          : "border-white/5 bg-white/5 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div className="text-2xl">🚕</div>
                      <div className="text-center">
                        <div className="font-bold uppercase text-[10px] tracking-wider text-white mb-1">
                          Taxi
                        </div>
                        <div className="text-[8px] text-slate-300">
                          5-50 km • Betalt
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* TO-KOLONNE VISNING */}
                  {localTransportMode ? (
                    <div className="flex flex-col lg:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* VENSTRE: KORTET */}
                      <div className="w-full lg:w-1/2 min-h-[220px]">
                        <StaticMiniMap
                          currentCityPos={CITIES[currentPlayer.currentCity].pos}
                          color={
                            localTransportMode === "walking"
                              ? "#3b82f6"
                              : "#f59e0b"
                          }
                          destinations={getNearbyStations(
                            currentPlayer.currentCity,
                          ).filter((s) => {
                            if (localTransportMode === "walking")
                              return s.dist <= 10;
                            if (localTransportMode === "taxi")
                              return s.dist >= 5 && s.dist <= 50;
                            return false;
                          })}
                        />
                      </div>

                      {/* HØJRE: LISTEN */}
                      <div className="w-full lg:w-1/2 space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {getNearbyStations(currentPlayer.currentCity)
                          .filter((s) => {
                            if (localTransportMode === "walking")
                              return s.dist <= 10;
                            if (localTransportMode === "taxi")
                              return s.dist >= 5 && s.dist <= 50;
                            return false;
                          })
                          .map((s) => {
                            const taxiCost = Math.round(50 + s.dist * 15);
                            return (
                              <button
                                key={s.name}
                                onClick={() => {
                                  handleLocalTravel(s.name, localTransportMode);
                                  setLocalTransportMode(null);
                                }}
                                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 active:bg-blue-500/20 rounded-xl border border-white/5 transition-all"
                              >
                                <div className="text-left">
                                  <div className="font-bold text-[13px]">
                                    {s.name}
                                  </div>
                                  <div className="text-[9px] text-slate-500 uppercase">
                                    {s.dist.toFixed(1)} km væk
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div
                                    className={`font-black text-[12px] ${localTransportMode === "taxi" ? "text-yellow-500" : "text-green-500"}`}
                                  >
                                    {localTransportMode === "taxi"
                                      ? `${taxiCost} kr.`
                                      : "GRATIS"}
                                  </div>
                                  <div className="text-[9px] text-slate-400 uppercase font-bold">
                                    {Math.round(
                                      s.dist *
                                        (localTransportMode === "walking"
                                          ? 12
                                          : 2),
                                    )}{" "}
                                    min
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-black/20">
                      <p className="text-slate-600 text-[10px] uppercase font-black tracking-[0.2em] italic">
                        Vælg transportform for at se rejsemål
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* TAB: AFGANGSTAVLE */}
            {playerTab === "departures" && (
              <div className="flex flex-col h-full animate-in fade-in relative bg-slate-950 font-sans select-none">
                {/* STATION-STYLE CSS & LED FONT */}
                <style>
                  {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

          @keyframes station-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          .station-marquee-container {
            display: flex;
            white-space: nowrap;
            animation: station-scroll 25s linear infinite;
            width: max-content;
          }

          .marquee-mask {
            overflow: hidden;
            position: relative;
            width: 100%;
            -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
            mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          }

          .led-font {
            font-family: 'VT323', monospace;
            font-size: 1.1em;
            text-shadow: 0 0 2px currentColor;
            letter-spacing: 0.05em;
          }
          `}
                </style>

{/* TRANSPORT TYPER TABS */}
<div className="flex border-b border-white/10 bg-slate-900 sticky top-0 z-10 font-sans overflow-x-auto">
  {[
    { type: 'train',     emoji: '🚆', label: 'Tog'   },
    { type: 'bus',       emoji: '🚌', label: 'Bus'   },
    { type: 'flight',    emoji: '✈️', label: 'Fly'   },
    { type: 'ferry',     emoji: '⛴️', label: 'Færge' },
  ].map(({ type, emoji, label }) => (
    <button
      key={type}
      onClick={() => { 
        setActiveTab(type); 
        setSubFilter('all'); 
        setSelectedDeparture(null); 
      }}
      className={`flex-1 min-w-[60px] py-3 flex flex-col items-center gap-0.5 transition-all ${
        activeTab === type ? 'bg-blue-600/20 border-b-2 border-blue-500' : 'opacity-40'
      }`}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
    </button>
  ))}
</div>

{/* SUB-MENU FOR TOG-TYPER */}
{activeTab === 'train' && (
  <div className="flex gap-2 p-2 bg-slate-800/50 border-b border-white/5 overflow-x-auto no-scrollbar">
    {[
      { subType: 'all',       label: 'Alle',   emoji: '🎫' },
      { subType: 'highspeed', label: 'Lyn',    emoji: '🚄' },
      { subType: 'train',     label: 'Normal', emoji: '🚆' },
      { subType: 'metro',     label: 'Metro',  emoji: '🚇' },
    ].map(({ subType, label, emoji }) => (
      <button
        key={subType}
        onClick={() => setSubFilter(subType)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all whitespace-nowrap ${
          subFilter === subType 
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
            : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
        }`}
      >
        <span className="text-xs">{emoji}</span>
        {label}
      </button>
    ))}
  </div>
)}

{/* SELVE TAVLEN */}
{!selectedDeparture ? (
  <div className="flex-1 overflow-y-auto divide-y divide-white/5">
    {(() => {
      const now = interpolatedTime;
      
      const filteredDepartures = departures.filter(dep => {
        // Logik for Tog-fanen: dækker over highspeed, train og metro
        if (activeTab === 'train') {
          const isTrainType = ['highspeed', 'train', 'metro'].includes(dep.type);
          if (!isTrainType) return false;

          // Hvis et specifikt filter er valgt (Lyn, Normal eller Metro)
          if (subFilter !== 'all') {
            return dep.type === subFilter;
          }
          return true;
        }
        
        // Logik for alle andre faner (Bus, Fly, Færge)
        return dep.type === activeTab;
      });

      if (filteredDepartures.length === 0) {
        return (
          <div className="p-12 text-center text-slate-500 font-sans uppercase text-[10px] tracking-[0.2em] font-black">
            Ingen afgange fundet
          </div>
        );
      }

      return filteredDepartures.map((dep) => {
        const style = dep.style;
        const hasDeparted = dep.time + dep.delay <= now;
        if (hasDeparted && now - (dep.time + dep.delay) > 15)
          return null;

        const viaStops = dep.allStops ? dep.allStops.slice(0, -1) : [];
        const viaText = viaStops.length > 0 ? viaStops.join(" > ") + " > " : "";

        return (
          <button
            key={dep.id}
            disabled={dep.isCancelled || hasDeparted}
            onClick={() => setSelectedDeparture(dep)}
            className={`w-full px-4 py-4 flex items-center justify-between transition-colors group ${
              dep.isCancelled
                ? "bg-red-950/10 cursor-not-allowed"
                : hasDeparted
                  ? "bg-black/30 cursor-not-allowed"
                  : "hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-4 text-left flex-1 min-w-0">
              {/* TIDSPUNKT */}
              <div className="flex flex-col w-14 items-start shrink-0 led-font">
                <span className={`text-2xl tabular-nums leading-none ${
                  dep.isCancelled ? "text-slate-600 line-through" : 
                  hasDeparted ? "text-slate-700" : 
                  dep.delay > 0 ? "text-red-500" : "text-yellow-400"
                }`}>
                  {formatTime(dep.time)}
                </span>
                {dep.delay > 0 && !dep.isCancelled && (
                  <span className={`text-[12px] font-bold -mt-0.5 ${hasDeparted ? "text-slate-700" : "text-red-400"}`}>
                    +{dep.delay} min
                  </span>
                )}
              </div>

              {/* LINJE LABEL */}
              <div
                className={`h-6 px-3 min-w-[40px] led-font rounded-sm flex items-center justify-center shrink-0 text-sm uppercase shadow-md shadow-black/50 transition-all ${
                  dep.isCancelled || hasDeparted
                    ? "bg-slate-800 text-slate-600 grayscale opacity-50"
                    : `${style.bg || ""} ${style.text || "text-white"}`
                }`}
                style={
                  !dep.isCancelled && !hasDeparted && style.color && !style.bg?.startsWith("bg-")
                    ? { backgroundColor: style.color } : {}
                }
              >
                {style.label}
              </div>

              {/* DESTINATION */}
              <div className="flex flex-col flex-1 min-w-0 pr-4">
                <div className={`font-black font-sans uppercase text-sm truncate tracking-tight ${
                  dep.isCancelled ? "text-slate-600 line-through" : 
                  hasDeparted ? "text-slate-700" : "text-white"
                }`}>
                  {dep.directionLabel}
                </div>

                {/* STATUS / VIA */}
                {dep.isCancelled ? (
                  <div className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1 animate-pulse font-sans">
                    <AlertTriangle size={10} /> Aflyst
                  </div>
                ) : hasDeparted ? (
                  <div className="text-[10px] text-slate-700 font-bold uppercase tracking-widest font-sans">
                    Afgået
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5 w-full led-font">
                    {viaText && (
                      <>
                        <span className="text-[10px] text-slate-500 uppercase shrink-0 tracking-widest font-sans">Via</span>
                        <div className="marquee-mask">
                          <div className="station-marquee-container">
                            <span className="text-[13px] text-blue-400/80 uppercase tracking-wide pr-6">{viaText}</span>
                            <span className="text-[13px] text-blue-400/80 uppercase tracking-wide pr-6">{viaText}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            {!hasDeparted && !dep.isCancelled && (
              <ChevronRight size={14} className="text-slate-600 group-hover:text-blue-500 shrink-0 transition-colors" />
            )}
          </button>
        );
      });
    })()}
  </div>
) : (                /* ================== STOP-VÆLGER OVERLAY ================== */
                  <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 font-sans">
                    <div className="p-6 bg-slate-900 border-b border-white/10 flex justify-between items-start">
                      <div>
                        <button
                          onClick={() => setSelectedDeparture(null)}
                          className="flex items-center gap-2 text-blue-400 font-black uppercase text-[10px] tracking-widest mb-4 hover:text-blue-300"
                        >
                          <RotateCcw size={12} /> Tilbage til tavlen
                        </button>

                        <div className="flex items-center gap-3">
                          {/* Farvet Label Boks med Tailwind & Hex Support */}
                          <div
                            className={`px-3 py-1 rounded-sm text-white text-sm font-black uppercase flex items-center gap-2 shadow-lg led-font ${
                              selectedDeparture.style?.bg?.startsWith("bg-")
                                ? selectedDeparture.style.bg
                                : ""
                            }`}
                            style={{
                              backgroundColor:
                                !selectedDeparture.style?.bg?.startsWith("bg-")
                                  ? selectedDeparture.style?.color || "#334155"
                                  : undefined,
                            }}
                          >
                            {selectedDeparture.style?.label}
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic"></span>
                            <div className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">
                              {selectedDeparture.directionLabel}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-black text-xl tabular-nums ${selectedDeparture.delay > 0 ? "text-red-500" : "text-blue-500"}`}
                        >
                          kl.{" "}
                          {formatTime(
                            selectedDeparture.time + selectedDeparture.delay,
                          )}
                        </div>
                        <div className="text-[8px] font-black text-slate-500 uppercase">
                          Forventet afgang
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="relative border-l-2 border-blue-500/20 ml-3 pl-8 space-y-6">
                        {selectedDeparture.allStops.map((stopCity) => {
                          const info = calculateStopInfo(
                            selectedDeparture,
                            stopCity,
                            currentPlayer.currentCity,
                          );
                          const hasMoney = currentPlayer.money >= info.price;

                          return (
                            <button
                              key={stopCity}
                              disabled={!hasMoney}
                              onClick={() => {
                                travel({
                                  ...selectedDeparture,
                                  destination: stopCity,
                                  cost: info.price,
                                  route: info.route,
                                });
                                setSelectedDeparture(null);
                              }}
                              className="relative w-full text-left group"
                            >
                              <div className="absolute -left-[35px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-500 group-hover:scale-150 transition-transform z-10" />

                              <div
                                className={`p-4 rounded-2xl border transition-all ${
                                  hasMoney
                                    ? "bg-white/5 border-white/10 hover:bg-blue-600/10 hover:border-blue-500/50"
                                    : "opacity-30 border-transparent cursor-not-allowed"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-black uppercase text-lg leading-none flex items-center gap-2 text-white">
                                      {stopCity}
                                      {stopCity === gameState.goalCity && (
                                        <Flag
                                          size={14}
                                          className="text-amber-500"
                                        />
                                      )}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                                      Ankomst ca.{" "}
                                      {formatTime(
                                        selectedDeparture.time +
                                          selectedDeparture.delay +
                                          info.duration,
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right font-black text-lg">
                                    <span
                                      className={
                                        hasMoney
                                          ? "text-green-500"
                                          : "text-red-500"
                                      }
                                    >
                                      {info.price}€
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {departures.length === 0 && !selectedDeparture && (
                  <div className="p-12 text-center opacity-30 italic uppercase font-black text-xs tracking-widest font-sans">
                    Ingen flere afgange i denne kategori
                  </div>
                )}
              </div>
            )}
            {/* TAB: ARBEJDE */}
            {playerTab === "work" && (
              <div className="h-full flex flex-col overflow-hidden">
                {/* ══ JOBMARKED ══════════════════════════════════════════════ */}
                {jobScreen === "listing" && (
                  <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="p-4 pb-3 border-b border-white/5">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Jobmarked
                      </div>
                      <div className="font-black text-lg uppercase text-white leading-none mt-0.5">
                        {currentPlayer.currentCity}
                      </div>
                    </div>

                    <div className="p-4 space-y-6">
                      {jobMarket.length === 0 && (
                        <div className="text-center opacity-30 italic uppercase font-black text-xs tracking-widest pt-12">
                          Ingen jobs tilgængelige
                        </div>
                      )}

                      {Object.entries(
                        jobMarket.reduce((acc, job) => {
                          if (!acc[job.category]) acc[job.category] = [];
                          acc[job.category].push(job);
                          return acc;
                        }, {}),
                      ).map(([categoryKey, jobs]) => {
                        const cat = JOB_CATEGORIES[categoryKey];
                        const playerCatData = currentPlayer?.jobLevels?.[
                          categoryKey
                        ] ?? { xp: 0, level: 1 };
                        const playerLevel = playerCatData.level ?? 1;
                        const xp = playerCatData.xp ?? 0;
                        const xpToNext = getXPToNextLevel(xp);

                        return (
                          <div key={categoryKey} className="space-y-2">
                            {/* Kategori-header */}
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{cat.emoji}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {cat.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3].map((l) => (
                                    <div
                                      key={l}
                                      className={`w-5 h-1.5 rounded-full transition-all ${l <= playerLevel ? "bg-blue-500" : "bg-slate-700"}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[8px] font-black text-slate-500 uppercase">
                                  Lv.{playerLevel}
                                  {xpToNext !== null
                                    ? ` · ${xpToNext}xp`
                                    : " · MAX"}
                                </span>
                              </div>
                            </div>

                            {/* Jobs */}
                            {jobs.map((job) => {
                              const taken = job.takenBy !== null;
                              const mine = job.takenBy === playerId;
                              const locked = job.locked;

                              return (
                                <button
                                  key={job.instanceId}
                                  disabled={taken || locked}
                                  onClick={() => {
                                    setSelectedJob(job);
                                    setJobScreen("detail");
                                  }}
                                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                    locked
                                      ? "opacity-40 border-transparent bg-slate-800/30 cursor-not-allowed"
                                      : mine
                                        ? "bg-blue-600/10 border-blue-500/30"
                                        : taken
                                          ? "opacity-25 border-transparent bg-slate-800/40 cursor-not-allowed"
                                          : "bg-white/5 border-white/10 hover:bg-blue-600/10 hover:border-blue-500/50 active:scale-[0.98]"
                                  }`}
                                >
                                  <div className="flex justify-between items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black uppercase text-white text-sm leading-none">
                                          {job.title}
                                        </span>
                                        {locked && (
                                          <span className="text-[8px] bg-slate-700/50 text-slate-500 font-black uppercase px-1.5 py-0.5 rounded-full">
                                            🔒 Lv.{job.requiredLevel}
                                          </span>
                                        )}
                                        {mine && (
                                          <span className="text-[8px] bg-blue-500/20 text-blue-400 font-black uppercase px-1.5 py-0.5 rounded-full">
                                            ● Aktivt
                                          </span>
                                        )}
                                        {taken && !mine && (
                                          <span className="text-[8px] bg-slate-700/50 text-slate-500 font-black uppercase px-1.5 py-0.5 rounded-full">
                                            Taget
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[9px] text-slate-500 font-black uppercase flex items-center gap-1">
                                          <Clock size={8} /> {job.durationHours}
                                          t
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-black uppercase">
                                          🎮 mini-spil
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div
                                        className={`font-black text-xl leading-none ${locked ? "text-slate-600" : "text-green-400"}`}
                                      >
                                        {job.pay}€
                                      </div>
                                      <div className="text-[9px] text-slate-600 uppercase mt-0.5">
                                        løn
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ══ JOB-DETALJE ════════════════════════════════════════════ */}
                {jobScreen === "detail" && selectedJob && (
                  <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-6 bg-slate-900 border-b border-white/10">
                      <button
                        onClick={() => setJobScreen("listing")}
                        className="flex items-center gap-2 text-blue-400 font-black uppercase text-[10px] tracking-widest mb-4 hover:text-blue-300"
                      >
                        <RotateCcw size={12} /> Tilbage
                      </button>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{selectedJob.emoji}</span>
                        <div>
                          <div className="font-black text-2xl uppercase text-white leading-none">
                            {selectedJob.title}
                          </div>
                          <div className="text-slate-500 text-xs mt-1">
                            {currentPlayer.currentCity}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {/* Løn + tid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5">
                          <div className="text-[9px] font-black uppercase text-slate-500 mb-1">
                            Grundløn
                          </div>
                          <div className="font-black text-2xl text-green-400">
                            {selectedJob.pay}€
                          </div>
                        </div>
                        <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5">
                          <div className="text-[9px] font-black uppercase text-slate-500 mb-1">
                            Varighed
                          </div>
                          <div className="font-black text-2xl text-white">
                            {selectedJob.durationHours}t
                          </div>
                        </div>
                      </div>

                      {/* Erfaring */}
                      {(() => {
                        const cat = JOB_CATEGORIES[selectedJob.category];
                        const playerCatData = currentPlayer?.jobLevels?.[
                          selectedJob.category
                        ] ?? { xp: 0, level: 1 };
                        const xp = playerCatData.xp ?? 0;
                        const level = playerCatData.level ?? 1;
                        const xpToNext = getXPToNextLevel(xp);
                        return (
                          <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5 space-y-3">
                            <div className="text-[9px] font-black uppercase text-slate-500">
                              {cat?.emoji} {cat?.label} — Din erfaring
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1.5">
                                {[1, 2, 3].map((l) => (
                                  <div
                                    key={l}
                                    className={`w-8 h-2 rounded-full transition-all ${l <= level ? "bg-blue-500" : "bg-slate-700"}`}
                                  />
                                ))}
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase">
                                Level {level}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {xpToNext !== null
                                ? `Dette job giver +1 XP · ${xpToNext} XP tilbage til level ${level + 1}`
                                : "⭐ Du er på MAX level i denne kategori"}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Mini-spil info */}
                      <div className="bg-amber-900/20 rounded-2xl p-4 border border-amber-500/20">
                        <div className="text-[9px] font-black uppercase text-amber-500 mb-1">
                          🎮 Mini-spil bonus
                        </div>
                        <div className="text-[10px] text-slate-400 leading-relaxed">
                          Mens du arbejder kan du spille et mini-spil for at
                          tjene ekstra. God score giver bonus, dårlig score
                          giver straf.
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-white/5">
                      <button
                        onClick={() => handleTakeJob(selectedJob)}
                        className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] font-black uppercase text-sm tracking-widest transition-all"
                      >
                        Start job — {selectedJob.pay}€
                      </button>
                    </div>
                  </div>
                )}
                {/* ══ ARBEJDER ═══════════════════════════════════════════════ */}
                {jobScreen === "working" && selectedJob && (
                  <div className="flex-1 flex flex-col">
                    {showMiniGame ? (
                      <MiniGame
                        job={selectedJob}
                        city={currentPlayer.currentCity}
                        playerCountry={
                          CITIES[currentPlayer.currentCity]?.country ?? "DK"
                        }
                        onComplete={(bonus) => {
                          setShowMiniGame(false);
                          setJobEventChoice((prev) => ({
                            ...(prev ?? {}),
                            miniGameBonus: bonus,
                          }));
                        }}
                      />
                    ) : (
                      <div className="flex-1 flex flex-col justify-center items-center p-8 gap-5 text-center">
                        <div className="relative">
                          <div className="text-6xl">{selectedJob.emoji}</div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
                        </div>
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            Du arbejder nu
                          </div>
                          <div className="font-black text-2xl uppercase text-white leading-none">
                            {selectedJob.title}
                          </div>
                          <div className="text-slate-500 text-xs mt-1">
                            {currentPlayer.currentCity}
                          </div>
                        </div>
                        <div className="w-full bg-slate-800/60 rounded-2xl p-4 border border-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-slate-500">
                              Grundløn
                            </span>
                            <span className="font-black text-green-400">
                              {selectedJob.pay}€
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-slate-500">
                              Færdig kl.
                            </span>
                            <span className="font-black text-white tabular-nums">
                              {formatTime(selectedJob.endTime ?? 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-slate-500">
                              Tid tilbage
                            </span>
                            <span className="font-black text-white tabular-nums">
                              {(() => {
                                const left =
                                  (selectedJob.endTime ?? 0) -
                                  (gameState?.gameTime ?? 0);
                                if (left <= 0) return "Færdig!";
                                const h = Math.floor(left / 60);
                                const m = Math.floor(left % 60);
                                return h > 0 ? `${h}t ${m}m` : `${m}m`;
                              })()}
                            </span>
                          </div>
                          {jobEventChoice?.miniGameBonus !== undefined && (
                            <div className="flex justify-between items-center">
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                  jobEventChoice.miniGameBonus >= 0
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                🎮 Mini-spil
                              </span>
                              <span
                                className={`font-black text-sm ${jobEventChoice.miniGameBonus >= 0 ? "text-amber-400" : "text-red-400"}`}
                              >
                                {jobEventChoice.miniGameBonus >= 0 ? "+" : ""}
                                {jobEventChoice.miniGameBonus}€
                              </span>
                            </div>
                          )}
                        </div>
                        {jobEventChoice?.miniGameBonus === undefined ? (
                          <button
                            onClick={() => setShowMiniGame(true)}
                            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] font-black uppercase text-sm tracking-widest transition-all"
                          >
                            🎮 Spil mini-spil for bonus
                          </button>
                        ) : (
                          <div className="w-full py-4 rounded-2xl bg-slate-800/60 border border-white/5 font-black uppercase text-sm tracking-widest text-slate-500 text-center">
                            ✓ Mini-spil spillet — vent på jobbet er færdigt
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ UDBETALING ════════════════════════════════════════════ */}
                {jobScreen === "payout" && jobEventChoice && (
                  <div className="flex-1 flex flex-col justify-center items-center p-6 gap-5 text-center overflow-y-auto">
                    <div className="text-6xl">🎉</div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Jobbet er færdigt
                      </div>
                      <div className="font-black text-5xl text-green-400 leading-none">
                        +{jobEventChoice.totalPay}€
                      </div>
                    </div>

                    {/* XP feedback */}
                    {selectedJob?.category &&
                      (() => {
                        const cat = JOB_CATEGORIES[selectedJob.category];
                        const newXP =
                          currentPlayer?.jobLevels?.[selectedJob.category]
                            ?.xp ?? 0;
                        const newLevel = getLevelFromXP(newXP);
                        const xpToNext = getXPToNextLevel(newXP);
                        return (
                          <div className="w-full bg-blue-900/20 rounded-2xl p-4 border border-blue-500/20 text-left space-y-2">
                            <div className="text-[9px] font-black uppercase text-blue-400">
                              +1 XP — {cat?.label}
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3].map((l) => (
                                <div
                                  key={l}
                                  className={`h-2 flex-1 rounded-full ${l <= newLevel ? "bg-blue-500" : "bg-slate-700"}`}
                                />
                              ))}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {xpToNext !== null
                                ? `${xpToNext} XP mere til næste level`
                                : "⭐ Du er på MAX level i denne kategori!"}
                            </div>
                          </div>
                        );
                      })()}

                    <div className="w-full bg-slate-800/60 rounded-2xl p-4 border border-white/5 space-y-3 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-slate-500">
                          Grundløn
                        </span>
                        <span className="font-black text-white">
                          {selectedJob?.pay ?? 0}€
                        </span>
                      </div>
                      {jobEventChoice?.miniGameBonus !== undefined && (
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                              jobEventChoice.miniGameBonus >= 0
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            🎮 Mini-spil
                          </span>
                          <span
                            className={`font-black ${jobEventChoice.miniGameBonus >= 0 ? "text-amber-400" : "text-red-400"}`}
                          >
                            {jobEventChoice.miniGameBonus >= 0 ? "+" : ""}
                            {jobEventChoice.miniGameBonus}€
                          </span>
                        </div>
                      )}
                      <div className="h-px bg-white/5" />
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-slate-500">
                          Total
                        </span>
                        <span className="font-black text-green-400 text-lg">
                          {jobEventChoice.totalPay}€
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setJobScreen("listing");
                        setSelectedJob(null);
                        setJobEventChoice(null);
                        setEventResults([]);
                        setCurrentEventIndex(0);
                      }}
                      className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] font-black uppercase text-sm tracking-widest transition-all"
                    >
                      Tilbage til jobmarkedet
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ PROFIL-TAB ════════════════════════════════════════════ */}
        {playerTab === "profile" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 pb-3 border-b border-white/5">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Din profil
              </div>
              <div className="font-black text-lg uppercase text-white leading-none mt-0.5">
                {currentPlayer.name ?? "Spiller"}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 mb-2">
                Erhvervserfaring
              </div>

              {Object.entries(JOB_CATEGORIES).map(([key, cat]) => {
                const playerCatData = currentPlayer?.jobLevels?.[key] ?? {
                  xp: 0,
                  level: 1,
                };
                const level = playerCatData.level ?? 1;
                const xp = playerCatData.xp ?? 0;
                const xpToNext = getXPToNextLevel(xp);
                const currentTitle =
                  cat.levels[level - 1]?.title ?? cat.levels[0].title;
                const nextTitle = cat.levels[level]?.title ?? null;

                // Tjek om kategorien er tilgængelig i nuværende by
                const cityData = CITIES[currentPlayer.currentCity];
                const effectiveCityData = cityData?.parent
                  ? (CITIES[cityData.parent] ?? cityData)
                  : cityData;
                const facilityAvailable =
                  !cat.requiresFacility ||
                  effectiveCityData?.[cat.requiresFacility] !== null;

                // XP progress inden for nuværende level
                const xpThresholds = [0, 3, 8];
                const currentThreshold = xpThresholds[level - 1] ?? 0;
                const nextThreshold = xpThresholds[level] ?? 8;
                const progressPct =
                  level >= 3
                    ? 100
                    : Math.min(
                        100,
                        ((xp - currentThreshold) /
                          (nextThreshold - currentThreshold)) *
                          100,
                      );

                return (
                  <div
                    key={key}
                    className={`rounded-2xl border p-4 transition-all ${
                      facilityAvailable
                        ? "bg-white/5 border-white/10"
                        : "bg-slate-900/50 border-white/5 opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.emoji}</span>
                        <div>
                          <div className="font-black text-white text-sm uppercase leading-none">
                            {currentTitle}
                          </div>
                          <div className="text-[9px] text-slate-500 uppercase font-black mt-0.5">
                            {cat.label}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-white text-sm">
                          Lv.{level}
                        </div>
                        {!facilityAvailable && (
                          <div className="text-[8px] text-slate-600 uppercase font-black mt-0.5">
                            Ikke tilgængelig her
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 space-y-1.5">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${level >= 3 ? "bg-amber-500" : "bg-blue-500"}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1">
                          {[1, 2, 3].map((l) => (
                            <div
                              key={l}
                              className={`w-4 h-1 rounded-full ${l <= level ? "bg-blue-500" : "bg-slate-700"}`}
                            />
                          ))}
                        </div>
                        <span className="text-[8px] font-black uppercase text-slate-600">
                          {level >= 3
                            ? "⭐ MAX"
                            : nextTitle
                              ? `${xpToNext} XP → ${nextTitle}`
                              : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM TAB BAR */}
      {!currentPlayer.isTraveling && (
        <div className="bg-slate-900 border-t border-white/10 flex items-center justify-around pb-6 pt-2 px-2">
          <button
            onClick={() => !currentPlayer.currentJob && setPlayerTab("info")}
            className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${
              playerTab === "info"
                ? "text-blue-500 scale-110"
                : currentPlayer.currentJob
                  ? "text-slate-700 cursor-not-allowed"
                  : "text-slate-500"
            }`}
          >
            <Info size={20} />
            <span className="text-[8px] font-black uppercase">Info</span>
          </button>
          <button
            onClick={() =>
              !currentPlayer.currentJob && setPlayerTab("departures")
            }
            className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${
              playerTab === "departures"
                ? "text-blue-500 scale-110"
                : currentPlayer.currentJob
                  ? "text-slate-700 cursor-not-allowed"
                  : "text-slate-500"
            }`}
          >
            <Ticket size={20} />
            <span className="text-[8px] font-black uppercase">Afgange</span>
            {currentPlayer.currentJob && (
              <span className="text-[7px] font-black uppercase text-slate-700">
                Låst
              </span>
            )}
          </button>
          <button
            onClick={() => setPlayerTab("work")}
            className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${
              playerTab === "work"
                ? "text-blue-500 scale-110"
                : "text-slate-500"
            }`}
          >
            <Users size={20} />
            <span className="text-[8px] font-black uppercase">Arbejde</span>
          </button>
          <button
            onClick={() => setPlayerTab("profile")}
            className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${
              playerTab === "profile"
                ? "text-blue-500 scale-110"
                : "text-slate-500"
            }`}
          >
            <User size={20} />
            <span className="text-[8px] font-black uppercase">Profil</span>
          </button>
        </div>
      )}

      <style>{`@keyframes move { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </div>
  );
}