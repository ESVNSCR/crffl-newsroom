'use client';

import { useState } from 'react';

const REPORTERS = [
  {
    id: 'marty',
    name: 'Marty Sullivan',
    role: 'Tuesday Post-Game Recap',
    category: 'The Tuesday Recap',
    day: 'Tuesday @ 12:00 PM',
  },
  {
    id: 'chloe',
    name: 'Chloe Carmichael',
    role: 'Wednesday Transactions & Rumor Mill',
    category: 'The Spin Room',
    day: 'Wednesday @ 12:00 PM',
  },
  {
    id: 'marcus',
    name: 'Dr. Marcus Vance',
    role: 'Wednesday Power Rankings Desk',
    category: 'Power Rankings',
    day: 'Wednesday @ 2:00 PM',
  },
  {
    id: 'buck',
    name: 'Buck Callahan',
    role: 'Thursday Look-Ahead & Matchup Preview',
    category: 'The Grit Desk',
    day: 'Thursday @ 12:00 PM',
  },
];

export default function AdminTestBenchPage() {
  const [selectedReporter, setSelectedReporter] = useState('marty');
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');

  const runReporter = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter: selectedReporter,
          dryRun,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="border-b border-gray-800 pb-5">
        <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37]">
          Diagnostic & Dispatch Control Room
        </span>
        <h1 className="text-3xl font-extrabold text-white">Newsroom Test Bench</h1>
        <p className="text-sm text-gray-400 mt-1">
          Execute any columnist on demand with live Sleeper stats, dynamic rival rebuttals, and optional WordPress publishing.
        </p>
      </div>

      {/* Control Card */}
      <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {REPORTERS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedReporter(r.id)}
              className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedReporter === r.id
                  ? 'bg-[#d4af37]/10 border-[#d4af37] text-white'
                  : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              <div>
                <h3 className="font-bold text-white text-base">{r.name}</h3>
                <p className="text-xs text-[#d4af37] font-medium mt-0.5">{r.category}</p>
                <p className="text-[11px] text-gray-400 mt-2">{r.role}</p>
              </div>
              <span className="text-[10px] font-mono text-gray-500 mt-3 pt-2 border-t border-gray-800">
                {r.day}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-800">
          <div className="flex items-center space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
              <span className="ml-3 text-sm font-semibold text-gray-200">
                {dryRun ? '🛡️ Dry Run Mode (Preview Only)' : '🚀 Live Mode (Publish to WordPress + DB)'}
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={runReporter}
            disabled={running}
            className="bg-[#d4af37] text-gray-950 font-bold px-7 py-3 rounded-xl hover:bg-[#e6c24d] transition shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {running ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-gray-950"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                Generating Column with Gemini...
              </>
            ) : (
              `Run ${REPORTERS.find((r) => r.id === selectedReporter)?.name} ⚡`
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-sm">
          <strong>Execution Error:</strong> {error}
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <span className="text-xs uppercase font-mono text-[#d4af37]">
                Generation Completed • {result.dryRun ? 'Dry Run' : 'Published'}
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">
                {result.result?.title || `${result.reporter} Output`}
              </h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  activeTab === 'preview' ? 'bg-[#d4af37] text-gray-950' : 'text-gray-400 hover:text-white'
                }`}
              >
                Article Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  activeTab === 'raw' ? 'bg-[#d4af37] text-gray-950' : 'text-gray-400 hover:text-white'
                }`}
              >
                Raw Model Output
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  activeTab === 'json' ? 'bg-[#d4af37] text-gray-950' : 'text-gray-400 hover:text-white'
                }`}
              >
                Payload Inspection
              </button>
            </div>
          </div>

          {activeTab === 'preview' && (
            <div className="space-y-4">
              {result.result?.wordpress?.link && (
                <div className="p-3 bg-green-950/40 border border-green-800 rounded-xl text-xs text-green-300">
                  🎉 Published to WordPress:{' '}
                  <a
                    href={result.result.wordpress.link}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold"
                  >
                    {result.result.wordpress.link}
                  </a>
                </div>
              )}

              {result.result?.article?.content_html ? (
                <div
                  className="prose prose-invert max-w-none text-gray-200 leading-relaxed text-base space-y-4 bg-gray-900/60 p-6 rounded-xl border border-gray-800"
                  dangerouslySetInnerHTML={{ __html: result.result.article.content_html }}
                />
              ) : result.result?.intro_blurb ? (
                <div className="space-y-4 bg-gray-900/60 p-6 rounded-xl border border-gray-800">
                  <p className="text-gray-200 leading-relaxed whitespace-pre-line">
                    {result.result.intro_blurb}
                  </p>
                  <div className="pt-2">
                    <a
                      href="/power-rankings"
                      className="text-[#d4af37] font-bold underline text-sm"
                    >
                      View Live Board on /power-rankings →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 italic">No HTML preview available.</div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <pre className="p-4 bg-black/60 rounded-xl border border-gray-800 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-96">
              {result.result?.rawText || JSON.stringify(result.result, null, 2)}
            </pre>
          )}

          {activeTab === 'json' && (
            <pre className="p-4 bg-black/60 rounded-xl border border-gray-800 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
