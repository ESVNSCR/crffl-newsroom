'use client';

import React from 'react';

export default function TeamPlayoffAnalyticsCard({ teamAnalytics }) {
  if (!teamAnalytics) return null;

  const {
    seed,
    seedType,
    seedStatus,
    isPlayoff,
    divisionName,
    divRank,
    divGb,
    pastSos,
    futureSos,
    simulation,
    vanceSosInsight,
    matchupDescription
  } = teamAnalytics;

  // Color scheme based on playoff seed tier
  const isTopTwo = seed <= 2;
  const isWildcard = seed >= 3 && seed <= 6;
  const isBubble = seed > 6;

  const seedBadgeColor = isTopTwo
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
    : isWildcard
    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]';

  const playoffPct = simulation?.playoffPct ?? 0;
  const champPct = simulation?.champPct ?? 0;
  const byePct = simulation?.byePct ?? 0;
  const projRecord = simulation?.projectedRecord ?? '0-0';

  // Progress bar color
  const progressBarColor =
    playoffPct >= 80
      ? 'from-emerald-500 to-teal-400'
      : playoffPct >= 50
      ? 'from-cyan-500 to-blue-500'
      : playoffPct >= 20
      ? 'from-amber-500 to-yellow-400'
      : 'from-rose-500 to-red-400';

  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
      {/* Seeding & Division Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Playoff Seed Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${seedBadgeColor}`}
          >
            <span>{isTopTwo ? '👑' : isWildcard ? '🎟️' : '⚠️'}</span>
            <span>
              Seed #{seed} • {seedType}
            </span>
          </span>

          {/* Division Standing Badge */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/5 text-gray-300 border border-white/10">
            <span>🏟️</span>
            <span>
              {divRank === 1 ? '1st' : divRank === 2 ? '2nd' : divRank === 3 ? '3rd' : `${divRank}th`} in {divisionName}
              {divGb > 0 ? ` (${divGb} GB)` : ' (Leader)'}
            </span>
          </span>
        </div>

        {/* Current Playoff Path Tag */}
        <span className="text-[11px] font-mono font-medium text-gray-300 bg-black/40 px-2.5 py-1 rounded border border-white/5 truncate max-w-full">
          {matchupDescription}
        </span>
      </div>

      {/* Probability Dashboard Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Playoff Probability */}
        <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 uppercase tracking-wider">
            <span>Playoff Odds</span>
            <span className="text-white font-bold">{playoffPct}%</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-white font-mono">
            {playoffPct}%
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressBarColor}`}
              style={{ width: `${Math.min(playoffPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Championship Probability */}
        <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 uppercase tracking-wider">
            <span>Title Equity</span>
            <span className="text-[#d4af37]">🏆</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-[#d4af37] font-mono">
            {champPct}%
          </div>
          <div className="text-[10px] font-mono text-gray-400">
            Championship Win
          </div>
        </div>

        {/* 1st Round Bye Odds */}
        <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 uppercase tracking-wider">
            <span>1st-Rd Bye</span>
            <span className="text-emerald-400">⚡</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {byePct}%
          </div>
          <div className="text-[10px] font-mono text-gray-400">
            Top 2 Finish
          </div>
        </div>

        {/* Projected Finish */}
        <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 uppercase tracking-wider">
            <span>Proj Record</span>
            <span className="text-gray-400">📊</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-white font-mono">
            {projRecord}
          </div>
          <div className="text-[10px] font-mono text-gray-400">
            14-Game Pace
          </div>
        </div>
      </div>

      {/* Strength of Schedule (SOS) Terminal */}
      <div className="p-3.5 rounded-xl bg-black/75 border border-white/15 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#d4af37]">
            <span>📐</span>
            <span>Strength of Schedule (SOS) Matrix</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            10,000-Sim Bayesian Model
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {/* Past SOS */}
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase">
                Past Schedule Faced
              </span>
              <span className="text-white font-bold">
                #{pastSos?.rank} in CRFFL ({pastSos?.label})
              </span>
            </div>
            <div className="text-right text-[11px]">
              <span className="text-gray-300 block font-semibold">
                {pastSos?.recordStr} (.{(Math.round((pastSos?.oppWinPct || 0) * 1000)).toString().padStart(3, '0')})
              </span>
              <span className="text-gray-400 block text-[10px]">
                {pastSos?.oppAvgPpg} Opp PPG
              </span>
            </div>
          </div>

          {/* Remaining SOS */}
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase">
                Remaining Runway
              </span>
              <span className="text-[#d4af37] font-bold">
                #{futureSos?.rank} in CRFFL ({futureSos?.label})
              </span>
            </div>
            <div className="text-right text-[11px]">
              <span className="text-gray-300 block font-semibold">
                {futureSos?.recordStr} (.{(Math.round((futureSos?.oppWinPct || 0) * 1000)).toString().padStart(3, '0')})
              </span>
              <span className="text-gray-400 block text-[10px]">
                {futureSos?.oppAvgPpg} Opp PPG
              </span>
            </div>
          </div>
        </div>

        {/* Vance AI Schedule Outlook Blurb */}
        {vanceSosInsight && (
          <div className="p-3 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 text-xs text-gray-200 leading-relaxed flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#d4af37] flex-shrink-0 mt-0.5">
              <img
                src="/reporters/marcus-vance-avatar.png"
                alt="Dr. Marcus Vance"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-bold gold-text uppercase tracking-wider text-[10px] block mb-0.5">
                Dr. Vance Postseason Outlook
              </span>
              <p className="text-gray-200">{vanceSosInsight}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
