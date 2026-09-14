'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { COLUMNISTS } from '@/lib/columnists';
import { decodeHtmlEntities, formatDatePacific } from '@/lib/formatters';

const MANAGERS_LIST = [
  'General League',
  'Corey (Team CoreyCash)',
  'Ed (Team RaiderRose510)',
  'Eric (Rebel Scum)',
  'Jeff (Hickory Huskers)',
  'KC (Shortbus Superstars)',
  'Marcus (Team Killa MC)',
  'Mike F. (Stars & Stripes)',
  'Mike M. (Moore Better)',
  'Pam (Team GardenGoddess)',
  'Randy (Generic Football Team)',
];

const PROMPT_SUGGESTIONS = {
  commissioner: [
    "State of the League Address: Evaluating current standings, Week 1 results, and expectations for the season.",
    "Official Executive Ruling on trade decorum, sportsmanship, and waiver priority disputes.",
    "Congratulating the week's highest scoring franchise while sternly warning the bottom tier against bench apathy.",
    "Constitutional decree: Reminding all managers of the league by-laws and reverence for the CRFFL record books.",
  ],
  marty_sullivan: [
    "Explain why Randy calling his team 'Generic Football Team' is an insult to football.",
    "A grumpy rant about managers who obsess over projections instead of watching the actual game tape.",
    "Why kickers should never be allowed to win fantasy matchups.",
    "The lost art of the fullback lead-block and why every team in this league is going soft.",
  ],
  chloe_carmichael: [
    "An insider leak into the secret midnight trade negotiations that collapsed at the last second.",
    "Exposing the fragile psychological state of the league's top-scoring manager.",
    "Waiver wire espionage: Who put in bids just to block their bitter rival?",
    "A satirical breakdown of every manager's drafting habits and what their picks say about their personalities.",
  ],
  marcus_vance: [
    "A clinical mathematical proof that luck, not skill, decided this week's closest matchup.",
    "Regression analysis: Why the current #1 team is structurally doomed to collapse.",
    "Expected points vs reality: The scientific truth about who the best manager actually is.",
    "Why emotional lineup management is a statistical disease in the Columbia River league.",
  ],
  buck_callahan: [
    "A trench warfare breakdown of the most physical matchup of the season.",
    "Locker room report: Which manager gave up early and who is playing through the pain?",
    "A gritty preview of upcoming rivalry games, with zero apologies for calling out soft benches.",
    "Why Eric's roster construction is undeniably solid (and a fierce denial of playing favorites).",
  ],
};

