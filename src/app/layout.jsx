import './globals.css';
import Link from 'next/link';
import HeaderNav from '@/components/HeaderNav';
import FirstVisitAlertPrompt from '@/components/FirstVisitAlertPrompt';

export const metadata = {
  title: 'CRFFL Times-Herald | Official Newsroom of the CRFFL',
  description: 'The Official Columbia River Fantasy Football League Newsroom, Dispatches, Power Rankings, and Pro Shop.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CRFFL Times-Herald',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f17] text-gray-100 flex flex-col min-h-screen">
        {/* Top Newspaper Masthead Banner */}
        <div className="bg-[#080b11] border-b border-gray-800 text-[11px] font-mono text-gray-400 py-1.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-[#d4af37] font-bold">VOL. VI</span>
              <span>•</span>
              <span className="text-gray-300">COLUMBIA RIVER FANTASY FOOTBALL LEAGUE</span>
              <span>•</span>
              <span>EST. 2021</span>
            </div>
            <div className="hidden sm:flex items-center space-x-4 text-[10px]">
              <Link href="/staff" className="hover:text-[#d4af37] transition">
                STAFF DIRECTORY
              </Link>
              <span>•</span>
              <Link href="/schedule" className="hover:text-[#d4af37] transition">
                2026 SCHEDULE
              </Link>
              <span>•</span>
              <a
                href="https://crffl-sportsbook.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#d4af37] transition"
              >
                SPORTSBOOK
              </a>
              <span>•</span>
              <a
                href="https://crffl-pickem.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#d4af37] transition"
              >
                PICK'EM & SCOREBOARD
              </a>
              <span>•</span>
              <span className="text-[#d4af37] font-bold">CRFFL.ORG</span>
            </div>
          </div>
        </div>

        {/* Global Responsive Navigation Header */}
        <HeaderNav />

        <main className="flex-grow">{children}</main>

        {/* First-Time Visitor Alert & Push Onboarding Prompt */}
        <FirstVisitAlertPrompt />

        <footer className="border-t border-gray-800 bg-[#080b11] py-10 px-4 sm:px-6 lg:px-8 text-xs text-gray-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <span className="text-white font-bold text-sm">CRFFL Times-Herald</span>
                <span className="text-[#d4af37] font-mono">• Official Editorial Board</span>
              </div>
              <p>© 2026 Columbia River Fantasy Football League. All rights reserved.</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-gray-400 font-medium">
              <Link href="/" className="hover:text-[#d4af37] transition">Dispatches</Link>
              <span>•</span>
              <Link href="/power-rankings" className="hover:text-[#d4af37] transition">Power Rankings</Link>
              <span>•</span>
              <Link href="/schedule" className="hover:text-[#d4af37] transition">Schedule</Link>
              <span>•</span>
              <Link href="/contests" className="hover:text-[#d4af37] transition">Contests & Payouts</Link>
              <span>•</span>
              <Link href="/staff" className="hover:text-[#d4af37] transition">Staff Directory</Link>
              <span>•</span>
              <a href="/hof" className="hover:text-[#d4af37] transition">Hall of Fame</a>
              <span>•</span>
              <a href="https://crffl-sportsbook.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition">Sportsbook</a>
              <span>•</span>
              <a href="https://crffl-pickem.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition">Pick'em</a>
              <span>•</span>
              <a href="https://crffl-pickem.vercel.app/scoreboard" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition">Scoreboard</a>
              <span>•</span>
              <a href="https://store.crffl.org/shop/" className="hover:text-[#d4af37] transition">Pro Shop</a>
              <span>•</span>
              <Link href="/admin/rankings" className="hover:text-[#d4af37] transition">Commissioner Portal</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

