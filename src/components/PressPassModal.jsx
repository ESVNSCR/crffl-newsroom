'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function PressPassModal({ columnist, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !columnist) return null;

  const pressPassNumber = `TH-2026-${(columnist.id || 'REP').substring(0, 3).toUpperCase()}-${columnist.wpAuthorId || '01'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`Official Bureau Press Pass - ${columnist.name}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl max-h-[92dvh] bg-[#0f141f] border-2 border-[#d4af37]/60 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row overscroll-contain">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-gray-200 hover:text-white border border-white/20 flex items-center justify-center transition text-sm font-bold shadow-lg"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Left Column: Full Master Portrait */}
        <div className="relative w-full md:w-1/2 bg-black flex items-center justify-center overflow-hidden min-h-[320px] md:min-h-[560px]">
          <img
            src={columnist.image || columnist.avatar}
            alt={columnist.name}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f141f] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#0f141f]/90" />

          {/* Press Pass Watermark Badge */}
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#d4af37]/50 text-[10px] font-mono text-[#d4af37] font-bold tracking-wider uppercase shadow-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CRFFL Times-Herald Press Pass</span>
          </div>
        </div>

        {/* Right Column: Credentials & Dossier */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto space-y-6">
          <div className="space-y-4">
            {/* Top Press Card Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[#d4af37] font-mono font-bold text-xs uppercase tracking-widest">
                  Press Credential
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 font-mono text-xs">
                  {pressPassNumber}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                Active Clearance
              </span>
            </div>

            {/* Reporter Identity */}
            <div className="space-y-1">
              <span
                className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${columnist.accentColor}20`,
                  color: columnist.accentColor,
                  border: `1px solid ${columnist.accentColor}40`,
                }}
              >
                {columnist.desk}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {columnist.name}
              </h2>
              <p className="text-xs text-gray-300 font-medium">
                {columnist.role}
              </p>
            </div>

            {/* Catchphrase Quote */}
            <div className="border-l-2 border-[#d4af37] pl-3 py-1.5 bg-gray-900/60 rounded-r-lg">
              <p className="text-xs italic text-gray-200 font-serif leading-relaxed">
                “{columnist.catchphrase}”
              </p>
            </div>

            {/* Bio Dossier */}
            <div className="space-y-1.5">
              <h3 className="text-[11px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                Full Bureau Dossier
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                {columnist.bio}
              </p>
            </div>

            {/* Beat & Access Level */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <div className="text-xs text-gray-400">
                <strong className="text-gray-200 font-mono">Assigned Beat:</strong> {columnist.beat}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                <strong className="text-gray-200">Accredited Access:</strong> Press Row, Film Room, Locker Room, Adjudication Desk
              </div>
            </div>

            {/* Credentials */}
            {columnist.credentials && columnist.credentials.length > 0 && (
              <div className="pt-2 border-t border-gray-800">
                <span className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider block mb-1.5">
                  Honors &amp; Credentials
                </span>
                <ul className="space-y-1">
                  {columnist.credentials.map((cred, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-center gap-2">
                      <span className="text-[#d4af37] text-xs">◆</span>
                      <span>{cred}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-gray-800 flex items-center justify-between gap-4">
            <Link
              href={columnist.dispatchHref || `/?category=${encodeURIComponent(columnist.category || 'Dispatches')}#dispatches`}
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37] text-gray-950 font-bold text-xs uppercase tracking-wider hover:bg-[#e6c24d] transition shadow-md"
            >
              <span>Read {columnist.name}&#39;s Dispatches</span>
              <span>→</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold text-xs transition"
            >
              Close Press Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

