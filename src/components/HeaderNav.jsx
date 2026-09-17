'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AlertsModal from './AlertsModal';

export default function HeaderNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="border-b border-gray-800 bg-[#121824]/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand / Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-white group-hover:text-gray-100 transition">
                CRFFL <span className="text-[#d4af37]">TIMES-HERALD</span>
              </span>
              <span className="hidden xl:inline-block text-[10px] uppercase bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded font-mono font-bold">
                Dispatch Desk
              </span>
            </Link>
          </div>

          {/* Desktop Navigation (Visible on lg and up) */}
          <nav className="hidden lg:flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 text-xs sm:text-sm font-semibold">
            <Link
              href="/"
              className={`px-2.5 py-1.5 rounded-lg transition ${
                pathname === '/' ? 'text-[#d4af37] bg-black/40 font-bold' : 'text-gray-300 hover:text-white hover:bg-gray-800/80'
              }`}
            >
              Dispatches
            </Link>
            <Link
              href="/power-rankings"
              className={`px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                pathname === '/power-rankings' ? 'text-[#d4af37] bg-black/40 font-bold' : 'text-gray-300 hover:text-[#d4af37] hover:bg-gray-800/80'
              }`}
            >
              Power Rankings
            </Link>
            <Link
              href="/schedule"
              className={`px-2.5 py-1.5 rounded-lg transition ${
                pathname === '/schedule' ? 'text-[#d4af37] bg-black/40 font-bold' : 'text-gray-300 hover:text-[#d4af37] hover:bg-gray-800/80'
              }`}
            >
              Schedule
            </Link>
            <Link
              href="/contests"
              className={`px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                pathname === '/contests' ? 'text-[#d4af37] bg-black/40 font-bold' : 'text-gray-300 hover:text-[#d4af37] hover:bg-gray-800/80'
              }`}
            >
              Contests & Payouts
            </Link>
            <a
              href="/hof"
              className={`px-2.5 py-1.5 rounded-lg transition ${
                pathname === '/hof' ? 'text-[#d4af37] bg-black/40 font-bold' : 'text-gray-300 hover:text-white hover:bg-gray-800/80'
              }`}
            >
              Hall of Fame
            </a>
            <a
              href="https://crffl-sportsbook.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg hover:text-amber-400 hover:bg-gray-800/80 transition text-gray-300"
            >
              Sportsbook
            </a>
            <a
              href="https://crffl-pickem.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg hover:text-cyan-400 hover:bg-gray-800/80 transition text-gray-300"
            >
              Pick'em
            </a>
            <Link
              href="/staff"
              className={`px-2.5 py-1.5 rounded-lg transition ${
                pathname === '/staff' ? 'text-[#d4af37] bg-black/40 font-bold' : 'text-gray-300 hover:text-[#d4af37] hover:bg-gray-800/80'
              }`}
            >
              Staff
            </Link>

            {/* Email & Text Alerts Button */}
            <button
              type="button"
              onClick={() => setAlertsOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-[#d4af37] hover:bg-gray-800/80 transition flex items-center gap-1.5 font-semibold"
            >
              <svg className="w-3.5 h-3.5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Alerts</span>
            </button>

            <a
              href="https://crffl.printify.me/"
              target="_blank"
              rel="noopener noreferrer"
              title="The CRFFL Pro Shop"
              className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-gray-950 hover:bg-[#e6c24d] font-bold transition shadow-md flex items-center gap-1 ml-1"
            >
              <span className="hidden xl:inline">The CRFFL </span>
              <span>Pro Shop</span>
            </a>
          </nav>

          {/* Mobile / Tablet Actions (Visible below lg) */}
          <div className="flex lg:hidden items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setAlertsOpen(true)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-[#d4af37] hover:text-white transition focus:outline-none"
              aria-label="Email and Text Alerts"
              title="Email & Text Alerts"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            <a
              href="https://crffl.printify.me/"
              target="_blank"
              rel="noopener noreferrer"
              title="The CRFFL Pro Shop"
              className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-gray-950 hover:bg-[#e6c24d] font-bold text-xs transition shadow-sm"
            >
              Pro Shop
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

      {/* Mobile Slide-Down Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-black/80 backdrop-blur-md z-40 animate-fadeIn">
          <div className="bg-[#0e1420] border-b border-gray-800 px-6 py-6 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  pathname === '/' ? 'bg-[#d4af37]/15 border-[#d4af37] text-[#d4af37] font-bold' : 'bg-[#121824] border-gray-800 text-gray-200 hover:border-gray-700'
                }`}
              >
                <span className="font-semibold text-sm">Dispatches Wire</span>
                <span className="text-xs text-gray-500 font-mono">Home →</span>
              </Link>

              <Link
                href="/power-rankings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  pathname === '/power-rankings' ? 'bg-[#d4af37]/15 border-[#d4af37] text-[#d4af37] font-bold' : 'bg-[#121824] border-gray-800 text-gray-200 hover:border-gray-700'
                }`}
              >
                <span className="font-semibold text-sm">Power Rankings</span>
                <span className="text-xs text-[#d4af37] font-mono font-bold">Top 10 →</span>
              </Link>

              <Link
                href="/schedule"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  pathname === '/schedule' ? 'bg-[#d4af37]/15 border-[#d4af37] text-[#d4af37] font-bold' : 'bg-[#121824] border-gray-800 text-gray-200 hover:border-gray-700'
                }`}
              >
                <span className="font-semibold text-sm">2026 Schedule</span>
                <span className="text-xs text-gray-500 font-mono">14 Weeks →</span>
              </Link>

              <Link
                href="/contests"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  pathname === '/contests' ? 'bg-[#d4af37]/15 border-[#d4af37] text-[#d4af37] font-bold' : 'bg-[#121824] border-gray-800 text-gray-200 hover:border-gray-700'
                }`}
              >
                <span className="font-semibold text-sm">Contests & Payouts</span>
                <span className="text-xs text-emerald-400 font-mono font-bold">$505 Purse →</span>
              </Link>

              <a
                href="/hof"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  pathname === '/hof' ? 'bg-[#d4af37]/15 border-[#d4af37] text-[#d4af37] font-bold' : 'bg-[#121824] border-gray-800 text-gray-200 hover:border-gray-700'
                }`}
              >
                <span className="font-semibold text-sm">Hall of Fame</span>
                <span className="text-xs text-gray-500 font-mono">Ring Room →</span>
              </a>

              <Link
                href="/staff"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  pathname === '/staff' ? 'bg-[#d4af37]/15 border-[#d4af37] text-[#d4af37] font-bold' : 'bg-[#121824] border-gray-800 text-gray-200 hover:border-gray-700'
                }`}
              >
                <span className="font-semibold text-sm">Staff Directory & Bios</span>
                <span className="text-xs text-gray-500 font-mono">The Bureau →</span>
              </Link>
            </div>

            {/* External Satellite Hubs */}
            <div className="pt-2 border-t border-gray-800 space-y-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">
                League Game Centers
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href="https://crffl-sportsbook.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-amber-400 transition"
                >
                  <span className="text-xs font-bold">Gameday Sportsbook</span>
                  <span className="text-[10px] font-mono text-amber-400">Live Odds ↗</span>
                </a>

                <a
                  href="https://crffl-pickem.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-cyan-400 transition"
                >
                  <span className="text-xs font-bold">Pick'em & Scoreboard</span>
                  <span className="text-[10px] font-mono text-cyan-400">Picks ↗</span>
                </a>
              </div>
            </div>

            {/* Official Store Card */}
            <div className="pt-2">
              <a
                href="https://crffl.printify.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full p-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] text-gray-950 font-black shadow-lg hover:brightness-105 transition text-sm"
              >
                <span>The CRFFL Pro Shop</span>
                <span>crffl.printify.me →</span>
              </a>
            </div>

            {/* Email & Text Alerts Button */}
            <div className="pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAlertsOpen(true);
                }}
                className="flex items-center justify-between w-full p-3.5 rounded-xl bg-[#1a2336] border border-[#d4af37]/40 text-[#d4af37] font-bold shadow hover:bg-gray-800 transition text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span>Email & Text Alerts</span>
                </div>
                <span className="text-xs text-amber-300 font-mono">Sign Up →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>

    {/* Alerts Subscription Modal */}
    <AlertsModal isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />
  </>
  );
}

