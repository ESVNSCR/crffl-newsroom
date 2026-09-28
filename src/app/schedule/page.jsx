'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const TEAM_LOGOS = {
  'Team GardenGoddess': '/logos/pam.png',
  'Team CoreyCash': '/logos/corey.png',
  'Stars & Stripes': '/logos/mike-f.png',
  'Rebel Scum': '/logos/eric.png',
  'Team RaiderRose510': '/logos/ed.png',
  'Generic Football Team': '/logos/randy.png',
  'Hickory Huskers': '/logos/jeff.png',
  'Team Killa MC': '/logos/marcus.png',
  'Shortbus Superstars': '/logos/kc.png',
  'Moore Better': '/logos/mike-m.png',
  'TBD': '/logos/league.png',
};

const TEAMS = [
  'Team GardenGoddess',
  'Team CoreyCash',
  'Stars & Stripes',
  'Rebel Scum',
  'Team RaiderRose510',
  'Generic Football Team',
  'Hickory Huskers',
  'Team Killa MC',
  'Shortbus Superstars',
  'Moore Better',
];

const SCHEDULE_DATA = [
  { type: 'phase', title: 'Phase 1: The First Divisional Round (Weeks 1–5)' },
  {
    type: 'week',
    title: 'Week 1',
    games: [
      { away: 'Team GardenGoddess', home: 'Team CoreyCash' },
      { away: 'Stars & Stripes', home: 'Rebel Scum' },
      { away: 'Team RaiderRose510', home: 'Generic Football Team' },
      { away: 'Hickory Huskers', home: 'Team Killa MC' },
      { away: 'Shortbus Superstars', home: 'Moore Better', tag: 'Cross-Divisional' },
    ],
  },
  {
    type: 'week',
    title: 'Week 2',
    games: [
      { away: 'Team GardenGoddess', home: 'Stars & Stripes' },
      { away: 'Team CoreyCash', home: 'Shortbus Superstars' },
      { away: 'Team RaiderRose510', home: 'Hickory Huskers' },
      { away: 'Generic Football Team', home: 'Moore Better' },
      { away: 'Rebel Scum', home: 'Team Killa MC', tag: 'Cross-Divisional' },
    ],
  },
  {
    type: 'week',
    title: 'Week 3',
    games: [
      { away: 'Team GardenGoddess', home: 'Rebel Scum' },
      { away: 'Stars & Stripes', home: 'Shortbus Superstars' },
      { away: 'Team RaiderRose510', home: 'Team Killa MC' },
      { away: 'Hickory Huskers', home: 'Moore Better' },
      { away: 'Team CoreyCash', home: 'Generic Football Team', tag: 'Cross-Divisional' },
    ],
  },
  {
    type: 'week',
    title: 'Week 4',
    games: [
      { away: 'Team CoreyCash', home: 'Rebel Scum' },
      { away: 'Team GardenGoddess', home: 'Shortbus Superstars' },
      { away: 'Generic Football Team', home: 'Team Killa MC' },
      { away: 'Team RaiderRose510', home: 'Moore Better' },
      { away: 'Stars & Stripes', home: 'Hickory Huskers', tag: 'Cross-Divisional' },
    ],
  },
  {
    type: 'week',
    title: 'Week 5',
    games: [
      { away: 'Team CoreyCash', home: 'Stars & Stripes' },
      { away: 'Rebel Scum', home: 'Shortbus Superstars' },
      { away: 'Generic Football Team', home: 'Hickory Huskers' },
      { away: 'Team Killa MC', home: 'Moore Better' },
      { away: 'Team GardenGoddess', home: 'Team RaiderRose510', tag: 'Cross-Divisional' },
    ],
  },
  { type: 'phase', title: 'Phase 2: The Cross-Divisional Showcase (Weeks 6–9)' },
  {
    type: 'week',
    title: 'Week 6',
    games: [
      { away: 'Team GardenGoddess', home: 'Generic Football Team' },
      { away: 'Team CoreyCash', home: 'Hickory Huskers' },
      { away: 'Stars & Stripes', home: 'Team Killa MC' },
      { away: 'Rebel Scum', home: 'Moore Better' },
      { away: 'Shortbus Superstars', home: 'Team RaiderRose510' },
    ],
  },
  {
    type: 'week',
    title: 'Week 7',
    games: [
      { away: 'Team GardenGoddess', home: 'Hickory Huskers' },
      { away: 'Team CoreyCash', home: 'Team Killa MC' },
      { away: 'Stars & Stripes', home: 'Moore Better' },
      { away: 'Rebel Scum', home: 'Team RaiderRose510' },
      { away: 'Shortbus Superstars', home: 'Generic Football Team' },
    ],
  },
  {
    type: 'week',
    title: 'Week 8',
    games: [
      { away: 'Team GardenGoddess', home: 'Team Killa MC' },
      { away: 'Team CoreyCash', home: 'Moore Better' },
      { away: 'Stars & Stripes', home: 'Team RaiderRose510' },
      { away: 'Rebel Scum', home: 'Generic Football Team' },
      { away: 'Shortbus Superstars', home: 'Hickory Huskers' },
    ],
  },
  {
    type: 'week',
    title: 'Week 9',
    games: [
      { away: 'Team GardenGoddess', home: 'Moore Better' },
      { away: 'Team CoreyCash', home: 'Team RaiderRose510' },
      { away: 'Stars & Stripes', home: 'Generic Football Team' },
      { away: 'Rebel Scum', home: 'Hickory Huskers' },
      { away: 'Shortbus Superstars', home: 'Team Killa MC' },
    ],
  },
  { type: 'phase', title: 'Phase 3: The Divisional Rematches (Weeks 10–13)' },
  {
    type: 'week',
    title: 'Week 10',
    games: [
      { away: 'Team GardenGoddess', home: 'Shortbus Superstars' },
      { away: 'Team CoreyCash', home: 'Rebel Scum' },
      { away: 'Team RaiderRose510', home: 'Moore Better' },
      { away: 'Generic Football Team', home: 'Team Killa MC' },
      { away: 'Stars & Stripes', home: 'Hickory Huskers', tag: 'Cross-Divisional' },
    ],
  },
  {
    type: 'week',
    title: 'Week 11',
    games: [
      { away: 'Team CoreyCash', home: 'Stars & Stripes' },
      { away: 'Rebel Scum', home: 'Shortbus Superstars' },
      { away: 'Generic Football Team', home: 'Hickory Huskers' },
      { away: 'Team Killa MC', home: 'Moore Better' },
      { away: 'Team GardenGoddess', home: 'Team RaiderRose510', tag: 'Cross-Divisional' },
    ],
  },
  {
    type: 'week',
    title: 'Week 12',
    games: [
      { away: 'Team GardenGoddess', home: 'Rebel Scum' },
      { away: 'Stars & Stripes', home: 'Shortbus Superstars' },
      { away: 'Team RaiderRose510', home: 'Team Killa MC' },
      { away: 'Hickory Huskers', home: 'Moore Better' },
      { away: 'Team CoreyCash', home: 'Generic Football Team', tag: 'Cross-Divisional' },
    ],
  },
  {
    type: 'week',
    title: 'Week 13',
    games: [
      { away: 'Team GardenGoddess', home: 'Stars & Stripes' },
      { away: 'Team CoreyCash', home: 'Shortbus Superstars' },
      { away: 'Team RaiderRose510', home: 'Hickory Huskers' },
      { away: 'Generic Football Team', home: 'Moore Better' },
      { away: 'Rebel Scum', home: 'Team Killa MC', tag: 'Cross-Divisional' },
    ],
  },
  { type: 'phase', title: 'Phase 4: Rivalry Week (Week 14)' },
  {
    type: 'week',
    title: 'Week 14',
    games: [
      { away: 'TBD', home: 'TBD' },
      { away: 'TBD', home: 'TBD' },
      { away: 'TBD', home: 'TBD' },
      { away: 'TBD', home: 'TBD' },
      { away: 'TBD', home: 'TBD' },
    ],
  },
];

