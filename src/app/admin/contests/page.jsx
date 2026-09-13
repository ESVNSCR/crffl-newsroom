'use client';

import { useState, useEffect } from 'react';

export default function AdminContestsPage() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/contests')
      .then((r) => r.json())
      .then((data) => {
        const list = data.contests || [];
        // Fill default 1-14 weeks if empty
        const map = {};
        list.forEach((c) => {
          map[c.week_number] = c;
        });

        const fullList = [];
        for (let w = 1; w <= 14; w++) {
          fullList.push(
            map[w] || {
              week_number: w,
              contest_name: `Week ${w} Challenge`,
              description: '',
              prize: '$10',
              winner_manager: '',
              winner_team: '',
              winning_score: '',
              status: w === 1 ? 'active' : 'upcoming',
            }
          );
        }
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
        setMessage(`✅ Week ${weekNumber} contest saved successfully!`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`❌ Network Error: ${err.message}`);
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
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white">
                Week {c.week_number} Contest Details
              </h2>
              <span className="text-xs uppercase font-mono px-2.5 py-1 rounded bg-gray-900 text-[#d4af37] border border-gray-800">
                Prize: {c.prize || '$10'}
              </span>
            </div>

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
                {saving ? 'Saving...' : `Save Week ${c.week_number} Contest 💾`}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
