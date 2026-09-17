import React from 'react';
import Link from 'next/link';
import StaffDirectoryClient from '@/components/StaffDirectoryClient';

export const metadata = {
  title: 'Editorial Staff Directory | CRFFL Times-Herald',
  description: 'Meet the beat reporters, investigative journalists, and analysts of the CRFFL Times-Herald newsroom.',
};

const COLUMNISTS = [
  {
    id: 'marcus_vance',
    name: 'Dr. Marcus Vance',
    desk: 'The Apex Board',
    role: 'Senior Analytics Editor & Lead Power Ranker',
    beat: 'Advanced Metrics, Roster Efficiency, Regression Modeling & Forensics',
    avatar: '/reporters/marcus-vance-avatar.png',
    image: '/reporters/marcus-vance.png',
    accentColor: '#d4af37',
    badge: 'Senior Analytics Editor',
    catchphrase: 'The tape may deceive, but the math is ruthless.',
    bio: 'Dr. Vance holds a doctorate in statistical economics and brings uncompromising mathematical rigor to fantasy football. He refuses to indulge in emotional narratives or locker room nostalgia. Under his watchful eye, every manager’s roster is evaluated through true win expectancy, depth durability, and regression-adjusted potency.',
    category: 'Power Rankings',
    href: '/?category=Power+Rankings#dispatches',
    wpAuthorId: '04',
    credentials: [
      'Lead Architect of the Apex Power Index (Weeks 1–17)',
      'Former Academic Fellow in Sports Quantitative Dynamics',
      'Author of "Variance vs. Virtue: The Myth of the Lucky Champ"',
    ],
  },
  {
    id: 'buck_callahan',
    name: 'Buck Callahan',
    desk: 'The Grit Desk',
    role: 'Bureau Chief & Senior Trench Correspondent',
    beat: 'Locker Room Warfare, Waiver Scrapes, Hard-Nosed Roster Construction',
    avatar: '/reporters/buck-callahan-avatar.png',
    image: '/reporters/buck-callahan.png',
    accentColor: '#38bdf8',
    badge: 'Bureau Chief',
    catchphrase: 'Championships aren’t won in algorithms; they’re won in the mud.',
    bio: 'Buck Callahan has covered football for 30 years with a fedora, coffee stains, and an Underwood typewriter. He watches the game in the dirt and between the whistles. Buck has zero patience for managers who coast on lucky waiver wires or complain about bad referee calls. If your offensive line is crumbling or your bench has gone soft, Buck will print it on page one.',
    category: 'The Grit Desk',
    href: '/?category=The+Grit+Desk#dispatches',
    wpAuthorId: '03',
    credentials: [
      '3-Time Fantasy Press Association "Trench Dog" Award Winner',
      'Veteran Columnist for Pacific Northwest Gridiron Gazette',
      'Chief Custodian of CRFFL Locker Room Confidential',
    ],
  },
  {
    id: 'chloe_carmichael',
    name: 'Chloe Carmichael',
    desk: 'The Spin Room',
    role: 'Senior League Insider & Narrative Columnist',
    beat: 'Manager Psychology, Trade Whispers, Title Windows & Power Politics',
    avatar: '/reporters/chloe-carmichael-avatar.png',
    image: '/reporters/chloe-carmichael.png',
    accentColor: '#c084fc',
    badge: 'Senior League Insider',
    catchphrase: 'In this league, ego is the highest tax.',
    bio: 'The most deeply plugged-in insider in the Columbia River circuit. Chloe possesses screenshots from every midnight group chat, records of rejected trade offers, and a psychological dossier on every owner from Vancouver to Portland. Her columns peel back the public facades to reveal the panic, vanity, and boardroom betrayals driving every Sunday decision.',
    category: 'The Spin Room',
    href: '/?category=The+Spin+Room#dispatches',
    wpAuthorId: '02',
    credentials: [
      'Breaking News Contributor for Fantasy Dispatch Daily',
      'Moderator of the Annual CRFFL Draft Day Hot Stove',
      'Host of "The Trade Deadline Panic Room" Podcast',
    ],
  },
  {
    id: 'marty_sullivan',
    name: 'Marty Sullivan',
    desk: 'The Tuesday Recap',
    role: 'Sports Desk Columnist & Matchup Recap Correspondent',
    beat: 'Box Score Forensic Heroics, Heartbreak Decimals & Weekly $10 Contests',
    avatar: '/reporters/marty-sullivan-avatar.png',
    image: '/reporters/marty-sullivan.png',
    accentColor: '#34d399',
    badge: 'Lead Gameday Correspondent',
    catchphrase: 'Every Tuesday we separate the kings from the clowns!',
    bio: 'Fast-talking, sleepless, and fueled by hot diner coffee, Marty delivers the definitive blow-by-blow of Sunday gamedays. He lives for the 0.12-point upsets, the Monday night kicker miracles, and the benching disasters that haunt managers for years. Marty also serves as the official adjudicator and announcer for the league’s weekly $10 cash bounty contests.',
    category: 'The Tuesday Recap',
    href: '/?category=The+Tuesday+Recap#dispatches',
    wpAuthorId: '05',
    credentials: [
      'Voice of the "Tuesday Morning Autopsy" Broadcast',
      'Official Commissioner of CRFFL Weekly Bounty Bounties',
      'Certified Box Score Chronicler (2021–Present)',
    ],
  },
];

