'use client';

import { useState, useEffect } from 'react';
import { MASTHEAD_SAYINGS } from '@/lib/mottos';

export default function MastheadMotto() {
  // Default on server render to prevent hydration mismatch
  const [index, setIndex] = useState(5); // "The Official Paper of Record for Questionable Trade Vetoes"

  useEffect(() => {
    // Pick a random motto on client mount
    const randomIndex = Math.floor(Math.random() * MASTHEAD_SAYINGS.length);
    setIndex(randomIndex);
  }, []);

  const handleNext = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * MASTHEAD_SAYINGS.length);
    } while (nextIndex === index && MASTHEAD_SAYINGS.length > 1);
    setIndex(nextIndex);
  };

  const saying = MASTHEAD_SAYINGS[index] || MASTHEAD_SAYINGS[0];

  return (
    <div
      onClick={handleNext}
      className="inline-flex flex-wrap items-center gap-1.5 sm:gap-2 cursor-pointer group select-none text-xs sm:text-sm font-mono tracking-wide text-gray-300 hover:text-white transition"
      title="Click to roll another headline blurb"
    >
      <span className="text-gray-400 font-bold uppercase tracking-wider">
        CRFFL TIMES-HERALD
      </span>
      <span className="text-[#d4af37] font-bold">•</span>
      <span className="text-amber-200/90 italic font-sans font-medium group-hover:text-[#d4af37] transition-colors duration-200">
        &ldquo;{saying}&rdquo;
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className="opacity-60 group-hover:opacity-100 hover:text-[#d4af37] transition text-xs ml-0.5"
        aria-label="New random blurb"
        title="Roll another motto"
      >
        🎲
      </button>
    </div>
  );
}