export default function AdminDispatchPage() {
  const [activeTab, setActiveTab] = useState('commissioner'); // 'commissioner' | 'reporter' | 'archive'

  // Commissioner form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [weekNumber, setWeekNumber] = useState(1);
  const [categoryName, setCategoryName] = useState("Commissioner's Corner");
  const [authorId, setAuthorId] = useState('commissioner');
  const [authorName, setAuthorName] = useState('Eric Vaughan');
  const [status, setStatus] = useState('published');
  const [publishToWp, setPublishToWp] = useState(true);
  const [broadcastPush, setBroadcastPush] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('/commissioner-banner.png');

  // Commissioner Executive AI Speechwriter state
  const [commishAiOpen, setCommishAiOpen] = useState(true);
  const [commishAiPrompt, setCommishAiPrompt] = useState('');
  const [commishTargetManager, setCommishTargetManager] = useState('General League');
  const [commishIncludeSleeper, setCommishIncludeSleeper] = useState(true);
  const [commishGenerating, setCommishGenerating] = useState(false);
  const [commishGenError, setCommishGenError] = useState(null);

  // Custom reporter generation state
  const [selectedReporter, setSelectedReporter] = useState('marty_sullivan');
  const [reporterPrompt, setReporterPrompt] = useState('');
  const [targetManager, setTargetManager] = useState('General League');
  const [reporterIncludeSleeper, setReporterIncludeSleeper] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  // Editor preview mode
  const [editorMode, setEditorMode] = useState('edit'); // 'edit' | 'preview'

  // Publishing / saving state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Archive state
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [articleError, setArticleError] = useState(null);

  // Load articles for archive tab
  const fetchArticles = async () => {
    setLoadingArticles(true);
    setArticleError(null);
    try {
      const res = await fetch('/api/admin/articles');
      const data = await res.json();
      if (res.ok && data.articles) {
        setArticles(data.articles);
      } else {
        setArticleError(data.error || 'Failed to load articles.');
      }
    } catch (err) {
      setArticleError(err.message);
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'archive') {
      fetchArticles();
    }
  }, [activeTab]);

  // Insert HTML helper tags
  const insertTag = (openTag, closeTag = '') => {
    const textarea = document.getElementById('article-content-input');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = `${openTag}${selectedText}${closeTag}`;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContentHtml(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length);
    }, 50);
  };

  // Switch to Commissioner mode
  const switchToCommissioner = () => {
    setAuthorId('commissioner');
    setAuthorName('Eric Vaughan');
    setCategoryName("Commissioner's Corner");
    setBannerUrl('/commissioner-banner.png');
    setActiveTab('commissioner');
  };

  // Run Commissioner Executive AI Speechwriter
  const handleGenerateCommissioner = async (customDirective = null) => {
    const promptToUse = (typeof customDirective === 'string' ? customDirective : commishAiPrompt).trim();
    if (!promptToUse) return;

    setCommishGenerating(true);
    setCommishGenError(null);

    try {
      const res = await fetch('/api/admin/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: 'commissioner',
          customPrompt: promptToUse,
          targetManager: commishTargetManager === 'General League' ? '' : commishTargetManager,
          week: weekNumber,
          category: categoryName || "Commissioner's Corner",
          includeSleeperData: commishIncludeSleeper,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Generation failed.');
      }

      const art = data.article;
      setTitle(art.title);
      setSummary(art.summary);
      setContentHtml(art.contentHtml);
      setAuthorId('commissioner');
      setAuthorName('Eric Vaughan');
      setCategoryName(art.categoryName || "Commissioner's Corner");
      setWeekNumber(art.weekNumber || weekNumber || 1);
      setBannerUrl('/commissioner-banner.png');

      // Switch straight to the live reader preview
      setEditorMode('preview');
    } catch (err) {
      setCommishGenError(err.message);
    } finally {
      setCommishGenerating(false);
    }
  };

  // Run AI Reporter Generator
  const handleGenerateReporter = async () => {
    if (!reporterPrompt.trim()) return;

    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch('/api/admin/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: selectedReporter,
          customPrompt: reporterPrompt.trim(),
          targetManager: targetManager === 'General League' ? '' : targetManager,
          week: weekNumber,
          includeSleeperData: reporterIncludeSleeper,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Generation failed.');
      }

      const art = data.article;
      setTitle(art.title);
      setSummary(art.summary);
      setContentHtml(art.contentHtml);
      setAuthorId(art.authorId);
      setAuthorName(art.authorName);
      setCategoryName(art.categoryName);
      setWeekNumber(art.weekNumber || 1);
      setBannerUrl(art.bannerUrl || (art.authorId === 'commissioner' ? '/commissioner-banner.png' : null));

      // Switch straight to the editor so user can review and tweak
      setActiveTab('commissioner');
      setEditorMode('preview');
    } catch (err) {
      setGenerateError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Save / Publish Article
  const handleSaveArticle = async (targetStatus = 'published') => {
    if (!title.trim()) {
      setSaveError('Please provide an article headline.');
      return;
    }
    if (!contentHtml.trim()) {
      setSaveError('Please enter article content before publishing.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim() || title.trim(),
          contentHtml,
          authorId,
          authorName,
          categoryName,
          weekNumber: Number(weekNumber) || 1,
          status: targetStatus,
          publishToWp,
          broadcastPush,
          bannerUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save article.');
      }

      setSaveSuccess({
        status: targetStatus,
        message: targetStatus === 'published'
          ? 'Dispatch successfully published to crffl.org & WordPress!'
          : 'Draft successfully saved to database.',
        article: data.article,
        wpUrl: data.wordpress?.link,
      });

      if (activeTab === 'archive') {
        fetchArticles();
      }
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete article
  const handleDeleteArticle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/articles?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(articles.filter((a) => a.id !== id));
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <span>CRFFL Times-Herald Bureau</span>
              <span>•</span>
              <span>Executive Dispatch Desk</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase font-serif">
              DISPATCH DESK &amp; <span className="text-[#d4af37]">ARTICLE COMPOSER</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Write and publish official addresses under <strong className="text-white">Commissioner's Corner</strong>, or commission custom reporting and roasts from any Times-Herald columnist.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-xs font-mono font-bold text-gray-400 hover:text-white transition px-3 py-2 rounded-xl bg-gray-900 border border-gray-800"
            >
              Public Newsroom ↗
            </Link>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-4">
          <button
            type="button"
            onClick={switchToCommissioner}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'commissioner' && authorId === 'commissioner'
                ? 'bg-[#d4af37] text-gray-950 shadow-lg shadow-[#d4af37]/20 font-extrabold'
                : 'bg-gray-900/80 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            <span>✍ Write as Commissioner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reporter')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'reporter'
                ? 'bg-[#d4af37] text-gray-950 shadow-lg shadow-[#d4af37]/20 font-extrabold'
                : 'bg-gray-900/80 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            <span>🎙 Commission Reporter Dispatch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'archive'
                ? 'bg-[#d4af37] text-gray-950 shadow-lg shadow-[#d4af37]/20 font-extrabold'
                : 'bg-gray-900/80 text-gray-300 hover:bg-gray-800 border border-gray-800'
            }`}
          >
            <span>📂 Published Dispatches &amp; Drafts</span>
          </button>
        </div>

        {/* Notifications & Status Alerts */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <span>✓</span>
                <span>{saveSuccess.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveSuccess(null)}
                className="text-xs text-emerald-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            {saveSuccess.wpUrl && (
              <p className="text-xs text-emerald-400 font-mono">
                WordPress Mirror:{' '}
                <a href={saveSuccess.wpUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                  {saveSuccess.wpUrl}
                </a>
              </p>
            )}
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-center justify-between animate-shake">
            <span>⚠️ {saveError}</span>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="text-xs text-rose-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: COMMISSIONER'S CORNER & ACTIVE COMPOSER */}
        {/* ========================================================= */}
        {activeTab === 'commissioner' && (
          <div className="space-y-6">
            {/* Banner Header Card */}
            {bannerUrl && (
              <div className="rounded-2xl overflow-hidden border border-[#d4af37]/40 shadow-2xl bg-black/80 relative">
                <img
                  src={bannerUrl}
                  alt="Office of the Commissioner"
                  className="w-full h-auto block"
                />
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-mono font-bold text-[#d4af37]">
                  ★ Official Header Banner
                </div>
              </div>
            )}

            {/* Author Badge & Week Selector */}
            <div className="p-4 rounded-2xl bg-[#121824] border border-gray-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black/60 shadow flex-shrink-0">
                  <img
                    src={COLUMNISTS[authorId]?.avatar || '/logos/league.png'}
                    alt={authorName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-mono block">Byline Author:</span>
                  <span className="text-sm font-bold text-white">
                    {authorName}{' '}
                    <span className="text-[#d4af37] text-xs font-mono font-normal">
                      ({categoryName})
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label htmlFor="week-select" className="text-xs text-gray-400 font-mono">
                    Season Week:
                  </label>
                  <select
                    id="week-select"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    {[...Array(18)].map((_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? 'Pre-Season' : `Week ${i}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="cat-input" className="text-xs text-gray-400 font-mono">
                    Category:
                  </label>
                  <input
                    id="cat-input"
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#d4af37] w-44"
                  />
                </div>
              </div>
            </div>

            {/* Executive AI Speechwriter Panel */}
            <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-b from-[#161f30] to-[#0f1420] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-xl shadow flex-shrink-0">
                    🏛
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 font-serif flex-wrap">
                      <span>Executive AI Speechwriter &amp; Co-Author</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 uppercase font-sans font-bold">
                        ⚡ Sleeper API Connected
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Draft an official Commissioner's Corner address powered by Gemini with live Sleeper matchups, box scores, standings, and transaction data.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCommishAiOpen(!commishAiOpen)}
                  className="text-xs font-mono text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 transition flex-shrink-0"
                >
                  {commishAiOpen ? '▲ Collapse' : '▼ Expand Assistant'}
                </button>
              </div>

              {commishAiOpen && (
                <div className="space-y-4 pt-3 border-t border-gray-800/80">
                  {/* Quick Suggestions */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-gray-400 block font-semibold">
                      Quick Executive Directives:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(PROMPT_SUGGESTIONS.commissioner || []).map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCommishAiPrompt(sug)}
                          className="px-2.5 py-1 rounded-lg bg-gray-900/90 border border-gray-800 hover:border-[#d4af37]/50 text-gray-300 hover:text-white text-xs text-left transition shadow-sm"
                        >
                          💡 "{sug}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Directive Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase font-mono font-bold tracking-wider text-[#d4af37]">
                      Executive Directive / Speech Directive
                    </label>
                    <textarea
                      rows={3}
                      value={commishAiPrompt}
                      onChange={(e) => setCommishAiPrompt(e.target.value)}
                      placeholder="e.g., Deliver a State of the Union address reviewing Week 1 results, congratulate high scorer, and warn managers about illegal roster hoarding..."
                      className="w-full bg-gray-900/90 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  {/* Controls row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                    <div className="space-y-1">
                      <label className="text-xs uppercase font-mono font-bold tracking-wider text-gray-400">
                        Focal Manager / Target (Optional)
                      </label>
                      <select
                        value={commishTargetManager}
                        onChange={(e) => setCommishTargetManager(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#d4af37]"
                      >
                        {MANAGERS_LIST.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 sm:pt-4">
                      <label className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={commishIncludeSleeper}
                          onChange={(e) => setCommishIncludeSleeper(e.target.checked)}
                          className="w-4 h-4 rounded text-[#d4af37] focus:ring-0 focus:outline-none"
                        />
                        <span>Include Live Sleeper Data (Matchups, Scores &amp; Waivers)</span>
                      </label>
                    </div>

                    <div className="flex justify-end sm:pt-4">
                      <button
                        type="button"
                        disabled={commishGenerating || !commishAiPrompt.trim()}
                        onClick={() => handleGenerateCommissioner()}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] hover:brightness-110 text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {commishGenerating ? (
                          <>
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-950 border-t-transparent" />
                            <span>Drafting Address with Gemini...</span>
                          </>
                        ) : (
                          <span>🎙 Draft Address with Executive AI</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {commishGenError && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                      ⚠️ {commishGenError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Headline Input */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-mono font-bold tracking-wider text-[#d4af37]">
                Article Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., State of the Columbia River Union: Week 1 Aftermath &amp; Waivers"
                className="w-full bg-[#121824] border border-gray-800 rounded-xl px-4 py-3 text-lg sm:text-xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            {/* Summary / Excerpt Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase font-mono font-bold tracking-wider text-gray-400">
                  Lead Summary / Frontpage Excerpt
                </label>
                <span className="text-[10px] text-gray-500 font-mono">
                  Appears in dispatches feed cards
                </span>
              </div>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A brief 1-2 sentence hook highlighting the focus of this ruling or article..."
                className="w-full bg-[#121824] border border-gray-800 rounded-xl p-3 text-xs sm:text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            {/* Editor vs Preview Mode Switcher */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditorMode('edit')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      editorMode === 'edit'
                        ? 'bg-[#d4af37] text-gray-950'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    HTML Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      editorMode === 'preview'
                        ? 'bg-[#d4af37] text-gray-950'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Live Reader Preview
                  </button>
                </div>

                {editorMode === 'edit' && (
                  <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => insertTag('<p>', '</p>')}
                      className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300"
                    >
                      &lt;p&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('<h3>', '</h3>')}
                      className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300"
                    >
                      &lt;h3&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('<strong>', '</strong>')}
                      className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 font-bold"
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('<em>', '</em>')}
                      className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 italic"
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('<blockquote>', '</blockquote>')}
                      className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300"
                    >
                      Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('<hr className="my-6 border-gray-800" />')}
                      className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300"
                    >
                      Divider
                    </button>
                  </div>
                )}
              </div>

              {editorMode === 'edit' ? (
                <textarea
                  id="article-content-input"
                  rows={16}
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  placeholder="<p>Write your article here using standard HTML paragraphs...</p>"
                  className="w-full font-mono text-xs sm:text-sm bg-[#121824] border border-gray-800 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#d4af37] leading-relaxed"
                />
              ) : (
                <div className="p-6 sm:p-10 rounded-2xl bg-[#121824] border border-gray-800 shadow-inner space-y-6">
                  {bannerUrl && (
                    <div className="w-full rounded-2xl overflow-hidden border border-[#d4af37]/40 shadow-2xl bg-black/60 relative">
                      <img
                        src={bannerUrl}
                        alt="Office of the Commissioner"
                        className="w-full h-auto block"
                      />
                    </div>
                  )}
                  <div className="border-b border-gray-800 pb-4">
                    <span className="text-xs font-mono uppercase text-[#d4af37] font-bold">
                      {categoryName} • Week {weekNumber}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                      {decodeHtmlEntities(title) || 'Untitled Article'}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      By {authorName}
                    </p>
                  </div>

                  <div
                    className="article-content text-sm sm:text-base text-gray-200 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: contentHtml || `<p class="text-gray-500 italic">No content typed yet...</p>`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Publishing Controls Card */}
            <div className="p-5 rounded-2xl bg-[#121824] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs font-mono">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishToWp}
                    onChange={(e) => setPublishToWp(e.target.checked)}
                    className="w-4 h-4 rounded text-[#d4af37] focus:ring-0 focus:outline-none"
                  />
                  <span>Publish mirror to WordPress (store.crffl.org)</span>
                </label>

                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={broadcastPush}
                    onChange={(e) => setBroadcastPush(e.target.checked)}
                    className="w-4 h-4 rounded text-[#d4af37] focus:ring-0 focus:outline-none"
                  />
                  <span className="text-[#d4af37]">Broadcast Web Push Alert to Subscribers</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveArticle('draft')}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-200 font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveArticle('published')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] hover:brightness-110 text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-950 border-t-transparent" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>🚀 Publish Dispatch</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: COMMISSION REPORTER DISPATCH (AI PERSONA ASSIGNMENT) */}
        {/* ========================================================= */}
        {activeTab === 'reporter' && (
          <div className="space-y-8">
            <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 space-y-6">
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37]">
                  Step 1: Choose Your Columnist
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Select a Times-Herald Beat Reporter
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Each columnist possesses a distinct psychological profile, worldview, writing voice, and editorial prejudices.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Object.values(COLUMNISTS).map((col) => {
                  const isSelected = selectedReporter === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setSelectedReporter(col.id)}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-[#d4af37]/15 border-[#d4af37] text-white shadow-md ring-1 ring-[#d4af37]/40'
                          : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 bg-black/60 shadow flex-shrink-0">
                          <img
                            src={col.avatar}
                            alt={col.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{col.name}</h3>
                          <span className="text-[11px] text-[#d4af37] block font-mono font-semibold">
                            {col.desk}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        {col.title}
                      </p>

                      <div className="pt-2 border-t border-gray-800/80 text-[10px] font-mono text-gray-400">
                        {isSelected ? '✓ Columnist Assigned' : 'Click to Select'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assignment & Topic Card */}
            <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 space-y-6">
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37]">
                  Step 2: Editorial Assignment &amp; Angle
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Give This Reporter Their Assignment
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Tell the columnist what you want them to analyze, investigate, roast, or argue. They will write completely in character.
                </p>
              </div>

              {/* Suggestions Pills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-gray-400 block">
                  Quick Assignment Ideas for {COLUMNISTS[selectedReporter]?.name}:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(PROMPT_SUGGESTIONS[selectedReporter] || []).map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReporterPrompt(sug)}
                      className="px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 hover:border-[#d4af37]/40 text-gray-300 hover:text-white text-xs text-left transition"
                    >
                      💡 "{sug}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignment Prompt Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-mono font-bold tracking-wider text-[#d4af37]">
                  Custom Assignment Instructions
                </label>
                <textarea
                  rows={4}
                  value={reporterPrompt}
                  onChange={(e) => setReporterPrompt(e.target.value)}
                  placeholder="Explain what this columnist should write about, who they should focus on, and any specific jokes or grudges they should bring up..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              {/* Optional Focal Manager, Week & Sleeper Data Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-mono font-bold tracking-wider text-gray-400">
                    Focal Manager / Target (Optional)
                  </label>
                  <select
                    value={targetManager}
                    onChange={(e) => setTargetManager(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    {MANAGERS_LIST.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-mono font-bold tracking-wider text-gray-400">
                    Relevant Week
                  </label>
                  <select
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    {[...Array(18)].map((_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? 'Pre-Season' : `Week ${i}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:pt-4">
                  <label className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={reporterIncludeSleeper}
                      onChange={(e) => setReporterIncludeSleeper(e.target.checked)}
                      className="w-4 h-4 rounded text-[#d4af37] focus:ring-0 focus:outline-none"
                    />
                    <span>Include Live Sleeper Data (Matchups, Scores &amp; Waivers)</span>
                  </label>
                </div>
              </div>

              {generateError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                  ⚠️ {generateError}
                </div>
              )}

              {/* Generate Button */}
              <div className="pt-3 border-t border-gray-800 flex justify-end">
                <button
                  type="button"
                  disabled={generating || !reporterPrompt.trim()}
                  onClick={handleGenerateReporter}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] hover:brightness-110 text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-950 border-t-transparent" />
                      <span>Generating in Character with Gemini...</span>
                    </>
                  ) : (
                    <span>🎙 Generate Article Draft →</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PUBLISHED DISPATCHES & DRAFTS ARCHIVE */}
        {/* ========================================================= */}
        {activeTab === 'archive' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white">All Newsroom Dispatches</h2>
                <p className="text-xs text-gray-400">
                  Database record archive from Supabase newsroom_articles.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchArticles}
                className="text-xs font-mono font-bold text-[#d4af37] hover:underline"
              >
                ↻ Refresh List
              </button>
            </div>

            {loadingArticles ? (
              <div className="p-12 text-center text-gray-500 font-mono text-xs">
                Loading dispatches from database...
              </div>
            ) : articleError ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {articleError}
              </div>
            ) : articles.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#121824] border border-gray-800 text-gray-400 text-sm">
                No articles recorded in the database yet.
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((art) => {
                  const columnist = COLUMNISTS[art.author_id] || {
                    name: art.author_name,
                    avatar: '/logos/league.png',
                  };

                  return (
                    <div
                      key={art.id}
                      className="p-4 rounded-xl bg-[#121824] border border-gray-800 hover:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-black/60 shadow flex-shrink-0">
                          <img
                            src={columnist.avatar}
                            alt={art.author_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37]">
                              {art.category_name}
                            </span>
                            <span className="text-xs font-mono text-gray-500">
                              Week {art.week_number} • {formatDatePacific(art.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {art.status === 'draft' && (
                              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Draft
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white mt-1 line-clamp-1">
                            {decodeHtmlEntities(art.title)}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-1 font-mono">
                            By {art.author_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setTitle(art.title);
                            setSummary(art.summary || '');
                            setContentHtml(art.content_html || '');
                            setAuthorId(art.author_id || 'commissioner');
                            setAuthorName(art.author_name || 'Eric Vaughan');
                            setCategoryName(art.category_name || "Commissioner's Corner");
                            setWeekNumber(art.week_number || 1);
                            setStatus(art.status || 'published');
                            setActiveTab('commissioner');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 hover:border-gray-500 text-xs font-mono text-gray-300 hover:text-white transition"
                        >
                          Edit in Composer
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(art.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/80 hover:bg-rose-900/60 text-xs font-mono text-rose-300 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