// Pre-baked completed matchup results for finalized weeks (zero layout shift on first paint)
const INITIAL_COMPLETED_RESULTS = {
  // Week 1 Final Results
  '1_Team CoreyCash___Team GardenGoddess': {
    winner: 'Team CoreyCash',
    loser: 'Team GardenGoddess',
    points: { 'Team CoreyCash': 243.12, 'Team GardenGoddess': 191.36 },
    margin: 51.76,
    isCompleted: true,
  },
  '1_Rebel Scum___Stars & Stripes': {
    winner: 'Stars & Stripes',
    loser: 'Rebel Scum',
    points: { 'Stars & Stripes': 259.29, 'Rebel Scum': 219.93 },
    margin: 39.36,
    isCompleted: true,
  },
  '1_Generic Football Team___Team RaiderRose510': {
    winner: 'Team RaiderRose510',
    loser: 'Generic Football Team',
    points: { 'Team RaiderRose510': 189.45, 'Generic Football Team': 158.29 },
    margin: 31.16,
    isCompleted: true,
  },
  '1_Hickory Huskers___Team Killa MC': {
    winner: 'Team Killa MC',
    loser: 'Hickory Huskers',
    points: { 'Team Killa MC': 216.01, 'Hickory Huskers': 179.97 },
    margin: 36.04,
    isCompleted: true,
  },
  '1_Moore Better___Shortbus Superstars': {
    winner: 'Shortbus Superstars',
    loser: 'Moore Better',
    points: { 'Shortbus Superstars': 196.35, 'Moore Better': 151.23 },
    margin: 45.12,
    isCompleted: true,
  },
  // Week 2 Final Results
  '2_Stars & Stripes___Team GardenGoddess': {
    winner: 'Team GardenGoddess',
    loser: 'Stars & Stripes',
    points: { 'Team GardenGoddess': 160.18, 'Stars & Stripes': 157.97 },
    margin: 2.21,
    isCompleted: true,
  },
  '2_Shortbus Superstars___Team CoreyCash': {
    winner: 'Shortbus Superstars',
    loser: 'Team CoreyCash',
    points: { 'Shortbus Superstars': 219.24, 'Team CoreyCash': 199.33 },
    margin: 19.91,
    isCompleted: true,
  },
  '2_Hickory Huskers___Team RaiderRose510': {
    winner: 'Hickory Huskers',
    loser: 'Team RaiderRose510',
    points: { 'Hickory Huskers': 194.81, 'Team RaiderRose510': 178.65 },
    margin: 16.16,
    isCompleted: true,
  },
  '2_Generic Football Team___Moore Better': {
    winner: 'Moore Better',
    loser: 'Generic Football Team',
    points: { 'Moore Better': 255.29, 'Generic Football Team': 218.26 },
    margin: 37.03,
    isCompleted: true,
  },
  '2_Rebel Scum___Team Killa MC': {
    winner: 'Team Killa MC',
    loser: 'Rebel Scum',
    points: { 'Team Killa MC': 181.74, 'Rebel Scum': 181.03 },
    margin: 0.71,
    isCompleted: true,
  },
};

