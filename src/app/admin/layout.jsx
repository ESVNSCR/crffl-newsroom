'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(null);

  useEffect(() => {
    // Verify server session status via secure httpOnly cookie
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch((err) => {
        console.warn('Admin status check failed:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim() || submitting || locked) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setError('');
        setPin('');
        setRemainingAttempts(null);
      } else {
        setError(data.error || 'Invalid Commissioner PIN. Access denied.');
        setPin('');
        if (data.locked) {
          setLocked(true);
        } else if (typeof data.remaining === 'number') {
          setRemainingAttempts(data.remaining);
        }
      }
    } catch (err) {
      setError('Connection error during authentication. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (_) {}
    setIsAuthenticated(false);
    setPin('');
    setError('');
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
          <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center mx-auto text-[#d4af37]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] text-[10px] font-mono font-bold uppercase">
              <span>Restricted Area</span>
              <span>•</span>
              <span>Server-Protected</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              Security Clearance
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed">
              Enter your Commissioner PIN to access the editorial run bench, contest adjudication, and rankings board.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                id="admin-clearance-pin"
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="current-password"
                maxLength={8}
                value={pin}
                disabled={submitting || locked}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="••••"
                autoFocus
                className="w-48 text-center text-2xl tracking-[0.5em] font-mono font-bold py-2 px-4 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-[#d4af37] transition disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 font-medium space-y-1 animate-shake">
                <p>{error}</p>
                {remainingAttempts !== null && remainingAttempts > 0 && !locked && (
                  <p className="text-[11px] text-rose-400 font-mono">
                    {remainingAttempts} attempt(s) remaining before temporary lockout.
                  </p>
                )}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={submitting || locked || !pin.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] hover:brightness-110 text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Verifying PIN...' : locked ? 'Access Locked' : 'Unlock Administrative Bench'}
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
            <span className="text-[#d4af37] font-bold">COMMISSIONER CLEARANCE ACTIVE</span>
            <span>•</span>
            <Link href="/admin/dispatch" className="text-amber-400 font-bold hover:text-white transition">Dispatch Desk</Link>
            <span>•</span>
            <Link href="/admin/schedule" className="text-emerald-400 font-bold hover:text-white transition">Reporter Schedules</Link>
            <span>•</span>
            <Link href="/admin/dispatch?tab=prompts" className="hover:text-white transition">Reporter Prompts</Link>
            <span>•</span>
            <Link href="/admin/test-bench" className="hover:text-white transition">Test Bench</Link>
            <span>•</span>
            <Link href="/admin/rankings" className="hover:text-white transition">Rankings</Link>
            <span>•</span>
            <Link href="/admin/contests" className="hover:text-white transition">Contests</Link>
          </div>

          <button
            onClick={handleLogout}
            className="text-[11px] font-mono font-bold text-rose-400 hover:text-rose-300 transition flex items-center gap-1 bg-gray-900 px-2.5 py-1 rounded-lg border border-rose-900/60"
          >
            <span>Lock & Exit</span>
          </button>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
