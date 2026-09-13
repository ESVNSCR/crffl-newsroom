'use client';

import { useState, useEffect } from 'react';

export default function AdminRankingsPage() {
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [teams, setTeams] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/rankings')
      .then((r) => r.json())
      .then((data) => {
        if (data.rosters) {
          setCurrentWeek(data.currentWeek || 1);
          const rosterList = Object.values(data.rosters);

          if (data.submission?.team_order && Array.isArray(data.submission.team_order)) {
            // Restore previous submission order
            setTeams(data.submission.team_order);
            setNotes(data.submission.notes || '');
          } else {
            // Default sort by win% then PF
            const sorted = [...rosterList].sort((a, b) => {
              const winPctA = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0));
              const winPctB = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0));
              if (winPctB !== winPctA) return winPctB - winPctA;
              return (b.pointsFor || 0) - (a.pointsFor || 0);
            });

            setTeams(
              sorted.map((t, idx) => ({
                rank: idx + 1,
                username: t.username,
                teamName: t.teamName,
                managerName: t.managerName,
                record: t.record,
                pointsFor: t.pointsFor,
                logoUrl: t.logoUrl,
              }))
            );
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleRankChange = (index, newRank) => {
    const targetRank = parseInt(newRank, 10);
    if (isNaN(targetRank) || targetRank < 1 || targetRank > 10) return;

    const newTeams = [...teams];
    const item = newTeams.splice(index, 1)[0];
    newTeams.splice(targetRank - 1, 0, item);

    // Re-index ranks
    const updated = newTeams.map((t, i) => ({ ...t, rank: i + 1 }));
    setTeams(updated);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newTeams = [...teams];
    const temp = newTeams[index - 1];
    newTeams[index - 1] = newTeams[index];
    newTeams[index] = temp;
    setTeams(newTeams.map((t, i) => ({ ...t, rank: i + 1 })));
  };

  const moveDown = (index) => {
    if (index === teams.length - 1) return;
    const newTeams = [...teams];
    const temp = newTeams[index + 1];
    newTeams[index + 1] = newTeams[index];
    newTeams[index] = temp;
    setTeams(newTeams.map((t, i) => ({ ...t, rank: i + 1 })));
  };

  const saveSubmission = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_number: currentWeek,
          team_order: teams,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Baseline rankings saved successfully! Dr. Vance will utilize these Wednesday at 2:00 PM.');
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
    return <div className="p-12 text-center text-gray-400">Loading league data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="border-b border-gray-800 pb-5">
        <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37]">
          Commissioner Portal
        </span>
        <h1 className="text-3xl font-extrabold text-white">
          Dr. Vance Baseline Submission • Week {currentWeek}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Set your custom team order (1 to 10) for Dr. Vance to calibrate his regression models before Wednesday at 2:00 PM.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-700 text-sm font-medium">
          {message}
        </div>
      )}

      {/* Team Order List */}
      <div className="space-y-3">
        {teams.map((team, idx) => (
          <div
            key={team.username}
            className="flex items-center justify-between p-4 rounded-xl bg-[#121824] border border-gray-800 hover:border-gray-700 transition"
          >
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-black text-white/80 w-10 text-center">
                #{team.rank}
              </span>
              {team.logoUrl && (
                <div className="w-11 h-11 overflow-hidden rounded-lg bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <img
                    src={team.logoUrl}
                    alt={team.teamName}
                    className="w-full h-full object-cover scale-105"
                  />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">{team.teamName}</h3>
                <span className="text-xs text-gray-400">
                  {team.managerName} • Record: {team.record} • {team.pointsFor} PF
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-200"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === teams.length - 1}
                className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-200"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Notes Field */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-200">
          Commissioner Notes / Narrative Angles for Dr. Vance (Optional)
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Mention Randy's lucky comeback win, or point out how Corey's bench outscored his starters..."
          className="w-full bg-[#121824] border border-gray-800 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={saveSubmission}
          disabled={saving}
          className="bg-[#d4af37] text-gray-950 font-bold px-6 py-3 rounded-xl hover:bg-[#e6c24d] transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : `Submit Baseline for Week ${currentWeek}`}
        </button>
      </div>
    </div>
  );
}

