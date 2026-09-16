'use client';

import { useState } from 'react';

const REPORTERS = [
  {
    id: 'marty',
    name: 'Marty Sullivan',
    role: 'Tuesday Post-Game Recap',
    category: 'The Tuesday Recap',
    day: 'Tuesday @ 12:00 PM',
    avatar: '/reporters/marty-sullivan.png',
  },
  {
    id: 'chloe',
    name: 'Chloe Carmichael',
    role: 'Wednesday Transactions & Rumor Mill',
    category: 'The Spin Room',
    day: 'Wednesday @ 12:00 PM',
    avatar: '/reporters/chloe-carmichael.png',
  },
  {
    id: 'marcus',
    name: 'Dr. Marcus Vance',
    role: 'Wednesday Power Rankings Desk',
    category: 'Power Rankings',
    day: 'Wednesday @ 2:00 PM',
    avatar: '/reporters/marcus-vance.png',
  },
  {
    id: 'buck',
    name: 'Buck Callahan',
    role: 'Thursday Look-Ahead & Matchup Preview',
    category: 'The Grit Desk',
    day: 'Thursday @ 12:00 PM',
    avatar: '/reporters/buck-callahan.png',
  },
];

export default function AdminTestBenchPage() {
  const [selectedReporter, setSelectedReporter] = useState('marty');
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);
  const [reminderError, setReminderError] = useState(null);

  // Web Push Broadcast States
  const [pushTitle, setPushTitle] = useState('CRFFL Times-Herald Breaking Alert');
  const [pushBody, setPushBody] = useState('Dr. Marcus Vance has published the Week 1 Apex Power Index!');
  const [pushCategory, setPushCategory] = useState('');
  const [pushBroadcasting, setPushBroadcasting] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const [pushError, setPushError] = useState(null);
  const [promptResetMessage, setPromptResetMessage] = useState('');

  const resetFirstVisitPrompt = () => {
    try {
      localStorage.removeItem('crffl_alert_prompt_seen');
      localStorage.removeItem('crffl_alert_pref');
      setPromptResetMessage('First-visit prompt reset! Refresh the homepage or any page to see the prompt.');
      setTimeout(() => setPromptResetMessage(''), 4000);
    } catch (_) {}
  };

  const broadcastPushAlert = async () => {
    setPushBroadcasting(true);
    setPushError(null);
    setPushResult(null);

    try {
      const res = await fetch('/api/alerts/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pushTitle,
          body: pushBody,
          category: pushCategory || null,
          url: '/',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setPushResult(data);
    } catch (err) {
      setPushError(err.message);
    } finally {
      setPushBroadcasting(false);
    }
  };

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

  const sendTestReminder = async () => {
    setReminderLoading(true);
    setReminderError(null);
    setReminderResult(null);

    try {
      const res = await fetch('/api/cron/baseline-reminder?week=1&force=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-commissioner-auth': 'authorized',
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setReminderResult(data);
    } catch (err) {
      setReminderError(err.message);
    } finally {
      setReminderLoading(false);
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
          Execute any columnist on demand with live Sleeper stats, dynamic rival rebuttals, and native database publishing.
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
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-black/60 shadow flex-shrink-0 flex items-center justify-center">
                    <img
                      src={r.avatar}
                      alt={r.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{r.name}</h3>
                    <p className="text-xs text-[#d4af37] font-medium">{r.category}</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{r.role}</p>
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
                {dryRun ? 'Dry Run Mode (Preview Only)' : 'Live Mode (Publish to DB)'}
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
              `Run ${REPORTERS.find((r) => r.id === selectedReporter)?.name}`
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

      {/* Commissioner Baseline Reminder Diagnostic Card */}
      <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] text-[10px] font-mono font-bold uppercase">
              <span>Wednesday 9:00 AM Cron</span>
              <span>•</span>
              <span>Automated Alert</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Commissioner Baseline Reminder Dispatcher
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Dispatches automated alerts to Commissioner Eric every Wednesday morning before Dr. Vance compiles the Apex Power Index at 2:00 PM.
            </p>
          </div>

          <button
            type="button"
            onClick={sendTestReminder}
            disabled={reminderLoading}
            className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e6c24d] text-gray-950 text-xs font-black transition shadow-lg flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            {reminderLoading ? 'Dispatching...' : 'Send Test Reminder Now'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2">
            <span className="font-mono text-[11px] font-bold text-[#d4af37] uppercase block">
              Carrier SMS Gateway (Verizon)
            </span>
            <p className="text-gray-300">
              Target: <strong className="text-white">480-209-7790</strong> (<code className="text-gray-400">4802097790@vtext.com</code>)
            </p>
            <p className="text-gray-400 text-[11px]">
              Carrier gateway delivers SMS texts directly to Verizon handsets.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2">
            <span className="font-mono text-[11px] font-bold text-indigo-400 uppercase block">
              Discord Webhook
            </span>
            <p className="text-gray-300">
              Target Username: <strong className="text-white">@NAZQAR</strong>
            </p>
            <p className="text-gray-400 text-[11px]">
              Set <code className="text-gray-300">DISCORD_WEBHOOK_URL</code> in environment variables to receive channel pings.
            </p>
          </div>
        </div>

        {reminderError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 font-mono">
            <strong>Error:</strong> {reminderError}
          </div>
        )}

        {reminderResult && (
          <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-2">
            <span className="text-xs font-bold text-emerald-400 block font-mono">
              ✓ Reminder Dispatch Executed
            </span>
            <pre className="text-[11px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(reminderResult.reminder, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Web Push Notification Broadcast Card */}
      <div className="bg-[#121824] border border-[#d4af37]/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] text-[10px] font-mono font-bold uppercase">
              <span>Web Push Engine</span>
              <span>•</span>
              <span>RFC 8291 / 8292</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Browser Push Notification Broadcast Console
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Broadcast instant push alerts to enrolled desktop & mobile subscriber devices (lock screen banners, notification center pings).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={resetFirstVisitPrompt}
              className="px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-[#d4af37] text-xs font-semibold border border-gray-700 transition"
              title="Reset the local storage flag so the first-visit prompt displays again on refresh"
            >
              Reset First-Visit Prompt
            </button>

            <button
              type="button"
              onClick={broadcastPushAlert}
              disabled={pushBroadcasting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] hover:brightness-110 text-gray-950 text-xs font-black transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {pushBroadcasting ? 'Broadcasting...' : 'Broadcast Push Alert Now'}
            </button>
          </div>
        </div>

        {promptResetMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 font-semibold flex items-center gap-2">
            <span>✓</span>
            <span>{promptResetMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Alert Title</label>
            <input
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-300">Message Body</label>
            <input
              type="text"
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300 block">Target Category</label>
            <select
              value={pushCategory}
              onChange={(e) => setPushCategory(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
            >
              <option value="">Broadcast to All Subscribers</option>
              <option value="articles">Articles & Beats Only</option>
              <option value="rankings">Power Rankings Only</option>
              <option value="bets">New Sportsbook Lines Only</option>
              <option value="payouts">Wager Payouts Only</option>
            </select>
          </div>
        </div>

        {pushError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 font-mono">
            <strong>Error:</strong> {pushError}
          </div>
        )}

        {pushResult && (
          <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-2">
            <span className="text-xs font-bold text-emerald-400 block font-mono">
              ✓ Broadcast Result: {pushResult.message}
            </span>
            <pre className="text-[11px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(pushResult.details || pushResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