export default function StaffDirectoryPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Masthead */}
        <div className="text-center space-y-4 border-b border-gray-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-mono font-bold tracking-wider uppercase">
            <span>Editorial Staff Directory</span>
            <span>•</span>
            <span>CRFFL Times-Herald</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            THE EDITORIAL <span className="text-[#d4af37]">CORPS</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-300 leading-relaxed">
            Four distinct beats. Unapologetic reporting. The authoritative journalists and analysts dedicated to documenting the history, triumphs, and failures of the Columbia River Fantasy Football League.
          </p>
        </div>

        {/* Commissioner Feature Masthead */}
        <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#161d2b] via-[#121824] to-[#0a0e17] border-2 border-[#d4af37]/40 shadow-2xl relative">
          <div className="w-full relative overflow-hidden bg-black">
            <img
              src="/commissioner-banner.png"
              alt="Office of the Commissioner"
              className="w-full h-auto block"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-transparent to-black/20" />
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3.5 py-1 rounded-full border border-[#d4af37]/40 text-xs font-mono font-bold text-[#d4af37] tracking-wider uppercase shadow-md">
              Executive Publisher &amp; Founder
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black/60 shadow-xl flex-shrink-0">
                  <img
                    src="/logos/league.png"
                    alt="CRFFL Crest"
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#d4af37]">
                    The Front Office
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Eric Vaughan
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">
                    CRFFL Commissioner &amp; Publisher • Est. 2021
                  </p>
                </div>
              </div>

              <Link
                href="/?category=Commissioner%27s+Corner#dispatches"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37] hover:text-gray-950 font-bold text-xs uppercase tracking-wider transition shadow-md self-start sm:self-auto"
              >
                <span>Read Commissioner Dispatches</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-300 leading-relaxed">
              <div className="md:col-span-2 space-y-3">
                <div className="border-l-2 border-[#d4af37] pl-3 py-1 bg-gray-900/50 rounded-r-lg">
                  <p className="text-xs text-gray-300 italic font-serif">
                    &quot;A league is only as resilient as its constitution, and only as fun as its rivalries.&quot;
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-gray-300">
                  Founder and custodian of the Columbia River Fantasy Football League. The Commissioner presides over constitution amendments, contest adjudications, and the editorial direction of the Times-Herald newsroom, publishing official addresses under <strong>Commissioner&#39;s Corner</strong>.
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-6">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                  Office Responsibilities:
                </span>
                <ul className="text-xs text-gray-400 space-y-1.5 font-mono">
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#d4af37]">▪</span>
                    <span>Executive Rulings &amp; Trade Audits</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#d4af37]">▪</span>
                    <span>Purse &amp; Weekly Payout Governance</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#d4af37]">▪</span>
                    <span>Hall of Fame Historical Integrity</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Columnist Profiles Grid & Interactive Bureau Showcase */}
        <StaffDirectoryClient columnists={COLUMNISTS} />

        {/* Bottom Newsroom Notice */}
        <div className="rounded-2xl bg-gradient-to-r from-gray-900 via-[#121824] to-gray-900 border border-gray-800 p-6 text-center space-y-3">
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Letters to the Editor & Confidential Tips
          </h3>
          <p className="text-xs text-gray-400 max-w-xl mx-auto leading-relaxed">
            Have locker room intel, verified trade rumors, or grievances with Dr. Vance’s Apex Power Index? Contact the news desk through your franchise manager portal.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4af37] text-gray-950 font-bold text-xs hover:bg-[#e6c24d] transition shadow-md"
            >
              ← Back to Frontpage Dispatches
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

