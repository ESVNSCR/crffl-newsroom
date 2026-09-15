'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DAYS_OF_WEEK, TIMES_OF_DAY } from '@/lib/reporterSchedules';

export default function AdminSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [currentTimePt, setCurrentTimePt] = useState('');

  // Live Pacific clock
  useEffect(() => {
    const updateTime = () => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
      setCurrentTimePt(formatter.format(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch reporter schedules from server
  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/admin/schedules');
      const data = await res.json();
      if (res.ok && data.schedules) {
        setSchedules(data.schedules);
      } else {
        setError(data.error || 'Failed to fetch schedules.');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleFieldChange = (reporterId, field, value) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.reporter_id === reporterId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSaveSchedule = async (reporterId) => {
    const target = schedules.find((s) => s.reporter_id === reporterId);
    if (!target) return;

    setSavingId(reporterId);
    setSavedId(null);
    setError('');

    try {
      const res = await fetch('/api/admin/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_id: target.reporter_id,
          day_of_week: target.day_of_week,
          time_of_day: target.time_of_day,
          enabled: target.enabled,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavedId(reporterId);
        setTimeout(() => setSavedId(null), 3500);
      } else {
        setError(data.error || 'Failed to update schedule.');
      }
    } catch (err) {
      setError(err.message || 'Network error updating schedule.');
    } finally {
      setSavingId(null);
    }
  };

  const handleRunDispatch = async (reporterId, reporterName) => {
    if (!window.confirm(`Generate and publish a live article for ${reporterName} right now?`)) {
      return;
    }

    setDispatchingId(reporterId);
    setDispatchResult(null);
    setError('');

    try {
      const res = await fetch(`/api/cron/dispatch?reporter=${reporterId}&force=true`);
      const data = await res.json();

      if (res.ok && data.success) {
        setDispatchResult({
          reporterName,
          title: data.result?.article?.title || data.result?.article?.headline || 'Article published successfully!',
          slug: data.result?.article?.slug || '',
        });
        fetchSchedules(); // refresh latest article link
      } else {
        setError(data.error || `Failed to dispatch ${reporterName}.`);
      }
    } catch (err) {
      setError(err.message || `Network error dispatching ${reporterName}.`);
    } finally {
      setDispatchingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4af37]" />
          <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
            Loading Editorial Schedules...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* 1. Header Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#151c2a] via-[#0f1522] to-[#090d14] border border-[#d4af37]/35 p-6 sm:p-8 shadow-2xl">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-xs font-mono font-bold tracking-wider uppercase">
                <span>Editorial Control Desk</span>
                <span>•</span>
                <span>Publication Roster & Cadence</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase font-serif">
                REPORTER <span className="text-[#d4af37]">PUBLICATION SCHEDULE</span>
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm text-gray-300 leading-relaxed">
                Control what each reporter covers and when their column automatically dispatches to the Times-Herald. Change days or times anytime using the dropdown selectors below.
              </p>
            </div>

            {/* Current Pacific Clock */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col sm:items-end justify-center shadow-inner flex-shrink-0">
              <span className="text-[10px] font-mono text-[#d4af37] uppercase tracking-widest font-bold block">
                Official League Time (Pacific)
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-white mt-0.5">
                {currentTimePt || 'Pacific Time'}
              </span>
              <span className="text-[10px] font-mono text-gray-400 mt-1">
                Portland, OR • All automated crons sync to this clock
              </span>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-sm text-rose-300 font-mono animate-shake flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-xs text-rose-400 hover:text-white px-2 py-0.5 rounded border border-rose-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {dispatchResult && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700 text-sm text-emerald-200 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div>
              <span className="font-bold text-white">⚡ Immediate Dispatch Complete:</span>{' '}
              <span>Published "{dispatchResult.title}"</span>
            </div>
            {dispatchResult.slug && (
              <Link
                href={`/?article=${dispatchResult.slug}#dispatches`}
                target="_blank"
                className="text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 px-3 py-1.5 rounded-lg transition whitespace-nowrap self-start sm:self-auto"
              >
                Read Live Article →
              </Link>
            )}
          </div>
        )}

        {/* 2. Visual Weekly Editorial Cadence Bar */}
        <div className="p-5 rounded-2xl bg-[#121824] border border-gray-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#d4af37] font-bold">
              Weekly Editorial Beat Flow (At A Glance)
            </h3>
            <span className="text-[11px] font-mono text-gray-400">
              Season VI Publication Cadence
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase block">Tuesdays (12:00 PM)</span>
              <span className="text-xs font-bold text-white block">Marty Sullivan</span>
              <span className="text-[11px] text-amber-400 font-mono truncate block">The Tuesday Recap</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase block">Wednesdays (12:00 PM)</span>
              <span className="text-xs font-bold text-white block">Chloe Carmichael</span>
              <span className="text-[11px] text-purple-400 font-mono truncate block">The Spin Room</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase block">Wednesdays (2:00 PM)</span>
              <span className="text-xs font-bold text-white block">Dr. Marcus Vance</span>
              <span className="text-[11px] text-blue-400 font-mono truncate block">Official Power Rankings</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase block">Thursdays (12:00 PM)</span>
              <span className="text-xs font-bold text-white block">Buck Callahan</span>
              <span className="text-[11px] text-emerald-400 font-mono truncate block">The Look-Ahead Previews</span>
            </div>
          </div>
        </div>

        {/* 3. Detailed Columnist Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h2 className="text-xl font-bold text-white">
              Staff Columnists & Publication Settings
            </h2>
            <span className="text-xs text-gray-400 font-mono">
              5 Columnists Active • Instant Cloud Sync
            </span>
          </div>

          <div className="space-y-6">
            {schedules.map((reporter) => {
              const isSaving = savingId === reporter.reporter_id;
              const isSaved = savedId === reporter.reporter_id;
              const isDispatching = dispatchingId === reporter.reporter_id;

              return (
                <div
                  key={reporter.reporter_id}
                  className={`rounded-2xl bg-[#121824] border transition shadow-xl p-6 sm:p-7 space-y-6 ${
                    reporter.enabled
                      ? 'border-gray-800 hover:border-gray-700'
                      : 'border-gray-900/80 opacity-70 bg-[#0d121c]'
                  }`}
                >
                  {/* Reporter Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black/60 shadow-lg flex-shrink-0 flex items-center justify-center">
                        <img
                          src={reporter.avatar || '/logos/league.png'}
                          alt={reporter.reporter_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-black text-white">
                            {reporter.reporter_name}
                          </h3>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] font-bold">
                            {reporter.column_name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">
                          {reporter.desk}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      {/* Active/Paused Switch */}
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                        <input
                          type="checkbox"
                          checked={reporter.enabled}
                          onChange={(e) =>
                            handleFieldChange(reporter.reporter_id, 'enabled', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                        <span className="text-xs font-mono font-bold text-gray-300">
                          {reporter.enabled ? 'Active' : 'Paused'}
                        </span>
                      </label>

                      {/* Manual Dispatch Button */}
                      {reporter.reporter_id !== 'commissioner' && (
                        <button
                          type="button"
                          onClick={() => handleRunDispatch(reporter.reporter_id, reporter.reporter_name)}
                          disabled={isDispatching}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 text-xs font-bold font-mono transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isDispatching ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-300" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <span>⚡</span>
                              <span>Run Now</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section A: What They Post */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 space-y-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] font-bold block">
                          Beat & Content Coverage
                        </span>
                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mt-1">
                          {reporter.description}
                        </p>
                      </div>

                      {/* Latest Published Article Banner */}
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-[10px] font-mono text-gray-400 uppercase block">
                          Latest Published Dispatch:
                        </span>
                        {reporter.latest_article ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate max-w-md">
                              "{reporter.latest_article.title}"
                            </span>
                            <Link
                              href={`/?article=${reporter.latest_article.slug}#dispatches`}
                              target="_blank"
                              className="text-[11px] font-mono text-[#d4af37] hover:text-[#e6c24d] underline whitespace-nowrap"
                            >
                              View Published Dispatch ↗
                            </Link>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            No recent dispatches logged for this columnist yet.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section B: When They Post (Interactive Dropdowns) */}
                    <div className="lg:col-span-5 bg-black/30 border border-gray-800/80 rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] font-bold block">
                          Automated Publishing Schedule
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Set publication day and time (Pacific Time)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Day Selector */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-gray-300 font-semibold block">
                            Publication Day
                          </label>
                          <select
                            value={reporter.day_of_week}
                            onChange={(e) =>
                              handleFieldChange(reporter.reporter_id, 'day_of_week', e.target.value)
                            }
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#d4af37] cursor-pointer"
                          >
                            {DAYS_OF_WEEK.map((day) => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Time Selector */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-gray-300 font-semibold block">
                            Publication Time (PT)
                          </label>
                          <select
                            value={reporter.time_of_day}
                            onChange={(e) =>
                              handleFieldChange(reporter.reporter_id, 'time_of_day', e.target.value)
                            }
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#d4af37] cursor-pointer font-mono"
                          >
                            {TIMES_OF_DAY.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Save Button Row */}
                      <div className="pt-2 flex items-center justify-between border-t border-gray-800">
                        <Link
                          href="/admin/dispatch?tab=prompts"
                          className="text-[11px] font-mono text-gray-400 hover:text-white transition underline"
                        >
                          Prompt Guidelines →
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleSaveSchedule(reporter.reporter_id)}
                          disabled={isSaving}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md ${
                            isSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#d4af37] hover:bg-[#e6c24d] text-gray-950 disabled:opacity-50'
                          }`}
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-gray-950" />
                              <span>Saving...</span>
                            </>
                          ) : isSaved ? (
                            <>
                              <span>✓</span>
                              <span>Schedule Saved!</span>
                            </>
                          ) : (
                            <span>Save Schedule</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Help & Notice Footer */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#121824] to-[#161f30] border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="space-y-1 text-center sm:text-left">
            <span className="font-bold text-white block">
              Automated Cron & Schedule Enforcement
            </span>
            <p className="max-w-2xl leading-relaxed">
              When a reporter's day or time is modified above, the newsroom publication engine immediately honors the new schedule. Automated triggers will hold articles until their configured day in Pacific Time (Portland, OR).
            </p>
          </div>
          <Link
            href="/admin/dispatch"
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold whitespace-nowrap transition border border-gray-700 font-mono"
          >
            ← Back to Dispatch Desk
          </Link>
        </div>
      </div>
    </div>
  );
}

