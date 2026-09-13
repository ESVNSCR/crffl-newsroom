import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LEAGUE_PAYOUTS, TOTAL_PRIZE_PURSE, WEEKLY_CONTESTS_MASTER } from '@/lib/contests';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Weekly Contests & Prize Payout Schedule | CRFFL Times-Herald',
  description: 'Official CRFFL Season VI prize purse, championship playoff payouts, and 14-week regular season side contest schedule.',
};

export default async function ContestsPage() {
  // Query Supabase for latest contest statuses and logged winners
  const { data: dbContests } = await supabase
    .from('weekly_contests')
    .select('*')
    .order('week_number', { ascending: true });

  const contestMap = {};
  (dbContests || []).forEach((c) => {
    contestMap[c.week_number] = c;
  });

  // Merge master static rules with live DB records
  const contests = WEEKLY_CONTESTS_MASTER.map((master) => {
    const db = contestMap[master.week_number];
    return {
      ...master,
      ...(db || {}),
      adjudication_date: master.adjudication_date, // preserve curated date
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
              Every dollar accounted for. From the coveted $180 championship apex down to the fourteen $10 regular-season weekly side bounties, adjudicated every Tuesday by Marty Sullivan.
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
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full border ${tier.badgeColor}`}>
                        {tier.tag}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                        {tier.label}
                      </span>
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
              const isActive = c.status === 'active';

              return (
                <div
                  key={c.week_number}
                  className={`p-6 rounded-2xl bg-[#121824] border transition flex flex-col justify-between space-y-4 shadow-lg ${
                    isActive
                      ? 'border-[#d4af37] shadow-[#d4af37]/10'
                      : hasWinner
                      ? 'border-emerald-900/60'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="space-y-3">
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
                        {isActive && (
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] animate-pulse">
                            Active This Week
                          </span>
                        )}
                        {hasWinner && (
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300">
                            Winner Logged
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

                  {/* Footer / Winner Card */}
                  <div className="pt-3 border-t border-gray-800/80">
                    {hasWinner ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Winner:</span>
                        <span className="font-bold text-[#d4af37]">
                          {c.winner_manager} ({c.winner_team}) {c.winning_score ? `• ${c.winning_score} pts` : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="font-mono">Adjudicated by Marty Sullivan</span>
                        <span className="text-gray-300 font-semibold">Tuesdays at Noon</span>
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
              src="/reporters/marty-sullivan.png"
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

