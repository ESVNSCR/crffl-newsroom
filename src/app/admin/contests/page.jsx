'use client';

import { useState, useEffect } from 'react';
import { WEEKLY_CONTESTS_MASTER, LEAGUE_PAYOUTS } from '@/lib/contests';

export default function AdminContestsPage() {
  const [activeTab, setActiveTab] = useState('payouts'); // 'payouts' | 'contests'
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState(1);
  const [saving, setSaving] = useState(false);
  const [adjudicating, setAdjudicating] = useState(false);
  const [message, setMessage] = useState('');
  const [adjudicationDetail, setAdjudicationDetail] = useState('');

  // Payouts Editor State
  const [payouts, setPayouts] = useState(LEAGUE_PAYOUTS);
  const [savingPayouts, setSavingPayouts] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState('');

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
        updateContest(weekNumber, 'winner_player', adj.winner_player || '');
        updateContest(weekNumber, 'winning_score', adj.winning_score);

        if (adj.isFinal) {
          updateContest(weekNumber, 'status', 'completed');
          setMessage(`Week ${weekNumber} Contest Officially Finalized & Locked! Winner: ${adj.winner_manager} (${adj.winner_team}) with ${adj.winning_score}`);
        } else if (adj.status === 'stat_correction_pending') {
          updateContest(weekNumber, 'status', 'stat_correction_pending');
          setMessage(`[STAT CORRECTION HOLD (< 2.0 PTS)]: Current leader is ${adj.winner_manager} (${adj.winner_team}) with ${adj.winning_score}. Matches complete, but margin is under 2.0 pts. Locks Wednesday at 10:00 AM PT unless force locked.`);
        } else {
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
    Promise.all([
      fetch('/api/admin/contests').then((r) => r.json()).catch(() => ({ contests: [] })),
      fetch('/api/admin/payouts').then((r) => r.json()).catch(() => ({ payouts: LEAGUE_PAYOUTS })),
    ])
      .then(([contestData, payoutData]) => {
        const list = contestData.contests || [];
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

        if (Array.isArray(payoutData.payouts) && payoutData.payouts.length > 0) {
          setPayouts(payoutData.payouts);
        }
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

  const updatePayoutField = (index, field, value) => {
    setPayouts((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'amount') {
        const num = Number(value) || 0;
        target.amount = num;
        target.label = `$${num}`;
      } else {
        target[field] = value;
      }

      updated[index] = target;
      return updated;
    });
  };

  const saveAllPayouts = async () => {
    setSavingPayouts(true);
    setPayoutMessage('');
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payouts }),
      });
      const data = await res.json();
      if (data.success) {
        setPayoutMessage('Payout schedule updated successfully! Public Info page will now reflect these amounts.');
      } else {
        setPayoutMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setPayoutMessage(`Network Error: ${err.message}`);
    } finally {
      setSavingPayouts(false);
    }
  };

  const resetPayoutsToDefault = () => {
    if (window.confirm('Reset all payouts to standard defaults ($200 Champion, $100 2nd, $50 3rd, $25 4th, $10 Toilet Bowl, $140 Weekly)?')) {
      setPayouts(LEAGUE_PAYOUTS);
      setPayoutMessage('Reset to default values. Remember to click "Save Payout Schedule" to commit changes.');
    }
  };

  const calculatedPlayoffPool = payouts
    .filter((p) => p.place !== '14 Weekly Contests')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const weeklyBountiesTier = payouts.find((p) => p.place === '14 Weekly Contests');
  const calculatedWeeklyPool = weeklyBountiesTier ? Number(weeklyBountiesTier.amount || 0) : 140;
  const calculatedTotalPurse = calculatedPlayoffPool + calculatedWeeklyPool;

  if (loading) {
    return <div className="p-12 text-center text-gray-400">Loading contests &amp; payout data...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="border-b border-gray-800 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37]">
            League Administration
          </span>
          <h1 className="text-3xl font-extrabold text-white">
            Contests &amp; Payouts Control Center
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage championship prize allocations, tier descriptions, and 14-week side contest winners.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-900 border border-gray-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition ${
              activeTab === 'payouts'
                ? 'bg-[#d4af37] text-gray-950 shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💰 Payout Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition ${
              activeTab === 'contests'
                ? 'bg-[#d4af37] text-gray-950 shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🏆 Weekly Contests (1–14)
          </button>
        </div>
      </div>

      {/* PAYOUTS TAB */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          {payoutMessage && (
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-700 text-sm font-medium text-emerald-400">
              {payoutMessage}
            </div>
          )}

          {/* Live Total Calculator Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#121824] border border-[#d4af37]/40 shadow-inner">
              <span className="text-[10px] font-mono text-gray-400 block uppercase">Calculated Total Purse</span>
              <span className="text-2xl font-black text-[#d4af37] font-mono">${calculatedTotalPurse}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#121824] border border-gray-800 shadow-inner">
              <span className="text-[10px] font-mono text-gray-400 block uppercase">Playoff Pool (1st–4th + TB)</span>
              <span className="text-2xl font-black text-white font-mono">${calculatedPlayoffPool}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#121824] border border-gray-800 shadow-inner">
              <span className="text-[10px] font-mono text-gray-400 block uppercase">Weekly Contests Pool</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">${calculatedWeeklyPool}</span>
            </div>
          </div>

          {/* Payout Tiers Form */}
          <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Prize Tier Allocations</h2>
                <p className="text-xs text-gray-400">
                  Update any payout amount or description. All changes immediately sync to the public Contests &amp; Payouts page.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetPayoutsToDefault}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white text-xs font-mono transition"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {payouts.map((tier, idx) => (
                <div
                  key={tier.place}
                  className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                >
                  <div className="md:col-span-3">
                    <span className="text-xs font-bold text-white block">{tier.place}</span>
                    <span className="text-[10px] font-mono uppercase text-[#d4af37]">{tier.tag}</span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-mono text-gray-400 block mb-1">Prize ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={tier.amount}
                        onChange={(e) => updatePayoutField(idx, 'amount', e.target.value)}
                        className="w-full pl-7 pr-3 py-2 bg-black/60 border border-gray-800 rounded-lg text-sm font-mono font-bold text-white focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-[10px] uppercase font-mono text-gray-400 block mb-1">Custom Label / Sub</label>
                    <input
                      type="text"
                      value={tier.label || `$${tier.amount}`}
                      onChange={(e) => updatePayoutField(idx, 'label', e.target.value)}
                      placeholder="$200"
                      className="w-full px-3 py-2 bg-black/60 border border-gray-800 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[10px] uppercase font-mono text-gray-400 block mb-1">Description</label>
                    <input
                      type="text"
                      value={tier.description || ''}
                      onChange={(e) => updatePayoutField(idx, 'description', e.target.value)}
                      placeholder="Prize description..."
                      className="w-full px-3 py-2 bg-black/60 border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
              <span className="text-xs text-gray-400 font-mono">
                Total Allocated: <strong className="text-[#d4af37]">${calculatedTotalPurse}</strong>
              </span>

              <button
                type="button"
                onClick={saveAllPayouts}
                disabled={savingPayouts}
                className="bg-[#d4af37] text-gray-950 font-bold px-6 py-2.5 rounded-xl hover:bg-[#e6c24d] transition shadow-lg disabled:opacity-50 text-sm"
              >
                {savingPayouts ? 'Saving Changes...' : 'Save Payout Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTESTS TAB */}
      {activeTab === 'contests' && (
        <div className="space-y-6">
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
                      placeholder="e.g. 28.4 pts"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span>Winning Player(s) {c.is_player_contest ? '⭐ (Player-Specific Challenge)' : '(Optional)'}</span>
                      {c.is_player_contest && (
                        <span className="text-[11px] text-[#d4af37] font-mono font-bold">Player-Specific Challenge</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={c.winner_player || ''}
                      onChange={(e) => updateContest(c.week_number, 'winner_player', e.target.value)}
                      placeholder="e.g. Kenneth Walker (RB - KC) or Justin Jefferson & Ja'Marr Chase"
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
      )}
    </div>
  );
}
