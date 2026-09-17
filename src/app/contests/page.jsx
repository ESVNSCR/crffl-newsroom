import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LEAGUE_PAYOUTS, TOTAL_PRIZE_PURSE, WEEKLY_CONTESTS_MASTER } from '@/lib/contests';
import { getNflState } from '@/lib/sleeper';
import { adjudicateWeekContest } from '@/lib/contestAdjudicator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Weekly Contests & Prize Payout Schedule | CRFFL Times-Herald',
  description: 'Official CRFFL Season VI prize purse, championship playoff payouts, and 14-week regular season side contest schedule.',
};

export default async function ContestsPage() {
  // Query Supabase for latest contest statuses and logged winners, and get current NFL state
  const [{ data: dbContests }, nflState] = await Promise.all([
    supabase
      .from('weekly_contests')
      .select('*')
      .order('week_number', { ascending: true }),
    getNflState().catch(() => ({ week: 1 })),
  ]);

  const currentNflWeek = nflState?.week || 1;

  const contestMap = {};
  (dbContests || []).forEach((c) => {
    contestMap[c.week_number] = c;
  });

  // Calculate live in-progress tracker or finalize any uncompleted week up to current NFL week
  const liveTrackers = {};
  const uncompletedWeeks = WEEKLY_CONTESTS_MASTER
    .filter((m) => m.week_number <= currentNflWeek && contestMap[m.week_number]?.status !== 'completed')
    .map((m) => m.week_number);

  await Promise.all(
    uncompletedWeeks.map(async (w) => {
      try {
        const trackerResult = await adjudicateWeekContest(w, { preview: false });
        if (trackerResult && trackerResult.success && trackerResult.winner_manager) {
          liveTrackers[w] = trackerResult;
          // If the week officially finalized right now, update contestMap in-memory
          if (trackerResult.isFinal && trackerResult.status === 'completed') {
            contestMap[w] = {
              ...(contestMap[w] || {}),
              winner_manager: trackerResult.winner_manager,
              winner_team: trackerResult.winner_team,
              winner_player: trackerResult.winner_player,
              winning_score: trackerResult.winning_score,
              status: 'completed',
            };
          }
        }
      } catch (err) {
        console.warn(`Could not calculate live tracker for week ${w}:`, err.message);
      }
    })
  );

  // Merge master static rules with live DB records and live tracker
  const contests = WEEKLY_CONTESTS_MASTER.map((master) => {
    const db = contestMap[master.week_number];
    const tracker = liveTrackers[master.week_number] || null;
    const isCurrent = master.week_number === currentNflWeek;

    return {
      ...master,
      ...(db || {}),
      adjudication_date: master.adjudication_date, // preserve curated date
      tracker,
      isCurrent,
    };
  });

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
        {/* 1. Header Masthead */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#151c2a] via-[#0f1522] to-[#090d14] border border-[#d4af37]/30 p-6 sm:p-10 shadow-2xl">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-xs font-mono font-bold tracking-wider uppercase">
              <span>CRFFL Season VI</span>
              <span>•</span>
              <span>Prize Purse & Weekly Contests</span>
              <span>•</span>
              <span>Est. 2021</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase font-serif">
              CONTESTS & <span className="text-[#d4af37]">PAYOUT SCHEDULE</span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-300 leading-relaxed">
              Every dollar accounted for. From the coveted $180 championship apex down to the fourteen $10 regular-season weekly side bounties, adjudicated following Monday Night Football by Marty Sullivan.
            </p>

            {/* Quick Stat Pill Highlights */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <div className="px-4 py-2 rounded-xl bg-black/60 border border-[#d4af37]/40 shadow-inner">
                <span className="text-[10px] font-mono text-gray-400 block uppercase">Total League Purse</span>
                <span className="text-xl sm:text-2xl font-black text-[#d4af37] font-mono">${TOTAL_PRIZE_PURSE}</span>
              </div>

              <div className="px-4 py-2 rounded-xl bg-black/60 border border-white/10 shadow-inner">
                <span className="text-[10px] font-mono text-gray-400 block uppercase">Championship Playoff Pool</span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono">$365</span>
              </div>

              <div className="px-4 py-2 rounded-xl bg-black/60 border border-white/10 shadow-inner">
                <span className="text-[10px] font-mono text-gray-400 block uppercase">Weekly Contests Pool</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">$140</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Official Championship & Playoff Payout Schedule */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-gray-800 pb-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#d4af37] font-bold">
                Championship Stakes & Tier Allocations
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Official Payout Schedule
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              6 Prize Tiers • All Payouts Guaranteed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {LEAGUE_PAYOUTS.map((tier, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={tier.place}
                  className={`p-6 rounded-2xl transition flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden ${
                    isFirst
                      ? 'bg-gradient-to-br from-[#1a2336] via-[#151c2a] to-[#0f1420] border-2 border-[#d4af37]'
                      : 'bg-[#121824] border border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {isFirst && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-2xl pointer-events-none" />
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] sm:text-[11px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${tier.badgeColor}`}>
                        {tier.tag}
                      </span>
                      <div className="text-right flex-shrink-0">
                        <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight block">
                          {tier.label}
                        </span>
                        {tier.subLabel && (
                          <span className="text-[10px] sm:text-[11px] font-mono text-purple-300 font-bold block -mt-0.5">
                            {tier.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-white">
                      {tier.place}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                    <span>CRFFL Season VI</span>
                    <span className="text-[#d4af37] font-bold">Guaranteed Purse</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. 14-Week Regular Season Bounty Schedule */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-gray-800 pb-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">
                $10 Weekly Regular Season Challenges
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                14-Week Contest Slate
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">
                Weeks 1–14 • $10 Cash Each
              </span>
              <Link
                href="/admin/contests"
                className="text-[11px] font-mono font-bold text-[#d4af37] hover:text-[#e6c24d] transition border border-[#d4af37]/30 px-2.5 py-1 rounded bg-[#d4af37]/10"
              >
                Commissioner Manager →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {contests.map((c) => {
              const hasWinner = Boolean(c.winner_manager || c.winner_team);
              const isCompleted = c.status === 'completed' && hasWinner;
              const isStatCorrectionPending = c.tracker?.status === 'stat_correction_pending';
              const isInProgress = c.tracker?.status === 'in_progress';
              const isActive = c.status === 'active' || c.isCurrent;
              const winningPlayer = c.winner_player || c.tracker?.winner_player;
              const runnerUpPlayer = c.tracker?.runner_up?.playerName || c.tracker?.runner_up?.name;

              return (
                <div
                  key={c.week_number}
                  className={`p-6 rounded-2xl bg-[#121824] border transition flex flex-col justify-between space-y-5 shadow-lg ${
                    isStatCorrectionPending
                      ? 'border-amber-500/70 shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : isInProgress
                      ? 'border-[#d4af37] shadow-[#d4af37]/15 ring-1 ring-[#d4af37]/40'
                      : isCompleted
                      ? 'border-emerald-900/60'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Header bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-black/60 border border-white/10 text-white">
                          Week {c.week_number}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {c.adjudication_date}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {c.is_player_contest && (
                          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/70 text-purple-300">
                            Player Challenge
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Winner Logged
                          </span>
                        )}
                        {isStatCorrectionPending && (
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500 text-amber-300 flex items-center gap-1.5 shadow-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                            </span>
                            Stat Correction Hold (&lt; 2 pts)
                          </span>
                        )}
                        {isInProgress && (
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] flex items-center gap-1.5 shadow-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
                            </span>
                            Active Tracker
                          </span>
                        )}
                        {!isCompleted && !isStatCorrectionPending && !isInProgress && isActive && (
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-300">
                            Active Week
                          </span>
                        )}
                        <span className="text-sm font-black font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800">
                          {c.prize || '$10'}
                        </span>
                      </div>
                    </div>

                    {/* Contest Title */}
                    <div>
                      <h3 className="text-xl font-black text-white">
                        {c.contest_name}
                      </h3>
                    </div>

                    {/* Description Rule */}
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  {/* Contest Tracker Box */}
                  <div className="pt-3 border-t border-gray-800/80">
                    {isCompleted ? (
                      /* 1. Official Completed Winner */
                      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                            🏆 Official Winner
                          </span>
                          <span className="font-bold text-[#d4af37] text-sm">
                            {c.winner_manager} <span className="text-gray-300 font-normal text-xs">({c.winner_team})</span>
                          </span>
                        </div>

                        {winningPlayer && (
                          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-emerald-900/40 text-gray-300">
                            <span className="text-gray-400 text-[11px] flex items-center gap-1.5 font-medium">
                              <span className="text-amber-400">⚡</span>
                              <span>Winning Player{winningPlayer.includes('&') ? 's' : ''}:</span>
                            </span>
                            <span className="font-mono font-bold text-amber-300 text-xs bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded text-right shadow-sm">
                              {winningPlayer}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-emerald-900/40 text-gray-300">
                          <span className="text-gray-400 text-[11px]">Winning Mark:</span>
                          <span className="font-mono font-bold text-emerald-400 text-xs">{c.winning_score}</span>
                        </div>
                        {c.tracker?.detail && (
                          <div className="text-[11px] text-gray-300 font-mono bg-black/40 p-2 rounded-lg border border-emerald-800/30 leading-relaxed">
                            {c.tracker.detail}
                          </div>
                        )}
                      </div>
                    ) : isStatCorrectionPending ? (
                      /* 2. Stat Correction Hold (< 2.0 pts) */
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/30 via-[#161d2b] to-[#0f1522] border border-amber-500/60 space-y-2.5 shadow-md">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                            </span>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                              Stat Correction Hold
                            </span>
                          </div>
                          <span className="text-[10px] font-mono uppercase font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider">
                            Provisional Leader
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Current Leader:</span>
                          <span className="font-bold text-white">
                            {c.tracker.winner_manager} <span className="text-gray-400 font-normal">({c.tracker.winner_team})</span>
                          </span>
                        </div>

                        {winningPlayer && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/20 text-gray-300">
                            <span className="text-gray-400 text-[11px] flex items-center gap-1.5 font-medium">
                              <span className="text-amber-400">⚡</span>
                              <span>Leading Player{winningPlayer.includes('&') ? 's' : ''}:</span>
                            </span>
                            <span className="font-mono font-bold text-amber-300 text-xs bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded text-right shadow-sm">
                              {winningPlayer}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Leading Mark:</span>
                          <span className="font-mono font-bold text-[#d4af37]">
                            {c.tracker.winning_score}
                          </span>
                        </div>

                        {c.tracker.runner_up && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/20 text-gray-300">
                            <span className="text-gray-400 text-[11px]">Runner-Up:</span>
                            <span className="font-mono text-gray-200 text-xs">
                              {runnerUpPlayer ? `${runnerUpPlayer} • ` : ''}{c.tracker.runner_up.managerName} ({c.tracker.runner_up.score})
                            </span>
                          </div>
                        )}

                        {c.tracker.detail && (
                          <div className="text-[11px] text-gray-300 font-mono bg-black/50 p-2 rounded-lg border border-amber-500/20 leading-relaxed">
                            {c.tracker.detail}
                          </div>
                        )}

                        <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-amber-300/90 font-mono">
                          <span>*All games complete • Margin &lt; 2.0 pts</span>
                          <span className="text-amber-200/70">Locks Wed 10:00 AM PT</span>
                        </div>
                      </div>
                    ) : isInProgress ? (
                      /* 3. Live In-Progress Tracker (Unofficial) */
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/30 via-[#141b27] to-[#0f1520] border border-[#d4af37]/45 space-y-2.5 shadow-md">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
                            </span>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d4af37]">
                              Live Contest Tracker
                            </span>
                          </div>
                          <span className="text-[10px] font-mono uppercase font-extrabold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 tracking-wider">
                            In Progress
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Current Leader:</span>
                          <span className="font-bold text-white">
                            {c.tracker.winner_manager} <span className="text-gray-400 font-normal">({c.tracker.winner_team})</span>
                          </span>
                        </div>

                        {winningPlayer && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-500/20 text-gray-300">
                            <span className="text-gray-400 text-[11px] flex items-center gap-1.5 font-medium">
                              <span className="text-[#d4af37]">⚡</span>
                              <span>Leading Player{winningPlayer.includes('&') ? 's' : ''}:</span>
                            </span>
                            <span className="font-mono font-bold text-[#d4af37] text-xs bg-black/40 border border-[#d4af37]/30 px-2.5 py-0.5 rounded text-right shadow-sm">
                              {winningPlayer}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Current Margin / Score:</span>
                          <span className="font-mono font-bold text-[#d4af37]">
                            {c.tracker.winning_score}
                          </span>
                        </div>

                        {c.tracker.detail && (
                          <div className="text-[11px] text-gray-300 font-mono bg-black/50 p-2 rounded-lg border border-white/5 leading-relaxed">
                            {c.tracker.detail}
                          </div>
                        )}

                        <div className="pt-2 border-t border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-blue-300/80 font-mono">
                          <span>*Not official yet — games in progress</span>
                          <span className="text-gray-400">Locks after MNF</span>
                        </div>
                      </div>
                    ) : (
                      /* 4. Upcoming Contest */
                      <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                          <span className="text-[10px] font-mono uppercase text-gray-400">
                            Tracker: Awaiting Kickoff
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">
                          Adjudicated after MNF
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Marty Sullivan Bureau Dispatch Note */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#121824] to-[#161f30] border border-gray-800 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black/60 shadow-md flex-shrink-0 flex items-center justify-center">
            <img
              src="/reporters/marty-sullivan-avatar.png"
              alt="Marty Sullivan"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <h4 className="text-base font-bold text-white">
              Official Adjudication Notice from Marty Sullivan
            </h4>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              "Every Tuesday at Noon in 'The Tuesday Recap', I review the box scores, strip away the excuses, and declare the official winner of that week's $10 bounty. If you want your ten bucks, don't come crying to the front desk—play hard, make your kicks, and stay off the injury report."
            </p>
          </div>

          <Link
            href="/?category=The+Tuesday+Recap#dispatches"
            className="px-4 py-2 rounded-xl bg-[#d4af37] text-gray-950 font-bold hover:bg-[#e6c24d] transition text-xs whitespace-nowrap shadow-md"
          >
            Read Tuesday Recaps →
          </Link>
        </div>
      </div>
    </div>
  );
}