const getGameKey = (weekNum, teamA, teamB) => {
  const sorted = [(teamA || '').trim(), (teamB || '').trim()].sort();
  return `${weekNum}_${sorted[0]}___${sorted[1]}`;
};

export default function SchedulePage() {
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [matchupResults, setMatchupResults] = useState(INITIAL_COMPLETED_RESULTS);
  const [currentWeek, setCurrentWeek] = useState(3);

  const cleanName = (name) => name.replace(/^Team\s+/, '');

  // Live dynamic fetch for concluded weeks (auto-updates every week as games conclude)
  useEffect(() => {
    let isMounted = true;
    async function loadScheduleResults() {
      try {
        const res = await fetch('/api/schedule-results');
        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            if (data.currentWeek) setCurrentWeek(data.currentWeek);
            if (data.matchupLookup) {
              setMatchupResults((prev) => ({
                ...prev,
                ...data.matchupLookup,
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch dynamic schedule results:', err);
      }
    }

    loadScheduleResults();
    // Auto-poll every 60 seconds to detect week conclusion in real time
    const interval = setInterval(loadScheduleResults, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute selected team's completed record
  const completedTeamGames =
    selectedTeam !== 'All'
      ? SCHEDULE_DATA.filter((item) => item.type === 'week').flatMap((w) => {
          const weekNum = parseInt(w.title.replace(/\D/g, ''), 10);
          return w.games
            .filter((g) => g.away === selectedTeam || g.home === selectedTeam)
            .map((g) => {
              const res = matchupResults[getGameKey(weekNum, g.away, g.home)];
              return res?.isCompleted ? res : null;
            })
            .filter(Boolean);
        })
      : [];

  const teamWins = completedTeamGames.filter((g) => g.winner === selectedTeam).length;
  const teamLosses = completedTeamGames.filter((g) => g.loser === selectedTeam).length;
  const teamTies = completedTeamGames.filter((g) => g.isTie).length;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.3in;
            size: portrait;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
          }
          header,
          footer,
          .no-print {
            display: none !important;
          }
          .schedule-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-clean-card {
            background: #ffffff !important;
            border: 1px solid #cccccc !important;
            color: #000000 !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
          .print-black-text {
            color: #000000 !important;
          }
          .print-logo {
            width: 32px !important;
            height: 32px !important;
            filter: none !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-8 schedule-container">
        {/* Header Masthead */}
        <div className="text-center space-y-3 no-print">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-mono font-bold tracking-wider uppercase">
            <span>Official League Calendar</span>
            <span>•</span>
            <span>Season 2026</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            CRFFL <span className="text-[#d4af37]">SCHEDULE BOARD</span>
          </h1>

          <p className="max-w-xl mx-auto text-sm text-gray-300">
            Full 14-week regular season slate. Final scores and victory crowns 👑 update automatically at the conclusion of each week. Click any franchise to view their dedicated schedule.
          </p>

          <div className="flex items-center justify-center gap-3 pt-1 no-print">
            <Link
              href="/contests"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#d4af37] bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/30 px-3.5 py-1 rounded-full transition shadow-sm"
            >
              <span>View 14-Week Contests & Prize Payouts ($520 Purse)</span>
              <span>→</span>
            </Link>
          </div>

          {/* Quick Team Filter Bar */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedTeam('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTeam === 'All'
                  ? 'bg-[#d4af37] text-gray-950 shadow-md'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
              }`}
            >
              Full League Slate
            </button>
            {TEAMS.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTeam(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedTeam === t
                    ? 'bg-[#d4af37] text-gray-950 font-bold shadow-md'
                    : 'bg-gray-900/60 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                }`}
              >
                <img
                  src={TEAM_LOGOS[t]}
                  alt={t}
                  className="w-5 h-5 object-contain"
                />
                <span>{cleanName(t)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SINGLE TEAM VIEW */}
        {selectedTeam !== 'All' ? (
          <div className="space-y-6">
            <div className="text-center rounded-2xl bg-[#121824] border border-gray-800 p-6 sm:p-8 space-y-4 shadow-xl print-clean-card">
              <div className="relative mx-auto w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center p-2">
                <img
                  src={TEAM_LOGOS[selectedTeam]}
                  alt={selectedTeam}
                  className="max-w-full max-h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div>
                <span className="text-xs font-mono text-[#d4af37] uppercase tracking-widest font-bold">
                  2026 Franchise Calendar
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wide print-black-text">
                  {cleanName(selectedTeam)}
                </h2>

                {/* Team Season Record Banner */}
                {completedTeamGames.length > 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/50 border border-[#d4af37]/40 text-xs font-mono shadow-sm">
                    <span className="text-gray-400 uppercase tracking-wider font-semibold">Completed Record:</span>
                    <span className="text-emerald-400 font-black text-sm">{teamWins}W</span>
                    <span className="text-gray-600">-</span>
                    <span className="text-rose-400 font-black text-sm">{teamLosses}L</span>
                    {teamTies > 0 && (
                      <>
                        <span className="text-gray-600">-</span>
                        <span className="text-amber-400 font-black text-sm">{teamTies}T</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2 no-print">
                <button
                  onClick={() => setSelectedTeam('All')}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition border border-gray-700 flex items-center gap-1.5"
                >
                  ← Full League Schedule
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#e6c24d] text-gray-950 text-xs font-black transition shadow-lg flex items-center gap-1.5"
                >
                  Print Team Schedule
                </button>
              </div>
            </div>

            {/* Team Games Rows */}
            <div className="space-y-2.5">
              {SCHEDULE_DATA.filter((item) => item.type === 'week').flatMap((w) => {
                const weekNum = parseInt(w.title.replace(/\D/g, ''), 10);
                return w.games
                  .filter((g) => g.away === selectedTeam || g.home === selectedTeam)
                  .map((game, idx) => {
                    const opponent = game.home === selectedTeam ? game.away : game.home;
                    const res = matchupResults[getGameKey(weekNum, game.away, game.home)];
                    const isOver = res?.isCompleted === true;
                    const myTeamWon = isOver && res?.winner === selectedTeam;
                    const oppWon = isOver && res?.winner === opponent;
                    const isTie = isOver && res?.isTie;
                    const myScore = res?.points?.[selectedTeam];
                    const oppScore = res?.points?.[opponent];

                    return (
                      <div
                        key={idx}
                        onClick={() => opponent !== 'TBD' && setSelectedTeam(opponent)}
                        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition shadow-md print-clean-card group cursor-pointer ${
                          isOver
                            ? myTeamWon
                              ? 'bg-[#121c1f]/90 hover:bg-[#142327] border-emerald-500/40 hover:border-emerald-500/70'
                              : 'bg-[#1a1215]/90 hover:bg-[#201418] border-rose-500/30 hover:border-rose-500/60'
                            : 'bg-[#121824] hover:bg-[#161f30] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                          <span className="w-14 sm:w-20 font-mono font-bold text-xs sm:text-sm text-[#d4af37] print-black-text flex-shrink-0">
                            {w.title}
                          </span>

                          {/* Status Badge: W / L / TIE / VS */}
                          {isOver ? (
                            myTeamWon ? (
                              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-black bg-gradient-to-r from-emerald-500 to-emerald-600 text-gray-950 shadow flex items-center gap-1 flex-shrink-0">
                                <span>👑</span> W
                              </span>
                            ) : isTie ? (
                              <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                                TIE
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex-shrink-0">
                                L
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black bg-[#d4af37] text-gray-950 shadow-sm flex-shrink-0">
                              VS
                            </span>
                          )}

                          <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0 print-logo">
                            <img
                              src={TEAM_LOGOS[opponent]}
                              alt={opponent}
                              className="max-w-full max-h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs sm:text-base text-white group-hover:text-[#d4af37] transition-colors truncate block print-black-text">
                                {cleanName(opponent)}
                              </span>
                              {oppWon && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-black text-amber-300 bg-amber-400/20 border border-amber-400/40 shadow-sm">
                                  <span>👑</span> WIN
                                </span>
                              )}
                            </div>

                            {/* Final Score Breakdown */}
                            {isOver && myScore != null && oppScore != null && (
                              <span className="font-mono text-xs text-gray-400 block mt-0.5 print-black-text">
                                <span className={myTeamWon ? 'text-emerald-400 font-bold' : 'text-gray-300'}>
                                  {myScore.toFixed(2)}
                                </span>
                                {' — '}
                                <span className={oppWon ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                                  {oppScore.toFixed(2)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isOver && myScore != null && oppScore != null && (
                            <span
                              className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                myTeamWon
                                  ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                                  : 'text-gray-400 bg-gray-800/60 border border-gray-700/50'
                              }`}
                            >
                              {myTeamWon
                                ? `+${(myScore - oppScore).toFixed(2)}`
                                : `-${(oppScore - myScore).toFixed(2)}`}
                            </span>
                          )}

                          {game.tag && (
                            <span className="text-[10px] font-mono uppercase bg-[#d4af37]/15 text-[#d4af37] px-2 py-0.5 rounded font-semibold border border-[#d4af37]/30">
                              {game.tag}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
              })}
            </div>
          </div>
        ) : (
          /* FULL LEAGUE VIEW */
          <div className="space-y-10">
            {SCHEDULE_DATA.map((item, idx) => {
              if (item.type === 'phase') {
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-gradient-to-r from-[#d4af37]/20 via-[#d4af37]/30 to-[#d4af37]/20 border border-[#d4af37]/40 py-3 px-4 text-center shadow-lg print-clean-card"
                  >
                    <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-widest text-[#d4af37] print-black-text">
                      ★ {item.title} ★
                    </span>
                  </div>
                );
              }

              const weekNum = parseInt(item.title.replace(/\D/g, ''), 10);

              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#121824] border border-gray-800 overflow-hidden shadow-xl print-clean-card"
                >
                  <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-6 py-3 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                      {item.title}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-400">
                      5 Matchups
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    {item.games.map((g, gIdx) => {
                      const res = matchupResults[getGameKey(weekNum, g.away, g.home)];
                      const isOver = res?.isCompleted === true;
                      const awayWon = isOver && res?.winner === g.away;
                      const homeWon = isOver && res?.winner === g.home;
                      const isTie = isOver && res?.isTie;
                      const awayScore = res?.points?.[g.away];
                      const homeScore = res?.points?.[g.home];

                      return (
                        <div
                          key={gIdx}
                          className={`flex items-center justify-between p-3 rounded-xl border transition print-clean-card ${
                            isOver
                              ? 'bg-gray-900/80 border-gray-700/60 shadow-inner'
                              : 'bg-gray-900/60 hover:bg-gray-800/70 border-gray-800/80'
                          }`}
                        >
                          {/* Team 1 (Away) */}
                          <div
                            onClick={() => g.away !== 'TBD' && setSelectedTeam(g.away)}
                            className="flex items-center gap-2 sm:gap-3 w-[42%] min-w-0 cursor-pointer group"
                          >
                            <div className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 print-logo">
                              <img
                                src={TEAM_LOGOS[g.away]}
                                alt={g.away}
                                className="max-w-full max-h-full object-contain group-hover:scale-105 transition drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-xs sm:text-sm font-bold truncate print-black-text ${
                                    awayWon
                                      ? 'text-[#d4af37] font-black'
                                      : 'text-white group-hover:text-[#d4af37]'
                                  }`}
                                >
                                  {cleanName(g.away)}
                                </span>
                                {awayWon && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-black text-amber-300 bg-amber-400/20 border border-amber-400/40 shadow-sm flex-shrink-0">
                                    <span>👑</span> WIN
                                  </span>
                                )}
                              </div>

                              {isOver && awayScore != null && (
                                <span
                                  className={`text-[11px] sm:text-xs font-mono block mt-0.5 ${
                                    awayWon ? 'text-[#d4af37] font-bold' : 'text-gray-400'
                                  }`}
                                >
                                  {awayScore.toFixed(2)} pts
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Center VS or FINAL Badge */}
                          <div className="w-[16%] text-center flex flex-col items-center justify-center flex-shrink-0">
                            {isOver ? (
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] sm:text-[10px] font-black font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded shadow tracking-wider">
                                  FINAL
                                </span>
                                {res.margin != null && (
                                  <span className="text-[8px] sm:text-[9px] font-mono text-gray-400 mt-0.5 print-black-text">
                                    +{res.margin.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <>
                                <span className="text-[10px] sm:text-xs font-black bg-[#d4af37] text-gray-950 px-1.5 sm:px-2 py-0.5 rounded shadow">
                                  VS
                                </span>
                                {g.tag && (
                                  <span className="text-[8px] sm:text-[9px] font-mono text-gray-400 uppercase mt-0.5 tracking-tight truncate max-w-full">
                                    {g.tag}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Team 2 (Home) */}
                          <div
                            onClick={() => g.home !== 'TBD' && setSelectedTeam(g.home)}
                            className="flex items-center justify-end gap-2 sm:gap-3 w-[42%] min-w-0 cursor-pointer group text-right"
                          >
                            <div className="min-w-0 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {homeWon && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-black text-amber-300 bg-amber-400/20 border border-amber-400/40 shadow-sm flex-shrink-0">
                                    <span>👑</span> WIN
                                  </span>
                                )}
                                <span
                                  className={`text-xs sm:text-sm font-bold truncate print-black-text ${
                                    homeWon
                                      ? 'text-[#d4af37] font-black'
                                      : 'text-white group-hover:text-[#d4af37]'
                                  }`}
                                >
                                  {cleanName(g.home)}
                                </span>
                              </div>

                              {isOver && homeScore != null && (
                                <span
                                  className={`text-[11px] sm:text-xs font-mono block mt-0.5 ${
                                    homeWon ? 'text-[#d4af37] font-bold' : 'text-gray-400'
                                  }`}
                                >
                                  {homeScore.toFixed(2)} pts
                                </span>
                              )}
                            </div>

                            <div className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 print-logo">
                              <img
                                src={TEAM_LOGOS[g.home]}
                                alt={g.home}
                                className="max-w-full max-h-full object-contain group-hover:scale-105 transition drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
