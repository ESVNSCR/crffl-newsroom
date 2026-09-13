'use client';

import { useState, useEffect } from 'react';

const MANAGERS_LIST = [
  { name: 'Eric', team: 'Rebel Scum' },
  { name: 'Corey', team: 'Team CoreyCash' },
  { name: 'Mike F.', team: 'Stars & Stripes' },
  { name: 'KC', team: 'Shortbus Superstars' },
  { name: 'Ed', team: 'Team RaiderRose510' },
  { name: 'Randy', team: 'Generic Football Team' },
  { name: 'Jeff', team: 'Hickory Huskers' },
  { name: 'Marcus', team: 'Team Killa MC' },
  { name: 'Mike M.', team: 'Moore Better' },
  { name: 'Pam', team: 'Team GardenGoddess' },
  { name: 'Other', team: 'League Fan / Observer' },
];

const CARRIERS = [
  { id: 'verizon', label: 'Verizon' },
  { id: 'tmobile', label: 'T-Mobile / Mint' },
  { id: 'att', label: 'AT&T / Cricket' },
  { id: 'sprint', label: 'Sprint / Boost' },
  { id: 'uscellular', label: 'US Cellular' },
  { id: 'other', label: 'Other Carrier' },
];

export default function AlertsModal({ isOpen, onClose }) {
  const [managerName, setManagerName] = useState('');
  const [channelPreference, setChannelPreference] = useState('both'); // 'both', 'email', 'sms'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState('verizon');

  // Notification Selectors
  const [notifyArticles, setNotifyArticles] = useState(true);
  const [notifyRankings, setNotifyRankings] = useState(true);
  const [notifyNewBets, setNotifyNewBets] = useState(true);
  const [notifyPayouts, setNotifyPayouts] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Auto-fill from localStorage if previously configured
    try {
      const saved = localStorage.getItem('crffl_alert_pref');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.managerName) setManagerName(parsed.managerName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.carrier) setCarrier(parsed.carrier);
        if (parsed.channelPreference) setChannelPreference(parsed.channelPreference);
        if (typeof parsed.notifyArticles === 'boolean') setNotifyArticles(parsed.notifyArticles);
        if (typeof parsed.notifyRankings === 'boolean') setNotifyRankings(parsed.notifyRankings);
        if (typeof parsed.notifyNewBets === 'boolean') setNotifyNewBets(parsed.notifyNewBets);
        if (typeof parsed.notifyPayouts === 'boolean') setNotifyPayouts(parsed.notifyPayouts);
      }
    } catch (_) {}

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!managerName) {
      setError('Please select your manager name.');
      return;
    }

    if (channelPreference !== 'sms' && !email) {
      setError('Please enter your email address.');
      return;
    }

    if (channelPreference !== 'email' && !phone) {
      setError('Please enter your mobile phone number for text alerts.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_name: managerName,
          email: channelPreference !== 'sms' ? email : '',
          phone: channelPreference !== 'email' ? phone : '',
          carrier: channelPreference !== 'email' ? carrier : '',
          channel_preference: channelPreference,
          notify_articles: notifyArticles,
          notify_rankings: notifyRankings,
          notify_new_bets: notifyNewBets,
          notify_payouts: notifyPayouts,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save alert preferences.');
      }

      // Save to localStorage for convenience
      try {
        localStorage.setItem(
          'crffl_alert_pref',
          JSON.stringify({
            managerName,
            email,
            phone,
            carrier,
            channelPreference,
            notifyArticles,
            notifyRankings,
            notifyNewBets,
            notifyPayouts,
          })
        );
      } catch (_) {}

      setSuccessMessage(data.message || 'Preferences saved successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-[#121824] border border-[#d4af37]/30 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0d121c]/90">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-[#d4af37] bg-[#d4af37]/10 px-2.5 py-0.5 rounded border border-[#d4af37]/30">
              League Dispatch Wire
            </span>
            <span className="text-xs text-gray-300 font-bold">Email & Text Alerts</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition text-sm font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Franchise Notifications
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Stay in the loop with instant email or SMS text alerts for new columnist dispatches, Wednesday power rankings releases, live sportsbook lines, and wager payouts.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 font-medium">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 font-bold flex items-center gap-2 animate-fadeIn">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Manager Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono block">
              1. Select Your Manager / Franchise
            </label>
            <select
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full bg-gray-900/90 border border-gray-700 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-[#d4af37]"
            >
              <option value="">-- Choose Your Franchise --</option>
              {MANAGERS_LIST.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.team})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Channel Preference Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono block">
              2. Delivery Channels
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'both', label: 'Email & Text' },
                { id: 'email', label: 'Email Only' },
                { id: 'sms', label: 'Text (SMS) Only' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannelPreference(c.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                    channelPreference === c.id
                      ? 'bg-[#d4af37] text-gray-950 border-[#d4af37] shadow'
                      : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Contact Inputs */}
          <div className="space-y-4">
            {channelPreference !== 'sms' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. manager@gmail.com"
                  className="w-full bg-gray-900/90 border border-gray-700 rounded-xl p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            )}

            {channelPreference !== 'email' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Mobile Phone (for SMS)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 480-209-7790"
                    className="w-full bg-gray-900/90 border border-gray-700 rounded-xl p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Mobile Carrier
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full bg-gray-900/90 border border-gray-700 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-[#d4af37]"
                  >
                    {CARRIERS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 4. Alert Topic Selectors */}
          <div className="space-y-2.5 pt-2 border-t border-gray-800">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono block">
              3. Choose Your Alert Topics
            </span>

            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
                <input
                  type="checkbox"
                  checked={notifyArticles}
                  onChange={(e) => setNotifyArticles(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] border-gray-700 bg-gray-800"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    New Columnist Dispatches & Breaking News
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Alerts when Marty Sullivan, Buck Callahan, or Chloe Carmichael drop new articles.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
                <input
                  type="checkbox"
                  checked={notifyRankings}
                  onChange={(e) => setNotifyRankings(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] border-gray-700 bg-gray-800"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Apex Power Rankings Releases
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Alerts every Wednesday when Dr. Vance publishes the official Top 10 rankings.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
                <input
                  type="checkbox"
                  checked={notifyNewBets}
                  onChange={(e) => setNotifyNewBets(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] border-gray-700 bg-gray-800"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    New Sportsbook Lines & Prop Bets Posted
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Alerts when fresh point spreads, over/unders, and arcade wagers open for action.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
                <input
                  type="checkbox"
                  checked={notifyPayouts}
                  onChange={(e) => setNotifyPayouts(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] border-gray-700 bg-gray-800"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Wager Payouts & Settlement Notices
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Alerts when weekly contests and sports wagers settle and bankrolls are credited.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e6c24d] text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving Preferences...' : 'Save Alert Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
