'use client';

import React, { useState } from 'react';

export default function PlayoffPictureBanner({ analytics }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!analytics || !analytics.standings) return null;

  const { standings, bracket, activeWeek } = analytics;
  const byeTeams = bracket?.byeTeams || [];
  const wildcards = bracket?.wildcards || [];
  const bubbleTeams = bracket?.bubbleTeams || [];

  return (
    <div className="glass-panel border-2 border-[#d4af37]/40 shadow-2xl overflow-hidden rounded-2xl relative">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-black/90 via-[#161f2e] to-black/90 p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/50 flex items-center justify-center text-xl flex-shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            🏆
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#d4af37] font-bold">
                Live CRFFL Postseason Grid
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                Live Week {activeWeek}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              If The Playoffs Started Today
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[11px] font-mono text-gray-300">
              6-Team Format: Top 2 Div Winners Earn Byes
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              Seeds 3–6 Wildcard • Weeks 15–17
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-mono font-bold border border-white/20 transition active:scale-95"
          >
            {isOpen ? 'Collapse ▲' : 'Expand Bracket ▼'}
          </button>
        </div>
      </div>

      {/* Bracket Body */}
      {isOpen && (
        <div className="p-4 sm:p-6 space-y-6 bg-black/40">
          {/* Section 1: First Round Byes (Seeds 1 & 2) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>👑</span>
                <span>Division Champions (First-Round Bye • Auto-Advance to Semifinals)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byeTeams.map((seedItem) => {
                const team = seedItem.team;
                return (
                  <div
                    key={seedItem.seed}
                    className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-black/60 to-black/80 border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center gap-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-lg bg-emerald-500/20 text-emerald-300 border-l border-b border-emerald-500/40 text-[10px] font-mono font-bold tracking-wider uppercase">
                      Seed #{seedItem.seed} • {seedItem.divName} Champ
                    </div>

                    <div className="w-14 h-14 rounded-xl bg-black/60 border border-emerald-500/40 p-1 flex-shrink-0 flex items-center justify-center">
                      <img
                        src={team.logoUrl}
                        alt={team.teamName}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="space-y-1 min-w-0 flex-grow">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-white truncate">
                          {team.teamName}
                        </span>
                        <span className="text-xs text-gray-400 font-semibold truncate">
                          ({team.managerName})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-emerald-300 font-bold">
                          {team.wins}-{team.losses}
                        </span>
                        <span className="text-gray-400">
                          {team.pointsFor} PF
                        </span>
                        <span className="text-[#d4af37] font-semibold">
                          PPG: {team.ppg}
                        </span>
                      </div>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <span>⚡</span>
                          <span>First Round Bye</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Wildcard Matchups (Seeds 3 vs 6, 4 vs 5) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
                <span>🎟️</span>
                <span>Wildcard Playoff Matchups (Seeds #3 to #6)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wildcards.map((wc, idx) => {
                const high = wc.highSeed.team;
                const low = wc.lowSeed.team;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/30 via-black/60 to-black/80 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)] space-y-3 relative"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-1.5">
                      <span className="text-cyan-400 font-bold uppercase tracking-wider">
                        Playoff Matchup {idx === 0 ? 'A' : 'B'}
                      </span>
                      <span className="text-gray-400">
                        Winner faces top seed in Semis
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* High Seed */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-black text-xs flex items-center justify-center border border-cyan-500/40 flex-shrink-0">
                            #{wc.highSeed.seed}
                          </span>
                          <img
                            src={high.logoUrl}
                            alt={high.teamName}
                            className="w-7 h-7 object-contain flex-shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-sm font-bold text-white">
                              {high.teamName}
                            </span>
                            <span className="text-xs text-gray-400 ml-1.5">
                              ({high.managerName})
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono text-xs flex-shrink-0 pl-2">
                          <span className="text-white font-bold">{high.wins}-{high.losses}</span>
                          <span className="text-gray-400 block text-[10px]">{high.pointsFor} PF</span>
                        </div>
                      </div>

                      {/* VS Divider */}
                      <div className="text-center">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-gray-400 uppercase tracking-widest">
                          VS
                        </span>
                      </div>

                      {/* Low Seed */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-black text-xs flex items-center justify-center border border-cyan-500/40 flex-shrink-0">
                            #{wc.lowSeed.seed}
                          </span>
                          <img
                            src={low.logoUrl}
                            alt={low.teamName}
                            className="w-7 h-7 object-contain flex-shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-sm font-bold text-white">
                              {low.teamName}
                            </span>
                            <span className="text-xs text-gray-400 ml-1.5">
                              ({low.managerName})
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono text-xs flex-shrink-0 pl-2">
                          <span className="text-white font-bold">{low.wins}-{low.losses}</span>
                          <span className="text-gray-400 block text-[10px]">{low.pointsFor} PF</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: On The Bubble / In The Hunt (Seeds 7 to 10) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>In The Hunt / Outside Cut Line (Seeds #7 to #10)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {bubbleTeams.map((b) => {
                const team = b.team;
                return (
                  <div
                    key={b.seed}
                    className="p-3 rounded-xl bg-black/50 border border-amber-500/30 flex items-center gap-3 relative overflow-hidden"
                  >
                    <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 font-mono font-black text-xs flex items-center justify-center border border-amber-500/40 flex-shrink-0">
                      #{b.seed}
                    </span>

                    <img
                      src={team.logoUrl}
                      alt={team.teamName}
                      className="w-8 h-8 object-contain flex-shrink-0"
                    />

                    <div className="min-w-0 flex-grow">
                      <div className="text-xs font-bold text-white truncate">
                        {team.teamName}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                        <span>{team.wins}-{team.losses}</span>
                        <span className="text-amber-400 font-bold">{b.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
