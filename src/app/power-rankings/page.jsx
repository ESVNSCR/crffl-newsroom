import { supabase } from '@/lib/supabase';
import { MANAGERS } from '@/lib/sleeper';
import { getSleeperPlayerMap, sanitizeManagerNames } from '@/lib/sleeperPlayers';
import PowerRankingComments from '@/components/PowerRankingComments';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PowerRankingsPage({ searchParams }) {
  const sp = await searchParams;
  const requestedWeek = sp?.week ? Number(sp.week) : null;

  // Query player map to ensure no raw player IDs ever leak to display
  const playerMap = await getSleeperPlayerMap();

  // Query latest or requested week
  let query = supabase
    .from('power_rankings')
    .select('*')
    .order('week_number', { ascending: false });

  if (requestedWeek) {
    query = query.eq('week_number', requestedWeek);
  }

  const { data: rows } = await query;
  const currentRankings = rows?.[0];

  // Also query available weeks for archive selector
  const { data: allWeeks } = await supabase
    .from('power_rankings')
    .select('week_number')
    .order('week_number', { ascending: false });

  const weekList = Array.from(new Set(allWeeks?.map((w) => w.week_number) || []));

  // Process, normalize names, clean blurbs, and sort from #10 down to #1
  const isWeekOne = (currentRankings?.week_number || 1) === 1;
  const currentWeekNum = currentRankings?.week_number || 1;
  const prevWeekNum = currentWeekNum - 1;

  // Fetch previous week rankings to ensure 100% mathematical precision for trend arrows
  let prevRankMap = {};
  if (prevWeekNum >= 1) {
    const { data: prevRow } = await supabase
      .from('power_rankings')
      .select('rankings')
      .eq('week_number', prevWeekNum)
      .maybeSingle();

    if (prevRow?.rankings && Array.isArray(prevRow.rankings)) {
      prevRow.rankings.forEach((item) => {
        if (item.username) prevRankMap[item.username.toLowerCase()] = item.rank;
        if (item.manager_name) prevRankMap[item.manager_name.toLowerCase()] = item.rank;
        if (item.team_name) prevRankMap[item.team_name.toLowerCase()] = item.rank;
      });
    }
  }

  const displayRankings = [...(currentRankings?.rankings || [])]
    .map((team) => {
      const preset =
        MANAGERS[team.username] ||
        MANAGERS[team.manager_name] ||
        Object.values(MANAGERS).find(
          (m) =>
            m.teamName?.toLowerCase() === team.team_name?.toLowerCase() ||
            m.managerName?.toLowerCase() === team.manager_name?.toLowerCase()
        ) ||
        {};

      let cleanBlurb = team.blurb || '';
      cleanBlurb = cleanBlurb
        .replace(/\bTeam 10\b/g, 'Team Killa MC')
        .replace(/\bTeam 4\b/g, 'Team RaiderRose510')
        .replace(/\bTeam 8\b/g, 'Team CoreyCash')
        .replace(/\bTeam 2\b/g, 'Team GardenGoddess');

      // Resolve any player IDs in blurb to actual player names
      cleanBlurb = cleanBlurb.replace(/(?:player\s*#?|#)(\d{3,6})\b/gi, (match, id) => {
        if (playerMap && playerMap[id]) {
          return playerMap[id].name;
        }
        return match;
      });

      cleanBlurb = sanitizeManagerNames(cleanBlurb);

      // Compute mathematical trend from previous week
      let computedTrend = team.trend || '▬';
      if (prevWeekNum >= 1 && Object.keys(prevRankMap).length > 0) {
        const prev =
          prevRankMap[team.username?.toLowerCase()] ||
          prevRankMap[team.manager_name?.toLowerCase()] ||
          prevRankMap[team.team_name?.toLowerCase()] ||
          prevRankMap[preset.managerName?.toLowerCase()] ||
          prevRankMap[preset.teamName?.toLowerCase()];

        if (typeof prev === 'number') {
          const diff = prev - team.rank;
          if (diff > 0) computedTrend = `▲ ${diff}`;
          else if (diff < 0) computedTrend = `▼ ${Math.abs(diff)}`;
          else computedTrend = '▬';
        }
      }

      return {
        ...team,
        team_name: preset.teamName || team.team_name,
        manager_name: preset.managerName || team.manager_name,
        logo_url: preset.logo || team.logo_url,
        record: isWeekOne ? '0-0' : team.record || '0-0',
        points_for: isWeekOne ? '0.0' : team.points_for || '0.0',
        blurb: cleanBlurb,
        trend: isWeekOne ? '▬' : computedTrend,
      };
    })
    .sort((a, b) => b.rank - a.rank); // Sort 10 at the top, down to 1 at the bottom

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: `url('https://crffl.org/wp-content/uploads/2026/08/Football-Stadium-Background-scaled.png')`,
      }}
    >
      <div className="min-h-screen bg-black/75 backdrop-blur-sm py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Header Panel */}
          <div className="glass-panel p-8 sm:p-10 border border-white/20 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase font-mono tracking-widest text-[#d4af37]">
                  Applied Mathematics & Fantasy Arbitrage Desk
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  CRFFL Power Rankings
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black/60 shadow-md flex-shrink-0 flex items-center justify-center">
                      <img
                        src="/reporters/marcus-vance-avatar.png"
                        alt="Dr. Marcus Vance"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-gray-300">
                      By <span className="gold-text font-bold">Dr. Marcus Vance</span> •{' '}
                      <span className="text-white font-semibold">
                        Week {currentRankings?.week_number || 1}
                      </span>{' '}
                      <span className="text-gray-400 text-xs">(Revealing #10 down to #1)</span>
                    </p>
                  </div>

                  <a
                    href="#comments"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-[#d4af37]/20 border border-white/15 hover:border-[#d4af37]/50 text-gray-200 hover:text-[#d4af37] transition shadow-sm ml-auto sm:ml-0"
                  >
                    <span>💬</span>
                    <span>Manager Debate</span>
                  </a>
                </div>
              </div>

              {/* Week Selector */}
              {weekList.length > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400 font-medium">Archive:</span>
                  <div className="flex gap-1">
                    {weekList.map((w) => (
                      <a
                        key={w}
                        href={`/power-rankings?week=${w}`}
                        className={`px-2.5 py-1 text-xs rounded font-bold border transition ${
                          currentRankings?.week_number === w
                            ? 'bg-[#d4af37] text-gray-950 border-[#d4af37]'
                            : 'bg-black/50 text-gray-300 border-white/10 hover:border-white/30'
                        }`}
                      >
                        W{w}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Intro Blurb */}
            <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed text-sm sm:text-base space-y-4">
              {currentRankings?.intro_blurb ? (
                sanitizeManagerNames(currentRankings.intro_blurb)
                  .split('\n\n')
                  .map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <p className="italic text-gray-400">
                  Awaiting Dr. Vance's regression models for this week. Rankings will publish Tuesday at 2:00 PM.
                </p>
              )}
            </div>
          </div>

          {/* Rankings List (Counting Down: #10 at top down to #1 at bottom) */}
          <div className="space-y-6">
            {displayRankings.map((team) => {
              const isNumberOne = team.rank === 1;
              const trend = team.trend || '▬';
              const trendClass = trend.includes('▲')
                ? 'trend-up'
                : trend.includes('▼')
                ? 'trend-down'
                : 'trend-flat';

              return (
                <div
                  key={team.rank}
                  className={`glass-panel p-5 sm:p-8 flex flex-col md:flex-row items-center gap-4 sm:gap-8 transition relative ${
                    isNumberOne ? 'rank-1-glow' : 'hover:border-white/30'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className="flex flex-col items-center justify-center min-w-[70px] sm:min-w-[90px] text-center">
                    <span className="text-3xl sm:text-5xl font-black text-white/90">
                      #{team.rank}
                    </span>
                    {isNumberOne && (
                      <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#d4af37] mt-1 bg-[#d4af37]/10 px-2.5 py-0.5 rounded border border-[#d4af37]/30 whitespace-nowrap">
                        Apex #1
                      </span>
                    )}
                  </div>

                  {/* Team Logo: Responsive container with full containment to avoid clipping */}
                  <div className="flex-shrink-0 flex items-center justify-center w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 p-2 overflow-hidden rounded-2xl bg-black/40 border border-white/10 shadow-inner">
                    <img
                      src={team.logo_url}
                      alt={`${team.team_name} logo`}
                      className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:scale-105"
                    />
                  </div>

                  {/* Team Info & Blurb */}
                  <div className="flex-grow text-center md:text-left space-y-2">
                    <div className="flex flex-wrap items-baseline gap-2 justify-center md:justify-start">
                      <h2 className="text-2xl sm:text-3xl font-bold text-white">
                        {team.team_name}
                      </h2>
                      <span className="text-base font-semibold text-gray-300">
                        ({team.manager_name})
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-semibold text-[#d4af37]">
                      Record: {team.record || '0-0'} &nbsp;|&nbsp; PF: {team.points_for || '0.0'}
                    </div>

                    <p className="text-sm sm:text-base text-gray-200 leading-relaxed pt-2">
                      {team.blurb}
                    </p>
                  </div>

                  {/* Trend Indicator */}
                  <div className="flex-shrink-0 self-center md:self-start md:pt-2">
                    <span className={trendClass}>{trend}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manager Testimony & Debate Comments Section */}
          {currentRankings && (
            <PowerRankingComments
              rankingId={currentRankings.id}
              weekNumber={currentRankings.week_number}
            />
          )}
        </div>
      </div>
    </div>
  );
}
