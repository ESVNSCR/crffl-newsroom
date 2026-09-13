import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { COLUMNISTS } from '@/lib/columnists';
import HeroLeadStory from '@/components/HeroLeadStory';
import DispatchesClient from '@/components/DispatchesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // 1. Fetch recent articles
  const { data: articles } = await supabase
    .from('newsroom_articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  // 2. Fetch latest power rankings for the Apex sidebar widget
  const { data: powerRankingsRows } = await supabase
    .from('power_rankings')
    .select('*')
    .order('week_number', { ascending: false })
    .limit(1);

  const currentRankings = powerRankingsRows?.[0];
  const topTeams = (currentRankings?.rankings || [])
    .filter((t) => t.rank <= 3)
    .sort((a, b) => a.rank - b.rank);

  // 3. Fetch current week contest
  const { data: contestRows } = await supabase
    .from('weekly_contests')
    .select('*')
    .order('week_number', { ascending: true })
    .limit(1);

  const currentContest = contestRows?.[0] || {
    contest_name: 'Week 1 High Roller Challenge',
    prize: '$10 Cash',
    description: 'Highest single starting player score of the week takes home the $10 prize purse.',
    week_number: 1,
  };

  const leadArticle = articles?.[0] || null;
  const feedArticles = articles || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12">
      {/* 1. HERO LEAD STORY (A-1 Above the Fold) */}
      {leadArticle && <HeroLeadStory leadArticle={leadArticle} />}

      {/* 2. THE COLUMNIST DESKS (4 Beats Grid) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#d4af37] font-bold">
              The Times-Herald Bureau
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              The Editorial Desks
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-mono hidden sm:inline">
            4 Columnists Published Weekly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(COLUMNISTS).map((col) => (
            <div
              key={col.id}
              className="p-5 rounded-2xl bg-[#121824] border border-gray-800 hover:border-gray-700 transition flex flex-col justify-between space-y-4 shadow-lg group"
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-3.5">
                  <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black/60 shadow-md flex-shrink-0">
                    <img
                      src={col.avatar}
                      alt={col.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-snug">{col.name}</h3>
                    <span className="text-[11px] font-mono text-[#d4af37] block font-semibold">
                      {col.desk}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  {col.title}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                <span className="text-gray-400 font-mono">CRFFL Newsroom</span>
                <span className="text-[#d4af37] font-semibold group-hover:translate-x-0.5 transition-transform">
                  Read Desk →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. MAIN CONTENT STREAM & SIDEBAR RAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT / MAIN STREAM (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#d4af37] font-bold">
                Live From The Press Room
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Editorial Dispatches Wire
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {feedArticles.length} Columns Archived
            </span>
          </div>

          <DispatchesClient articles={feedArticles} />
        </div>

        {/* RIGHT / SIDEBAR RAIL (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Official Team Shop Banner */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-950/40 via-[#161d2b] to-[#0e1420] border border-[#d4af37]/40 p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🛍️</span>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-[#d4af37]">
                Official League Pro Shop
              </span>
            </div>

            <h3 className="text-xl font-black text-white leading-snug">
              CRFFL Merchandise & Custom Franchise Gear
            </h3>

            <p className="text-xs text-gray-300 leading-relaxed">
              Order official custom franchise apparel, championship commemorative hoodies, sideline caps, and league collectibles.
            </p>

            <Link
              href="/shop"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-[#d4af37] text-gray-950 font-bold hover:bg-[#e6c24d] transition shadow-lg text-xs"
            >
              Shop Official Gear at CRFFL.org/shop →
            </Link>
          </div>

          {/* Card 2: Apex Power Rankings Snapshot */}
          <div className="rounded-2xl bg-[#121824] border border-gray-800 p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📊</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Apex Power Index
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#d4af37]">
                Week {currentRankings?.week_number || 1}
              </span>
            </div>

            <div className="space-y-3">
              {topTeams.map((team) => (
                <div
                  key={team.rank}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800/80"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-black text-[#d4af37] w-6 text-center">
                      #{team.rank}
                    </span>
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                      <img
                        src={team.logo_url}
                        alt={team.team_name}
                        className="w-full h-full object-cover scale-105"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{team.team_name}</h4>
                      <span className="text-[10px] text-gray-400">
                        {team.manager_name} • {team.record || '0-0'}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-gray-300">
                    {team.trend || '▬'}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/power-rankings"
              className="inline-flex items-center justify-center w-full py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold transition text-xs border border-gray-700"
            >
              View Full 10-Team Countdown (#10 → #1) →
            </Link>
          </div>

          {/* Card 3: Active Weekly Contest */}
          <div className="rounded-2xl bg-[#121824] border border-gray-800 p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🏆</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Weekly $10 Contest
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                {currentContest.prize}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white">{currentContest.contest_name}</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                {currentContest.description}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800">
              <span>Week {currentContest.week_number} On Deck</span>
              <span className="text-[#d4af37] font-semibold">Tuesdays with Marty</span>
            </div>
          </div>

          {/* Card 4: Hall of Fame Pavilion Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-[#121824] to-[#1a2336] border border-white/10 p-6 space-y-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🏛️</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                CRFFL Hall of Fame
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Explore the Ring Room, championship pedestals, all-time scoring records, and head-to-head manager rivalry timelines.
            </p>

            <Link
              href="/hof"
              className="inline-flex items-center justify-center w-full py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition text-xs border border-white/10"
            >
              Enter Hall of Fame Pavilion →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
