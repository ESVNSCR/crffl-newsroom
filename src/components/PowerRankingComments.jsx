'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatDatePacific } from '@/lib/formatters';

const MANAGERS_OPTIONS = [
  { value: 'Corey', label: 'Corey (Team CoreyCash)' },
  { value: 'Ed', label: 'Ed (Team RaiderRose510)' },
  { value: 'Eric', label: 'Eric (Rebel Scum)' },
  { value: 'Jeff', label: 'Jeff (Hickory Huskers)' },
  { value: 'KC', label: 'KC (Shortbus Superstars)' },
  { value: 'Marcus', label: 'Marcus (Team Killa MC)' },
  { value: 'Mike F.', label: 'Mike F. (Stars & Stripes)' },
  { value: 'Mike M.', label: 'Mike M. (Moore Better)' },
  { value: 'Pam', label: 'Pam (Team GardenGoddess)' },
  { value: 'Randy', label: 'Randy (Generic Football Team)' },
  { value: 'The Commissioner', label: 'The Commissioner (Office of the Commish)' }
];

export default function PowerRankingComments({ rankingId, weekNumber }) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authenticated state / manager credentials
  const [managerName, setManagerName] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Top-level comment state
  const [commentText, setCommentText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, managerName }
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');

  // Load cached manager credentials from sessionStorage on mount
  useEffect(() => {
    try {
      const cachedManager =
        sessionStorage.getItem('crffl_manager_name') ||
        sessionStorage.getItem('crffl_auth_manager');
      const cachedPin =
        sessionStorage.getItem('crffl_manager_pin') ||
        sessionStorage.getItem('crffl_auth_pin');
      if (cachedManager) setManagerName(cachedManager);
      if (cachedPin) setPin(cachedPin);
    } catch {
      // ignore
    }
  }, []);

  // Fetch comments for this week's power rankings
  const fetchComments = useCallback(async () => {
    if (!rankingId && !weekNumber) return;
    try {
      const queryParams = new URLSearchParams();
      if (rankingId) queryParams.set('ranking_id', rankingId);
      if (weekNumber) queryParams.set('week_number', String(weekNumber));

      const res = await fetch(`/api/comments?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to load power rankings comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [rankingId, weekNumber]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Group comments into root comments and their replies
  const { rootComments, repliesByParent } = useMemo(() => {
    const roots = [];
    const replies = {};
    comments.forEach((c) => {
      if (c.parent_id) {
        if (!replies[c.parent_id]) replies[c.parent_id] = [];
        replies[c.parent_id].push(c);
      } else {
        roots.push(c);
      }
    });
    return { rootComments: roots, repliesByParent: replies };
  }, [comments]);

  // Cache credentials helper
  const cacheCredentials = (mgr, p) => {
    try {
      sessionStorage.setItem('crffl_manager_name', mgr);
      sessionStorage.setItem('crffl_manager_pin', p.trim());
    } catch {
      // ignore
    }
  };

  // Submit top-level comment
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!managerName) {
      setErrorMsg('Please select your manager identity.');
      return;
    }

    if (!pin || pin.trim().length === 0) {
      setErrorMsg('Please enter your 4-digit security PIN to authenticate.');
      return;
    }

    if (!commentText.trim()) {
      setErrorMsg('Comment text cannot be empty.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ranking_id: rankingId,
          week_number: weekNumber,
          target_type: 'power_ranking',
          manager_name: managerName,
          pin: pin.trim(),
          comment: commentText.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCommentText('');
        setSuccessMsg('Your testimony has been entered into the record!');
        cacheCredentials(managerName, pin);
        await fetchComments();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to post comment. Check your security PIN.');
      }
    } catch {
      setErrorMsg('Network transmission failure. Mainframe unreachable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit reply to an existing comment
  const handleReplySubmit = async (e, parentId) => {
    e.preventDefault();
    setReplyError('');

    if (!managerName) {
      setReplyError('Please select your manager identity.');
      return;
    }

    if (!pin || pin.trim().length === 0) {
      setReplyError('Please enter your 4-digit security PIN to authenticate.');
      return;
    }

    if (!replyText.trim()) {
      setReplyError('Reply cannot be empty.');
      return;
    }

    setIsSubmittingReply(true);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ranking_id: rankingId,
          week_number: weekNumber,
          target_type: 'power_ranking',
          parent_id: parentId,
          manager_name: managerName,
          pin: pin.trim(),
          comment: replyText.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setReplyText('');
        setReplyingTo(null);
        cacheCredentials(managerName, pin);
        await fetchComments();
      } else {
        setReplyError(data.error || 'Failed to post reply. Check your security PIN.');
      }
    } catch {
      setReplyError('Network transmission failure.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId) => {
    if (!confirm('Are you sure you want to retract this comment from the record?')) return;
    try {
      const res = await fetch(
        `/api/comments?id=${encodeURIComponent(commentId)}&manager=${encodeURIComponent(managerName)}&pin=${encodeURIComponent(pin)}&type=ranking`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
      } else {
        alert(data.error || 'Could not delete comment.');
      }
    } catch {
      alert('Failed to connect to server.');
    }
  };

  const getManagerBadge = (name) => {
    const isCommish = (name || '').toLowerCase().includes('commissioner');
    if (isCommish) {
      return {
        label: '👑 Office of the Commissioner',
        bg: 'bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]',
      };
    }
    return {
      label: `👤 ${name}`,
      bg: 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300',
    };
  };

  // Render an inline reply composer
  const renderReplyForm = (targetComment) => {
    return (
      <form
        onSubmit={(e) => handleReplySubmit(e, targetComment.id)}
        className="mt-3 p-3.5 rounded-lg bg-[#0e1422] border border-[#d4af37]/40 shadow-inner space-y-3"
      >
        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/10">
          <span className="font-mono text-[#d4af37] font-bold flex items-center gap-1.5">
            <span>↩</span> Replying to <strong className="text-white">{targetComment.manager_name}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setReplyingTo(null);
              setReplyText('');
              setReplyError('');
            }}
            className="text-gray-400 hover:text-white text-xs underline"
          >
            Cancel
          </button>
        </div>

        {replyError && (
          <div className="p-2 rounded bg-red-950/50 border border-red-500/50 text-red-300 text-xs font-mono">
            ⚠️ {replyError}
          </div>
        )}

        {/* Manager ID & PIN (if not cached) */}
        {(!managerName || !pin) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-mono text-gray-300 mb-1">YOUR IDENTITY:</label>
              <select
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-[#121824] border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
              >
                <option value="">-- SELECT IDENTITY --</option>
                {MANAGERS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-300 mb-1">SECURITY PIN:</label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-digit PIN"
                className="w-full bg-[#121824] border border-gray-700 rounded px-2 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        {managerName && pin && (
          <div className="text-[11px] text-gray-400 font-mono flex items-center justify-between">
            <span>
              Replying as: <strong className="text-cyan-300">{managerName}</strong>
            </span>
            <span className="text-gray-500">{replyText.length}/1000 chars</span>
          </div>
        )}

        <textarea
          rows={2}
          maxLength={1000}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={`Write your counter-argument to ${targetComment.manager_name}...`}
          className="w-full bg-[#121824] border border-gray-700 focus:border-[#d4af37] rounded p-2.5 text-xs sm:text-sm text-gray-100 placeholder-gray-500 outline-none resize-y"
          autoFocus
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setReplyingTo(null);
              setReplyText('');
              setReplyError('');
            }}
            className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
          >
            Dismiss
          </button>
          <button
            type="submit"
            disabled={isSubmittingReply || !replyText.trim() || !managerName || !pin}
            className="px-4 py-1.5 rounded bg-[#d4af37] hover:bg-[#c49f2f] text-gray-950 font-bold text-xs transition disabled:opacity-40"
          >
            {isSubmittingReply ? 'Transmitting...' : 'Post Reply →'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <section id="comments" className="glass-panel p-6 sm:p-10 border border-white/20 shadow-2xl space-y-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold text-[#d4af37] bg-[#d4af37]/10 px-2.5 py-0.5 rounded border border-[#d4af37]/30">
              Cross-Examination Desk
            </span>
            <span className="text-xs font-mono text-gray-400">
              Week {weekNumber || 1} Power Rankings
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>💬 Manager Inquest & Debate</span>
            <span className="text-base sm:text-lg font-normal text-[#d4af37] font-mono">
              ({comments.length})
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-300">
            Contest Dr. Vance&apos;s regression models, dispute your ranking, or call out fellow managers.
          </p>
        </div>

        <span className="text-[11px] text-gray-400 font-mono italic">
          PIN-authenticated manager responses & rebuttals
        </span>
      </div>

      {/* Comment Stream */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-10 text-center text-gray-400 text-xs font-mono animate-pulse">
            Retrieving manager testimony for Week {weekNumber}...
          </div>
        ) : rootComments.length === 0 ? (
          <div className="p-8 sm:p-10 rounded-2xl bg-black/40 border border-white/5 text-center space-y-3">
            <div className="text-3xl">📊</div>
            <div className="text-base font-bold text-gray-200">
              No manager testimony filed yet for Week {weekNumber}.
            </div>
            <div className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
              Did Dr. Vance disrespect your roster? Is Rebel Scum&apos;s apex ranking unjustified? Step up to the podium and enter your rebuttal into the permanent record.
            </div>
          </div>
        ) : (
          rootComments.map((root) => {
            const rootBadge = getManagerBadge(root.manager_name);
            const isRootAuthor =
              managerName && root.manager_name.toLowerCase() === managerName.toLowerCase();
            const isCommish =
              managerName && managerName.toLowerCase().includes('commissioner');
            const replies = repliesByParent[root.id] || [];
            const isReplyingToThisRoot = replyingTo?.commentId === root.id;

            return (
              <div key={root.id} className="space-y-2.5">
                {/* Root Comment Card */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#0b0f19] border border-white/10 hover:border-white/20 transition space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${rootBadge.bg}`}
                      >
                        {rootBadge.label}
                      </span>
                      <span
                        className="text-[11px] text-gray-400 font-mono"
                        suppressHydrationWarning
                      >
                        {formatDatePacific(root.created_at, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo({
                            commentId: root.id,
                            managerName: root.manager_name,
                          });
                          setReplyText('');
                          setReplyError('');
                        }}
                        className="text-[11px] text-[#d4af37] hover:text-[#f3d168] transition font-semibold flex items-center gap-1"
                      >
                        <span>↩</span> Reply
                      </button>

                      {(isRootAuthor || isCommish) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(root.id)}
                          className="text-[11px] text-red-400 hover:text-red-300 transition underline font-mono"
                          title="Retract comment"
                        >
                          Retract
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Body */}
                  <p className="text-xs sm:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {root.comment}
                  </p>
                </div>

                {/* Inline Reply Form for Root Comment */}
                {isReplyingToThisRoot && renderReplyForm(root)}

                {/* Nested Replies Stream */}
                {replies.length > 0 && (
                  <div className="ml-4 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-[#d4af37]/40 space-y-2.5">
                    {replies.map((reply) => {
                      const replyBadge = getManagerBadge(reply.manager_name);
                      const isReplyAuthor =
                        managerName &&
                        reply.manager_name.toLowerCase() === managerName.toLowerCase();
                      const isReplyingToThisReply = replyingTo?.commentId === reply.id;

                      return (
                        <div key={reply.id} className="space-y-2">
                          <div className="p-3.5 sm:p-4 rounded-xl bg-[#090d16] border border-white/5 hover:border-white/15 transition space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border ${replyBadge.bg}`}
                                >
                                  {replyBadge.label}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  ↳ reply to @{root.manager_name}
                                </span>
                                <span
                                  className="text-[10px] text-gray-400 font-mono"
                                  suppressHydrationWarning
                                >
                                  {formatDatePacific(reply.created_at, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo({
                                      commentId: root.id,
                                      managerName: reply.manager_name,
                                    });
                                    setReplyText('');
                                    setReplyError('');
                                  }}
                                  className="text-[11px] text-[#d4af37] hover:text-[#f3d168] transition font-semibold flex items-center gap-1"
                                >
                                  <span>↩</span> Reply
                                </button>

                                {(isReplyAuthor || isCommish) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(reply.id)}
                                    className="text-[11px] text-red-400 hover:text-red-300 transition underline font-mono"
                                    title="Retract reply"
                                  >
                                    Retract
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                              {reply.comment}
                            </p>
                          </div>

                          {/* Inline Reply Form for Nested Reply */}
                          {isReplyingToThisReply && renderReplyForm(reply)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Main Top-Level Comment Submission Box */}
      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-6 rounded-2xl bg-[#0b0f19] border border-[#d4af37]/30 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
          <span className="text-xs font-bold text-white tracking-wide uppercase font-mono flex items-center gap-1.5">
            <span>✍️</span> Enter Official Manager Testimony
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            {commentText.length}/1000 chars
          </span>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-red-950/50 border border-red-500/50 text-red-300 text-xs font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 rounded bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs font-mono">
            ✓ {successMsg}
          </div>
        )}

        {/* Identity & PIN Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-gray-300 font-semibold mb-1">
              MANAGER IDENTITY:
            </label>
            <select
              value={managerName}
              onChange={(e) => {
                setManagerName(e.target.value);
                setErrorMsg('');
              }}
              className="w-full bg-[#121824] border border-gray-700 focus:border-[#d4af37] rounded-lg px-3 py-2 text-xs text-white outline-none cursor-pointer"
            >
              <option value="">-- SELECT YOUR IDENTITY --</option>
              {MANAGERS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono text-gray-300 font-semibold">
                SECURITY PIN:
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[10px] text-gray-400 hover:text-gray-200 underline"
              >
                {showPin ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPin ? 'text' : 'password'}
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErrorMsg('');
              }}
              placeholder="4-digit PIN"
              className="w-full bg-[#121824] border border-gray-700 focus:border-[#d4af37] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
            />
          </div>
        </div>

        {/* Textarea */}
        <div>
          <textarea
            rows={3}
            maxLength={1000}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={`Challenge Dr. Vance's regression model, dispute your Week ${weekNumber || 1} ranking, or call out rivals...`}
            className="w-full bg-[#121824] border border-gray-700 focus:border-[#d4af37] rounded-lg p-3 text-xs sm:text-sm text-gray-100 placeholder-gray-500 outline-none resize-y"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <span className="text-[11px] text-gray-500 font-mono">
            PIN authentication prevents impersonation.
          </span>

          <button
            type="submit"
            disabled={isSubmitting || !managerName || !pin || !commentText.trim()}
            className="px-5 py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#c49f2f] text-gray-950 font-bold text-xs sm:text-sm transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin inline-block">↻</span>
                <span>Recording...</span>
              </>
            ) : (
              <span>Submit Testimony →</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

