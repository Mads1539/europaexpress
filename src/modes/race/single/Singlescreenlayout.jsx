import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../../firebase.js';
import { Sun, Moon, Flag, XCircle, ChevronRight, AlertTriangle, Activity } from 'lucide-react';

import { CITIES, TRANSIT_LINES, TRAVEL_TYPES, getDashArray } from '../../../constants.js';
import { formatTime } from '../../../utils/formatting.js';
import { fetchBRouterRoute, fetchOSRMDriving } from '../../../utils/routing.js';
import { PlayerView } from '../party/PlayerView.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// SingleScreenLayout
//
// Kort til venstre, PlayerView til højre som et fast panel.
// Tager præcis de samme props som App.jsx sender til PlayerView,
// plus mapRef og leaflet-relaterede ting.
//
// Props: alle PlayerView-props + interpolatedTime + gameState
// ─────────────────────────────────────────────────────────────────────────────

export function SingleScreenLayout({
  // Kort
  mapRef,
  interpolatedTime,
  gameState,
  selectedCity,
  setSelectedCity,

  // Alle PlayerView props
  currentPlayer,
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
  subfilter,
  setSubFilter,
})

{
  const activeIncident = gameState?.incidents?.[gameState.incidents.length - 1];
  const activeIncidentLocation =
    activeIncident?.scope === "region"
      ? activeIncident.category?.replace(/^[A-Z]{2}_/, "")
      : activeIncident?.city;

  return (
    <div className="h-screen flex bg-[#02040a] text-slate-200 overflow-hidden font-sans">

      <style>{`
        .ss-sidebar {
          position: absolute; top: 0; right: 0; bottom: 0; width: 380px;
          background: rgba(10, 15, 28, 0.97); backdrop-filter: blur(40px);
          border-left: 1px solid rgba(59, 130, 246, 0.15);
          box-shadow: -20px 0 60px rgba(0,0,0,0.8);
          z-index: 400; display: flex; flex-direction: column;
          overflow: hidden;
        }
        .goal-tooltip {
          background: #0f172a; border: 1px solid #d4af37;
          color: #f5d080; font-weight: 700; font-size: 13px;
          border-radius: 12px; padding: 6px 14px;
          box-shadow: 0 0 16px rgba(212,175,55,0.3); white-space: nowrap;
        }
        @keyframes goal-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 1; }
        }
        .small-station-tooltip {
          background: rgba(2,4,10,0.9); border: 1px solid rgba(255,255,255,0.1);
          color: #94a3b8; font-size: 11px; font-weight: 600; border-radius: 6px;
          padding: 2px 6px; white-space: nowrap;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
      `}</style>

      {/* ── VENSTRE: KORT ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative h-full" style={{ marginRight: '380px' }}>

        {/* Breaking news ticker */}
        {activeIncident && (
          <div className="absolute top-0 left-0 right-0 z-[4000] bg-red-950 border-b border-red-500/50 h-10 flex items-center">
            <div className="bg-red-600 text-white px-4 h-full flex items-center font-black italic text-xs shrink-0">
              <AlertTriangle size={14} className="mr-1.5 animate-pulse" /> ALERT
            </div>
            <div className="flex-1 overflow-hidden font-mono text-red-400 font-bold text-xs">
              <div className="animate-marquee whitespace-nowrap uppercase px-4">
                +++ {activeIncident.label} I {activeIncidentLocation} +++ FORVENT FORSINKELSER +++
              </div>
            </div>
          </div>
        )}

        {/* Ur */}
        <div className="absolute top-4 left-4 z-[2000] bg-slate-900/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3"
          style={{ top: activeIncident ? '52px' : '16px' }}>
          <div className="h-8 w-8 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            {interpolatedTime / 60 >= 7 && interpolatedTime / 60 < 20
              ? <Sun size={16} className="text-amber-400" />
              : <Moon size={16} className="text-blue-400" />}
          </div>
          <div className="text-2xl font-mono font-black tracking-tighter text-white">
            {formatTime(interpolatedTime)}
          </div>
        </div>

        {/* Målby */}
        {gameState?.goalCity && (
          <div className="absolute z-[2000] bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 px-4 py-2 rounded-2xl flex items-center gap-2"
            style={{ top: activeIncident ? '52px' : '16px', left: '160px' }}>
            <Flag size={14} className="text-amber-500 shrink-0" />
            <div>
              <div className="text-[8px] font-black uppercase text-amber-500 tracking-widest leading-none">Mål</div>
              <div className="text-sm font-black italic uppercase text-amber-100 leading-none">{gameState.goalCity}</div>
            </div>
          </div>
        )}

        {/* Spilleroversigt — kompakt */}
        <div className="absolute bottom-4 left-4 z-[2000] flex flex-col gap-1.5">
          {gameState?.players?.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="text-base leading-none">{p.avatar}</span>
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase text-white truncate leading-none">{p.name}</div>
                <div className="text-[8px] text-slate-500 uppercase leading-none mt-0.5">
                  {p.isTraveling ? `→ ${p.destinationCity}` : p.currentCity}
                </div>
              </div>
              <div className="text-[9px] font-black text-green-400 font-mono ml-1">{p.money}€</div>
              {p.id === playerId && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Kort-container */}
        <div ref={mapRef} className="flex-1 w-full bg-[#010204]" />

        {/* City details panel */}
        {selectedCity && (
          <div className="absolute inset-y-0 left-0 w-80 z-[500] bg-slate-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                  {selectedCity.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest">
                    Signal OK
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCity(null)} className="text-slate-500 hover:text-white transition-colors">
                <XCircle size={24} strokeWidth={1} />
              </button>
            </div>
            <div className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar space-y-3">
              {selectedCity.routes?.map((r, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/5 p-4 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: r.color }} />
                  <div className="text-[9px] font-black uppercase opacity-50 mb-0.5" style={{ color: r.color }}>{r.name}</div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-black text-white uppercase">→ {r.to}</div>
                    <ChevronRight size={14} className="text-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── HØJRE: SPILLERPANEL ──────────────────────────────────────────────── */}
      <div className="ss-sidebar">
        <PlayerView
          currentPlayer={currentPlayer}
          gameState={gameState}
          interpolatedTime={interpolatedTime}
          playerTab={playerTab} setPlayerTab={setPlayerTab}
          activeTab={activeTab} setActiveTab={setActiveTab}
          selectedDeparture={selectedDeparture} setSelectedDeparture={setSelectedDeparture}
          departures={departures}
          jobMarket={jobMarket}
          selectedJob={selectedJob} setSelectedJob={setSelectedJob}
          jobScreen={jobScreen} setJobScreen={setJobScreen}
          jobEventChoice={jobEventChoice} setJobEventChoice={setJobEventChoice}
          showMiniGame={showMiniGame} setShowMiniGame={setShowMiniGame}
          currentEventIndex={currentEventIndex} setCurrentEventIndex={setCurrentEventIndex}
          eventResults={eventResults} setEventResults={setEventResults}
          jackpotEvent={jackpotEvent}
          ticketScrollRef={ticketScrollRef}
          currentStopRef={currentStopRef}
          travel={travel}
          handleLocalTravel={handleLocalTravel}
          handleStepOffNextStation={handleStepOffNextStation}
          playerId={playerId}
          localTransportMode={localTransportMode}
          setLocalTransportMode={setLocalTransportMode}
          getNearbyStations={getNearbyStations}
          handleTakeJob={handleTakeJob}
          subfilter={subfilter}
          setSubFilter={setSubFilter} 
        />
      </div>

    </div>
  );
}