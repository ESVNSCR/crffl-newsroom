'use client';

import { useEffect } from 'react';
import { COLUMNISTS } from '@/lib/columnists';
import { decodeHtmlEntities, formatDatePacific } from '@/lib/formatters';
import ArticleComments from './ArticleComments';

export default function ArticleModal({ article, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  if (!article) return null;

  const columnist = COLUMNISTS[article.author_id] || {
    name: article.author_name,
    avatar: '/reporters/default-avatar.png',
    desk: article.category_name || 'Newsroom',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#121824] border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800 bg-[#0d121c]/90">
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 sm:px-2.5 py-1 rounded border border-[#d4af37]/30">
              {article.category_name || 'CRFFL Dispatch'}
            </span>
            <span className="text-[11px] sm:text-xs text-gray-400" suppressHydrationWarning>
              Week {article.week_number} • {formatDatePacific(article.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition text-base sm:text-sm font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Article Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6 sm:py-8 space-y-5 sm:space-y-6">
          {/* Commissioner Banner Image */}
          {(article.author_id === 'commissioner' || article.category_name === "Commissioner's Corner" || article.banner_url) && (
            <div className="w-full rounded-2xl overflow-hidden border border-[#d4af37]/40 shadow-2xl bg-black/60 relative">
              <img
                src={article.banner_url || '/commissioner-banner.png'}
                alt="Office of the Commissioner"
                className="w-full h-auto block"
              />
            </div>
          )}

          {/* Article Title */}
          <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {decodeHtmlEntities(article.title)}
          </h1>

          {/* Author Byline Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4 py-3 border-y border-white/10">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black/60 shadow-md flex-shrink-0">
                <img
                  src={columnist.avatar}
                  alt={columnist.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  By <span className="text-[#d4af37]">{article.author_name}</span>
                </p>
                <p className="text-[11px] sm:text-xs text-gray-400 font-mono">
                  {columnist.desk || 'The CRFFL Times-Herald'}
                </p>
              </div>
            </div>

            {article.rival_author && (
              <span className="text-xs text-gray-400 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800">
                Foil in Focus: <strong className="text-gray-200">{article.rival_author}</strong>
              </span>
            )}
          </div>

          {/* Formatted Article Content */}
          <div
            className="article-content text-sm sm:text-base"
            dangerouslySetInnerHTML={{ __html: article.content_html || `<p>${article.summary}</p>` }}
          />

          {/* Manager Comment Section */}
          {article.id && <ArticleComments articleId={article.id} />}
        </div>

        {/* Bottom Footer Bar */}
        <div className="px-4 sm:px-10 py-3 sm:py-4 bg-[#0d121c] border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div>
            {article.wordpress_url && (
              <a
                href={article.wordpress_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#d4af37] hover:underline font-semibold flex items-center gap-1.5 text-xs"
              >
                <span>Read on WordPress Archive</span> ↗
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold transition text-xs sm:text-sm"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
}

