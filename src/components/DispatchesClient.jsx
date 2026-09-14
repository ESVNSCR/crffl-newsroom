'use client';

import { useState, useMemo, useEffect } from 'react';
import ArticleModal from './ArticleModal';
import { COLUMNISTS } from '@/lib/columnists';
import { decodeHtmlEntities } from '@/lib/formatters';

const CATEGORIES = [
  { id: 'all', label: 'All Dispatches' },
  { id: "Commissioner's Corner", label: "Commissioner's Corner" },
  { id: 'Power Rankings', label: 'Power Rankings' },
  { id: 'The Grit Desk', label: 'The Grit Desk' },
  { id: 'The Spin Room', label: 'The Spin Room' },
  { id: 'The Tuesday Recap', label: 'The Tuesday Recap' },
];

export default function DispatchesClient({ articles = [], featuredArticle = null, initialCategory = 'all' }) {
  const [activeCategory, setActiveCategory] = useState(initialCategory || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  const filteredArticles = useMemo(() => {
    return articles
      .filter((a) => {
        // Category filter
        const catLower = activeCategory.toLowerCase();
        const matchesCategory =
          activeCategory === 'all' ||
          (a.category_name && a.category_name.toLowerCase() === catLower) ||
          (catLower === "commissioner's corner" && (a.author_id === 'commissioner' || a.category_id === 109 || a.category_name?.toLowerCase().includes('commissioner'))) ||
          (catLower === 'power rankings' && (a.author_id === 'marcus_vance' || a.title?.toLowerCase().includes('power ranking') || a.category_id === 32)) ||
          (catLower === 'the grit desk' && (a.author_id === 'buck_callahan' || a.category_id === 107)) ||
          (catLower === 'the spin room' && (a.author_id === 'chloe_carmichael' || a.category_id === 108)) ||
          (catLower === 'the tuesday recap' && (a.author_id === 'marty_sullivan' || a.category_id === 16));

        // Search query filter
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          a.title?.toLowerCase().includes(q) ||
          a.author_name?.toLowerCase().includes(q) ||
          a.summary?.toLowerCase().includes(q);

        return matchesCategory && matchesSearch;
      })
      .slice(0, 6); // Limit number of articles shown on main page to 6
  }, [articles, activeCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#121824] border border-gray-800">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === cat.id
                  ? 'bg-[#d4af37] text-gray-950 shadow-md font-bold'
                  : 'bg-gray-900/80 text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dispatches, teams..."
            className="w-full bg-gray-900/90 border border-gray-700 rounded-lg px-3.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Dispatches Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#121824] border border-gray-800 space-y-2">
          <p className="text-gray-400 text-sm font-medium">No dispatches found matching your filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setSearchQuery('');
            }}
            className="text-xs text-[#d4af37] hover:underline font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((article) => {
            const columnist = COLUMNISTS[article.author_id] || {
              avatar: '/reporters/default-avatar.png',
              desk: article.category_name || 'Newsroom',
            };

            return (
              <article
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="group relative cursor-pointer bg-[#121824] border border-gray-800 hover:border-white/30 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-lg hover:shadow-2xl"
              >
                <div className="space-y-4">
                  {/* Top Meta: Category + Date */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/30">
                      {article.category_name || 'Dispatch'}
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      Week {article.week_number} • {new Date(article.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3 className="text-lg font-bold text-white group-hover:text-[#d4af37] transition leading-snug line-clamp-2">
                    {decodeHtmlEntities(article.title)}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-xs sm:text-sm text-gray-400 line-clamp-3 leading-relaxed">
                    {decodeHtmlEntities(article.summary)}
                  </p>
                </div>

                {/* Author Byline Bar */}
                <div className="pt-4 mt-4 border-t border-gray-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[#d4af37]/50 bg-black/60 flex-shrink-0">
                      <img
                        src={columnist.avatar}
                        alt={article.author_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-200 block">
                        {article.author_name}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono block">
                        {columnist.desk}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#d4af37] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Read Column →
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Reader Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}

