'use client';

import { useState, useEffect } from 'react';
import { WEEKLY_CONTESTS_MASTER } from '@/lib/contests';

export default function AdminContestsPage() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState(1);
  const [saving, setSaving] = useState(false);
  const [adjudicating, setAdjudicating] = useState(false);
  const [message, setMessage] = useState('');
  const [adjudicationDetail, setAdjudicationDetail] = useState('');

  const runAutoAdjudication = async (weekNumber, { force = false } = {}) => {
    setAdjudicating(true);
    setMessage('');
    setAdjudicationDetail('');

    try {
      const url = `/api/cron/adjudicate?week=${weekNumber}${force ? '&force=true' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-commissioner-auth': 'authorized',
        },
      });
      const data = await res.json();

      if (data.success && data.adjudication?.success) {
        const adj = data.adjudication;
        updateContest(weekNumber, 'winner_manager', adj.winner_manager);
        updateContest(weekNumber, 'winner_team', adj.winner_team);
        updateContest(weekNumber, 'winning_score', adj.winning_score);

        if (adj.isFinal) {
          updateContest(weekNumber, 'status', 'completed');
          setMessage(`Week ${weekNumber} Contest Officially Finalized & Locked! Winner: ${adj.winner_manager} (${adj.winner_team}) with ${adj.winning_score}`);
        } else if (adj.status === 'stat_correction_pending') {
          updateContest(weekNumber, 'status', 'stat_correction_pending');
          setMessage(`[STAT CORRECTION HOLD (< 2.0 PTS)]: Current leader is ${adj.winner_manager} (${adj.winner_team}) with ${adj.winning_score}. Matches complete, but margin is under 2.0 pts. Locks Wednesday at 10:00 AM PT unless force locked.`);
        } else {
          // Status stays active - games are in progress
          updateContest(weekNumber, 'status', 'active');
          setMessage(`[LIVE PREVIEW - IN PROGRESS]: Current leader is ${adj.winner_manager} (${adj.winner_team}) with ${adj.winning_score}. Games are underway.`);
        }
        setAdjudicationDetail(adj.explanation || '');
      } else {
        setMessage(`Adjudication notice: ${data.adjudication?.reason || data.error || 'Could not adjudicate week.'}`);
      }
    } catch (err) {
      setMessage(`Network error during adjudication: ${err.message}`);
    } finally {
      setAdjudicating(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/contests')
      .then((r) => r.json())
      .then((data) => {
        const list = data.contests || [];
        const map = {};
        list.forEach((c) => {
          map[c.week_number] = c;
        });

        const fullList = WEEKLY_CONTESTS_MASTER.map((m) => {
          const db = map[m.week_number];
          return {
            ...m,
            ...(db || {}),
          };
        });
        setContests(fullList);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const updateContest = (weekNumber, field, value) => {
    setContests((prev) =>
      prev.map((c) => (c.week_number === weekNumber ? { ...c, [field]: value } : c))
    );
  };

  const saveContest = async (weekNumber) => {
    const contest = contests.find((c) => c.week_number === weekNumber);
    if (!contest) return;

    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contest),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Week ${weekNumber} contest saved successfully!`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Network Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-400">Loading contests data...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="border-b border-gray-800 pb-5">
        <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37]">
          League Administration
        </span>
        <h1 className="text-3xl font-extrabold text-white">
          Weekly Contests Manager (Weeks 1–14)
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Marty Sullivan references these completed contest winners and upcoming challenges in his Tuesday Post-Game Recap columns.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-700 text-sm font-medium">
          {message}
        </div>
      )}

      {/* Week Tabs */}
      <div className="flex flex-wrap gap-2">
        {contests.map((c) => (
          <button
            key={c.week_number}
            type="button"
            onClick={() => setActiveWeek(c.week_number)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              activeWeek === c.week_number
                ? 'bg-[#d4af37] text-gray-950 border-[#d4af37]'
                : 'bg-[#121824] text-gray-300 border-gray-800 hover:border-gray-700'
            }`}
          >
            W{c.week_number}
          </button>
        ))}
      </div>

      {/* Active Week Form */}
      {(() => {
        const c = contests.find((item) => item.week_number === activeWeek);
        if (!c) return null;

        return (
          <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Week {c.week_number} Contest Details
                </h2>
                <span className="text-xs uppercase font-mono text-[#d4af37]">
                  Prize: {c.prize || '$10'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => runAutoAdjudication(c.week_number, { force: false })}
                  disabled={adjudicating}
                  className="px-4 py-2 rounded-xl bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {adjudicating ? 'Calculating from Sleeper...' : `Live Leader / Auto-Adjudicate W${c.week_number}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to FORCE lock Week ${c.week_number} right now as officially completed?`)) {
                      runAutoAdjudication(c.week_number, { force: true });
                    }
                  }}
                  disabled={adjudicating}
                  title="Override stat correction window and lock status=completed immediately"
                  className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50"
                >
                  Force Lock Winner
                </button>
              </div>
            </div>

            {adjudicationDetail && (
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800 text-xs text-blue-200 font-mono">
                <strong>Adjudication Breakdown:</strong> {adjudicationDetail}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">Contest Name</label>
                <input
                  type="text"
                  value={c.contest_name || ''}
                  onChange={(e) => updateContest(c.week_number, 'contest_name', e.target.value)}
                  placeholder="e.g. Highest Scoring Bench Player"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">Prize Amount</label>
                <input
                  type="text"
                  value={c.prize || '$10'}
                  onChange={(e) => updateContest(c.week_number, 'prize', e.target.value)}
                  placeholder="$10"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-gray-300">Description / Rules</label>
                <input
                  type="text"
                  value={c.description || ''}
                  onChange={(e) => updateContest(c.week_number, 'description', e.target.value)}
                  placeholder="e.g. The non-starting player with the highest total fantasy points."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">Winner (Manager Name)</label>
                <input
                  type="text"
                  value={c.winner_manager || ''}
                  onChange={(e) => updateContest(c.week_number, 'winner_manager', e.target.value)}
                  placeholder="e.g. Corey (Team coreycash)"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">Winning Score / Detail</label>
                <input
                  type="text"
                  value={c.winning_score || ''}
                  onChange={(e) => updateContest(c.week_number, 'winning_score', e.target.value)}
                  placeholder="e.g. 28.4 pts (Isaiah Likely)"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => saveContest(c.week_number)}
                disabled={saving}
                className="bg-[#d4af37] text-gray-950 font-bold px-6 py-2.5 rounded-xl hover:bg-[#e6c24d] transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Save Week ${c.week_number} Contest`}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

