import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'CRFFL Newsroom | Times-Herald',
  description: 'The Official Columbia River Fantasy Football League Newsroom & Columnists',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f17] text-gray-100 flex flex-col min-h-screen">
        <header className="border-b border-gray-800 bg-[#121824]/90 sticky top-0 z-50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-wider text-white">
                  CRFFL <span className="text-[#d4af37]">NEWSROOM</span>
                </span>
                <span className="text-xs uppercase bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded font-mono font-bold">
                  Times-Herald
                </span>
              </Link>
            </div>

            <nav className="flex items-center space-x-1 sm:space-x-4 text-sm font-medium">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800/60 transition text-gray-300"
              >
                Dispatches
              </Link>
              <Link
                href="/power-rankings"
                className="px-3 py-1.5 rounded-lg hover:text-[#d4af37] hover:bg-gray-800/60 transition text-gray-300"
              >
                📊 Power Rankings
              </Link>
              <Link
                href="/admin/test-bench"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800/60 transition text-gray-300"
              >
                ⚡ Test Bench
              </Link>
              <Link
                href="/admin/rankings"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800/60 transition text-gray-300"
              >
                ✍️ Baseline
              </Link>
              <Link
                href="/admin/contests"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800/60 transition text-gray-300"
              >
                🏆 Contests
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-grow">{children}</main>

        <footer className="border-t border-gray-800 bg-[#0d121c] py-6 text-center text-xs text-gray-500">
          <p>© 2026 Columbia River Fantasy Football League • CRFFL Times-Herald Editorial Board</p>
        </footer>
      </body>
    </html>
  );
}
