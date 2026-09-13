import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'CRFFL Times-Herald | Official Newsroom of the CRFFL',
  description: 'The Official Columbia River Fantasy Football League Newsroom, Dispatches, Power Rankings, and Pro Shop.',
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
            <div className="flex items-center space-x-4 text-[10px]">
              <span className="text-gray-400">THE OFFICIAL NEWSROOM OF RECORD</span>
              <span className="text-[#d4af37] font-bold">CRFFL.ORG</span>
            </div>
          </div>
        </div>

        {/* Global Navigation Header */}
        <header className="border-b border-gray-800 bg-[#121824]/95 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2.5">
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white">
                  CRFFL <span className="text-[#d4af37]">TIMES-HERALD</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded font-mono font-bold">
                  Dispatch Desk
                </span>
              </Link>
            </div>

            <nav className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 text-xs sm:text-sm font-semibold">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800/80 transition text-gray-300"
              >
                📰 Dispatches
              </Link>
              <Link
                href="/power-rankings"
                className="px-3 py-1.5 rounded-lg hover:text-[#d4af37] hover:bg-gray-800/80 transition text-gray-300"
              >
                📊 Power Rankings
              </Link>
              <Link
                href="/hof"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800/80 transition text-gray-300"
              >
                🏆 Hall of Fame
              </Link>
              <Link
                href="/shop"
                className="px-3.5 py-1.5 rounded-lg bg-[#d4af37] text-gray-950 hover:bg-[#e6c24d] font-bold transition shadow-md flex items-center gap-1.5"
              >
                🛍️ <span>Team Shop</span>
              </Link>

              {/* Admin Menu */}
              <div className="border-l border-gray-800 pl-2 sm:pl-3 flex items-center space-x-1">
                <Link
                  href="/admin/test-bench"
                  className="px-2.5 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition"
                  title="Commissioner Test Bench & Manual Run"
                >
                  ⚡ Admin
                </Link>
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-grow">{children}</main>

        <footer className="border-t border-gray-800 bg-[#080b11] py-10 px-4 sm:px-6 lg:px-8 text-xs text-gray-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <span className="text-white font-bold text-sm">CRFFL Times-Herald</span>
                <span className="text-[#d4af37] font-mono">• Official Editorial Board</span>
              </div>
              <p>© 2026 Columbia River Fantasy Football League. All rights reserved.</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400 font-medium">
              <Link href="/" className="hover:text-[#d4af37] transition">Dispatches</Link>
              <span>•</span>
              <Link href="/power-rankings" className="hover:text-[#d4af37] transition">Power Rankings</Link>
              <span>•</span>
              <Link href="/hof" className="hover:text-[#d4af37] transition">Hall of Fame</Link>
              <span>•</span>
              <Link href="/shop" className="hover:text-[#d4af37] transition">Pro Shop</Link>
              <span>•</span>
              <Link href="/admin/rankings" className="hover:text-[#d4af37] transition">Commissioner Portal</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

