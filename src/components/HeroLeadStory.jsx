'use client';

import { useState } from 'react';
import Link from 'next/link';
import ArticleModal from './ArticleModal';
import { COLUMNISTS } from '@/lib/columnists';
import { decodeHtmlEntities, formatDatePacific } from '@/lib/formatters';

export default function HeroLeadStory({ leadArticle }) {
  const [openModal, setOpenModal] = useState(false);

  if (!leadArticle) return null;

  const columnist = COLUMNISTS[leadArticle.author_id] || {
    name: leadArticle.author_name,
    avatar: '/reporters/default-avatar.png',
    desk: leadArticle.category_name || 'Front Page',
  };

  return (
    <>
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#121824] via-[#161f30] to-[#0d121c] border border-white/15 p-6 sm:p-10 md:p-12 shadow-2xl">
        {/* Subtle Ambient Gold Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Eyebrow / Tagline */}
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold uppercase tracking-wider">
              ★ Frontpage Lead Dispatch
            </span>
            <span className="text-xs text-gray-400 font-mono" suppressHydrationWarning>
              Week {leadArticle.week_number} • Published {formatDatePacific(leadArticle.created_at, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Major Headline */}
          <h1
            onClick={() => setOpenModal(true)}
            className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-[1.15] cursor-pointer hover:text-[#d4af37] transition-colors"
          >
            {decodeHtmlEntities(leadArticle.title)}
          </h1>

          {/* Lead Paragraph Excerpt */}
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed line-clamp-3 sm:line-clamp-4">
            {decodeHtmlEntities(leadArticle.summary)}
          </p>

          {/* Byline & Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-white/10">
            <div className="flex items-center space-x-4">
              <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black/60 shadow-lg flex-shrink-0">
                <img
                  src={columnist.avatar}
                  alt={leadArticle.author_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">
                  By {leadArticle.author_name}
                </span>
                <span className="text-xs text-[#d4af37] font-mono block">
                  {columnist.desk}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setOpenModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-[#d4af37] text-gray-950 px-6 py-3 rounded-xl font-extrabold hover:bg-[#e6c24d] transition shadow-lg text-sm w-full sm:w-auto min-h-[44px]"
              >
                <span>Read Full Story</span> →
              </button>
              <Link
                href="/power-rankings"
                className="inline-flex items-center justify-center gap-2 bg-gray-900/80 text-gray-200 border border-white/15 px-5 py-3 rounded-xl font-semibold hover:bg-gray-800 hover:text-white transition text-sm w-full sm:w-auto min-h-[44px] text-center"
              >
                Power Rankings Board
              </Link>
            </div>
          </div>
        </div>
      </div>

      {openModal && (
        <ArticleModal
          article={leadArticle}
          onClose={() => setOpenModal(false)}
        />
      )}
    </>
  );
}

