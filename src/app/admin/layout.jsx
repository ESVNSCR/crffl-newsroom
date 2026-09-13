'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const EXPECTED_PIN = process.env.NEXT_PUBLIC_COMMISSIONER_PIN || '2026';

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage for existing auth
    const authStatus = sessionStorage.getItem('crffl_admin_auth');
    if (authStatus === 'authorized') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === EXPECTED_PIN) {
      sessionStorage.setItem('crffl_admin_auth', 'authorized');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('crffl_admin_auth');
    setIsAuthenticated(false);
    setPin('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4af37]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full rounded-2xl bg-[#121824] border border-gray-800 p-8 space-y-6 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center mx-auto text-2xl">
            🔒
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#d4af37] font-bold uppercase tracking-widest block">
              Restricted Area • Commissioner Only
            </span>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              Security Clearance
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed">
              Enter your 4-digit Commissioner PIN to access the editorial run bench, contest configuration, and rankings board.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="Enter PIN"
                autoFocus
                className="w-48 text-center text-2xl tracking-[0.5em] font-mono font-bold py-2 px-4 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-[#d4af37] transition"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-semibold font-mono animate-shake">
                ⚠️ Invalid Commissioner PIN. Access denied.
              </p>
            )}

            <div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#d4af37] hover:bg-[#e6c24d] text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg"
              >
                Unlock Administrative Bench
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-gray-800">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              ← Return to Public Newsroom
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Admin Top Security Sub-bar */}
      <div className="bg-[#0e1420] border-b border-gray-800 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 text-gray-400 font-mono">
            <span className="text-[#d4af37] font-bold">⚡ COMMISSIONER CLEARANCE ACTIVE</span>
            <span>•</span>
            <Link href="/admin/test-bench" className="hover:text-white transition">Test Bench</Link>
            <span>•</span>
            <Link href="/admin/rankings" className="hover:text-white transition">Rankings</Link>
            <span>•</span>
            <Link href="/admin/contests" className="hover:text-white transition">Contests</Link>
          </div>

          <button
            onClick={handleLogout}
            className="text-[11px] font-mono font-bold text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
          >
            <span>Lock & Exit</span>
            <span>🔒</span>
          </button>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}

