import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;

const COLUMNISTS = [
  {
    id: 'marty_sullivan',
    name: 'Marty Sullivan',
    beat: 'The Tuesday Recap',
    schedule: 'Tuesdays @ 12:00 PM',
    category: 'The Tuesday Recap',
    tag: 'Old-School & Box Scores',
    bio: 'Division III guard, 35 years of marriage, dented thermos coffee. Despises analytics and wide receivers on TikTok.',
    color: 'from-amber-700/30 to-amber-900/10 border-amber-600/40',
  },
  {
    id: 'chloe_carmichael',
    name: 'Chloe Carmichael',
    beat: 'The Spin Room',
    schedule: 'Wednesdays @ 12:00 PM',
    category: 'The Spin Room',
    tag: 'Waivers & Locker Room Drama',
    bio: 'Northwestern dual-grad, former club lacrosse enforcer. Lives on Twitter, hates sentimentality, and ruthlessly grades trades.',
    color: 'from-cyan-700/30 to-cyan-900/10 border-cyan-600/40',
  },
  {
    id: 'marcus_vance',
    name: 'Dr. Marcus Vance',
    beat: 'The Data Desk',
    schedule: 'Wednesdays @ 2:00 PM',
    category: 'Power Rankings',
    tag: 'MIT Algorithms & Regression Models',
    bio: 'MIT Applied Math Ph.D., former Wall Street quant. Treats the league like a hedge fund and brews pour-over at exact 202°F.',
    color: 'from-purple-700/30 to-purple-900/10 border-purple-600/40',
  },
  {
    id: 'buck_callahan',
    name: 'Buck Callahan',
    beat: 'The Grit Desk',
    schedule: 'Thursdays @ 12:00 PM',
    category: 'The Grit Desk',
    tag: 'Trench Warfare & Matchup Previews',
    bio: 'FSU dropout, sports-radio screamer, 5-alarm driveway BBQ chef. Fiercely biased for Rebel Scum while loudly denying it.',
    color: 'from-red-700/30 to-red-900/10 border-red-600/40',
  },
];

export default async function HomePage() {
  const { data: articles } = await supabase
    .from('newsroom_articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(12);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-black border border-gray-800 p-8 sm:p-12 shadow-2xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-semibold uppercase tracking-wider">
            Automated Journalism Engine
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            CRFFL Times-Herald <br />
            <span className="text-[#d4af37]">Newsroom & Dispatches</span>
          </h1>
          <p className="text-gray-300 text-lg">
            Powered by Sleeper live stats, real-world NFL intelligence, persistent database memory, and Google Gemini.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/power-rankings"
              className="inline-flex items-center gap-2 bg-[#d4af37] text-gray-950 px-5 py-2.5 rounded-xl font-bold hover:bg-[#e6c24d] transition shadow-lg"
            >
              View Dr. Vance's Power Rankings →
            </Link>
            <Link
              href="/admin/test-bench"
              className="inline-flex items-center gap-2 bg-gray-800 text-gray-200 border border-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-700 transition"
            >
              Admin Test Bench ⚡
            </Link>
          </div>
        </div>
      </div>

      {/* Columnists Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h2 className="text-2xl font-bold tracking-tight text-white">The Editorial Desk</h2>
          <span className="text-xs text-gray-400">4 Columnists Scheduled Weekly</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COLUMNISTS.map((col) => (
            <div
              key={col.id}
              className={`rounded-xl border p-6 flex flex-col justify-between bg-gradient-to-b ${col.color} backdrop-blur-sm shadow-md`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4af37]">
                    {col.beat}
                  </span>
                  <span className="text-[11px] text-gray-400 bg-gray-900/60 px-2 py-0.5 rounded border border-gray-800">
                    {col.schedule}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{col.name}</h3>
                <p className="text-xs text-gray-300 leading-relaxed">{col.bio}</p>
              </div>

              <div className="pt-5 mt-4 border-t border-gray-800/60 flex items-center justify-between text-xs">
                <span className="text-gray-400 italic">{col.tag}</span>
                <Link
                  href="/admin/test-bench"
                  className="text-[#d4af37] font-semibold hover:underline"
                >
                  Run Now →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Published Dispatches Feed */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h2 className="text-2xl font-bold tracking-tight text-white">Recent Dispatches</h2>
          <span className="text-xs text-gray-400">Synced with crffl.org</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles?.map((article) => (
            <article
              key={article.id}
              className="bg-[#121824] border border-gray-800/80 rounded-xl p-6 flex flex-col justify-between hover:border-gray-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#d4af37] font-semibold">{article.author_name}</span>
                  <span className="text-gray-500">
                    Week {article.week_number} • {new Date(article.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white line-clamp-2 leading-snug">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-800/60 flex items-center justify-between text-xs">
                <span className="text-gray-500 uppercase font-mono tracking-wider">
                  {article.category_name || 'Newsroom'}
                </span>
                {article.wordpress_url ? (
                  <a
                    href={article.wordpress_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d4af37] hover:underline font-semibold"
                  >
                    Read on CRFFL.org ↗
                  </a>
                ) : (
                  <span className="text-gray-500">Local Archive</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

