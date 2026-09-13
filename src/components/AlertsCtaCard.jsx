'use client';

import { useState } from 'react';
import AlertsModal from './AlertsModal';

export default function AlertsCtaCard() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-br from-[#d4af37]/15 via-[#121824] to-[#121824] border border-[#d4af37]/40 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Push, Email & Text Alerts
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#d4af37] font-bold bg-[#d4af37]/15 px-2 py-0.5 rounded border border-[#d4af37]/40">
            Instant
          </span>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          Get real-time browser push alerts on desktop & mobile, plus email and SMS dispatches whenever columnist articles drop, power rankings release, or sportsbook bets settle.
        </p>

        {/* Categories Badges */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <div className="flex items-center gap-1 text-[11px] text-gray-300 font-medium bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-800">
            <span className="text-[#d4af37]">✓</span> Device Push Alerts
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-300 font-medium bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-800">
            <span className="text-[#d4af37]">✓</span> Articles & Beats
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-300 font-medium bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-800">
            <span className="text-[#d4af37]">✓</span> Power Rankings
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-300 font-medium bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-800">
            <span className="text-[#d4af37]">✓</span> Wager Payouts
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] hover:brightness-110 text-gray-950 font-black transition text-xs shadow-lg"
        >
          <span>Configure League Alerts →</span>
        </button>
      </div>

      <AlertsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
