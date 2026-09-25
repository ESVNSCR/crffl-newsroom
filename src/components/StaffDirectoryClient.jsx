'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PressPassModal from './PressPassModal';

export default function StaffDirectoryClient({ columnists }) {
  const [selectedColumnist, setSelectedColumnist] = useState(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {columnists.map((col) => (
          <div
            key={col.id}
            className="rounded-3xl bg-[#121824] border border-gray-800 hover:border-gray-700 transition-all overflow-hidden shadow-2xl flex flex-col justify-between group"
          >
            <div>
              {/* Editorial Portrait Banner with Quick Press Pass Trigger */}
              <div
                onClick={() => setSelectedColumnist(col)}
                className="relative h-48 sm:h-56 w-full overflow-hidden bg-black cursor-pointer group/banner"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedColumnist(col);
                  }
                }}
                aria-label={`View full portrait and press pass for ${col.name}`}
              >
                <img
                  src={col.image}
                  alt={`${col.name} Full Portrait`}
                  className="w-full h-full object-cover object-top filter brightness-90 contrast-105 group-hover/banner:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-transparent to-black/40" />

                {/* Top Badge: Desk & Press Tag */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span
                    className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md bg-black/60 shadow-md"
                    style={{
                      color: col.accentColor,
                      border: `1px solid ${col.accentColor}60`,
                    }}
                  >
                    {col.desk}
                  </span>

                  <span className="text-[10px] font-mono font-bold bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    PRESS PASS
                  </span>
                </div>

                {/* Bottom Overlay Trigger */}
                <div className="absolute bottom-3 right-3 opacity-90 group-hover/banner:opacity-100 transition-opacity">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg group-hover/banner:border-[#d4af37] group-hover/banner:text-[#d4af37] transition-colors">
                    <span>🔍 View Full Portrait</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Reporter Byline Header with Sharp Headshot Avatar */}
                <div className="flex items-start gap-4">
                  <div
                    onClick={() => setSelectedColumnist(col)}
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black border-2 shadow-xl flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ borderColor: col.accentColor }}
                    title="Click to view full press pass"
                  >
                    <img
                      src={col.avatar}
                      alt={col.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {col.name}
                    </h2>
                    <p className="text-xs text-gray-300 font-medium">
                      {col.role}
                    </p>
                    <p className="text-[11px] font-mono text-gray-400">
                      Beat: <span className="text-gray-200">{col.beat}</span>
                    </p>
                  </div>
                </div>

                {/* Catchphrase Quote */}
                <div className="border-l-2 border-[#d4af37] pl-3 py-1 bg-gray-900/50 rounded-r-lg">
                  <p className="text-xs italic text-gray-300 font-serif">
                    “{col.catchphrase}”
                  </p>
                </div>

                {/* Full Biography */}
                <div className="space-y-1.5">
                  <h3 className="text-[11px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                    Bureau Dossier
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {col.bio}
                  </p>
                </div>

                {/* Credentials & Honors */}
                <div className="pt-2 border-t border-gray-800">
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider block mb-1.5">
                    Credentials &amp; Honors
                  </span>
                  <ul className="space-y-1">
                    {col.credentials.map((cred, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-gray-400 flex items-center gap-2"
                      >
                        <span className="text-[#d4af37] text-xs">◆</span>
                        <span>{cred}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="p-6 sm:p-8 pt-0 border-t border-gray-800/80 mt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSelectedColumnist(col)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-[#d4af37] transition"
              >
                <span>Press Pass Details</span>
                <span>↗</span>
              </button>

              <Link
                href={col.href || '/'}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37] hover:text-gray-950 font-bold text-xs uppercase tracking-wider transition shadow-sm"
              >
                <span>Read Dispatches</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Press Pass Lightbox Modal */}
      <PressPassModal
        columnist={selectedColumnist}
        isOpen={Boolean(selectedColumnist)}
        onClose={() => setSelectedColumnist(null)}
      />
    </>
  );
}

