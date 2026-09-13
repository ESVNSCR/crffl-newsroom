import { supabase } from '@/lib/supabase';

export const revalidate = 60;

export default async function PowerRankingsPage({ searchParams }) {
  const sp = await searchParams;
  const requestedWeek = sp?.week ? Number(sp.week) : null;

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
                <p className="text-sm text-gray-300 mt-1">
                  By <span className="gold-text font-bold">Dr. Marcus Vance</span> •{' '}
                  <span className="text-white font-semibold">
                    Week {currentRankings?.week_number || 1}
                  </span>
                </p>
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
                currentRankings.intro_blurb
                  .split('\n\n')
                  .map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <p className="italic text-gray-400">
                  Awaiting Dr. Vance's regression models for this week. Rankings will publish Wednesday at 2:00 PM.
                </p>
              )}
            </div>
          </div>

          {/* Rankings List */}
          <div className="space-y-6">
            {currentRankings?.rankings?.map((team) => {
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
                  className={`glass-panel p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 transition relative ${
                    isNumberOne ? 'rank-1-glow' : 'hover:border-white/30'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className="flex flex-col items-center justify-center min-w-[90px] text-center">
                    <span className="text-4xl sm:text-5xl font-black text-white/90">
                      #{team.rank}
                    </span>
                    {isNumberOne && (
                      <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#d4af37] mt-1 bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/30">
                        Top Seed
                      </span>
                    )}
                  </div>

                  {/* Team Logo */}
                  <div className="flex-shrink-0">
                    <img
                      src={team.logo_url}
                      alt={`${team.team_name} logo`}
                      className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] rounded-xl"
                    />
                  </div>

                  {/* Team Info & Blurb */}
                  <div className="flex-grow text-center md:text-left space-y-2">
                    <div className="flex flex-wrap items-baseline gap-2 justify-center md:justify-start">
                      <h2 className="text-2xl font-bold text-white">{team.team_name}</h2>
                      <span className="text-sm font-medium text-gray-400">
                        ({team.manager_name})
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-semibold text-[#d4af37]">
                      Record: {team.record || '0-0'} &nbsp;|&nbsp; PF: {team.points_for || '0.0'}
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed pt-1">
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
        </div>
      </div>
    </div>
  );
}

