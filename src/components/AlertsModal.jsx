'use client';

import { useState, useEffect } from 'react';
import { VAPID_PUBLIC_KEY } from '@/lib/pushConfig';

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

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function AlertsModal({ isOpen, onClose }) {
  const [managerName, setManagerName] = useState('');
  const [channelPreference, setChannelPreference] = useState('both'); // 'both', 'email', 'sms'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState('verizon');

  // Push Notifications State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [pushError, setPushError] = useState('');
  const [pushSubscription, setPushSubscription] = useState(null);

  // Notification Category Selectors
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

    // Check device push notification support & registration
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    ) {
      setPushSupported(true);
      setPushPermission(Notification.permission);

      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setPushSubscribed(true);
            setPushSubscription(sub);
          }
        })
        .catch((err) => {
          console.warn('Service worker registration check error:', err);
        });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Enabling Web Push on this device
  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushError('');
    setPushMessage('');

    try {
      if (!pushSupported) {
        throw new Error('Push notifications are not supported in this browser.');
      }

      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        throw new Error(
          'Notification permission was not granted. Please check your browser or site settings.'
        );
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      setPushSubscription(sub);
      setPushSubscribed(true);

      // Save to backend database and send welcome push
      const res = await fetch('/api/alerts/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          manager_name: managerName || 'Fan / Observer',
          notify_articles: notifyArticles,
          notify_rankings: notifyRankings,
          notify_new_bets: notifyNewBets,
          notify_payouts: notifyPayouts,
          send_welcome: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to register push subscription.');
      }

      setPushMessage('Push notifications enabled! A welcome test notification has been sent.');
    } catch (err) {
      console.error('Push enable error:', err);
      setPushError(err.message || 'Failed to enable push notifications.');
    } finally {
      setPushLoading(false);
    }
  };

  // Send a test push notification to this device
  const handleSendTestPush = async () => {
    if (!pushSubscription) return;
    setPushLoading(true);
    setPushError('');
    setPushMessage('');

    try {
      const res = await fetch('/api/alerts/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
          title: 'CRFFL Times-Herald Dispatch Alert',
          body: 'This is a live test verifying your desktop / mobile push notification delivery!',
          url: '/',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to dispatch test notification.');
      }

      setPushMessage('Test push dispatched! Check your device notification tray.');
    } catch (err) {
      setPushError(err.message || 'Failed to send test push.');
    } finally {
      setPushLoading(false);
    }
  };

  // Main Submit handler (saves email/SMS and syncs push if active)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!managerName) {
      setError('Please select your manager name.');
      return;
    }

    if (channelPreference !== 'sms' && !email && !pushSubscribed) {
      setError('Please enter your email address or enable push notifications.');
      return;
    }

    if (channelPreference !== 'email' && !phone && !pushSubscribed) {
      setError('Please enter your mobile phone number for text alerts or enable push notifications.');
      return;
    }

    setLoading(true);
    try {
      // 1. Save Email & SMS Subscriptions
      if (email || phone) {
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
      }

      // 2. If push subscription is active on device, update its preferences too
      if (pushSubscription) {
        await fetch('/api/alerts/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: pushSubscription.toJSON(),
            manager_name: managerName,
            notify_articles: notifyArticles,
            notify_rankings: notifyRankings,
            notify_new_bets: notifyNewBets,
            notify_payouts: notifyPayouts,
            send_welcome: false,
          }),
        });
      }

      // Save to localStorage
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

      setSuccessMessage('Alert preferences successfully saved!');
      setTimeout(() => {
        onClose();
      }, 1800);
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
            <span className="text-xs text-gray-300 font-bold">Alert Preferences</span>
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
              Get instant dispatches via web push notifications, email, or SMS whenever columnist articles drop, power rankings are published, or sportsbook bets settle.
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

          {/* 2. Device Push Notifications Section (Desktop & Mobile) */}
          <div className="rounded-xl bg-gradient-to-br from-[#161d2b] to-[#0e1420] border border-[#d4af37]/40 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Browser Push Notifications
                </span>
              </div>

              {pushSubscribed ? (
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active on This Device
                </span>
              ) : pushPermission === 'denied' ? (
                <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                  Blocked in Browser
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                  Desktop & Mobile Ready
                </span>
              )}
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Receive native lock screen banners, phone notifications, and desktop alert popups instantly without having to check your email or text messages.
            </p>

            {pushMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 font-semibold flex items-center gap-2">
                <span>✓</span>
                <span>{pushMessage}</span>
              </div>
            )}

            {pushError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                {pushError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!pushSubscribed ? (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] hover:brightness-110 text-gray-950 font-black text-xs transition shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span>{pushLoading ? 'Connecting Push Service...' : 'Enable Push on This Device'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={pushLoading}
                  className="py-2 px-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-[#d4af37] border border-[#d4af37]/40 font-bold text-xs transition shadow-sm flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>{pushLoading ? 'Sending Alert...' : 'Send Test Notification to Device'}</span>
                </button>
              )}
            </div>

            {/* iOS Safari Tip */}
            <div className="text-[11px] text-gray-400 bg-black/40 p-2.5 rounded-lg border border-gray-800 space-y-1">
              <span className="font-semibold text-gray-300 block">Mobile Note (iOS / iPhone):</span>
              <p className="leading-normal">
                To receive web push alerts on iPhone, open <span className="text-[#d4af37] font-mono">crffl.org</span> in Safari, tap the <span className="text-white font-semibold">Share icon (square with arrow)</span>, and select <span className="text-white font-semibold">'Add to Home Screen'</span>.
              </p>
            </div>
          </div>

          {/* 3. Channel Preference Selector (Email & SMS) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono block">
              2. Additional Email & Text Delivery
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

          {/* 4. Contact Inputs */}
          <div className="space-y-4">
            {channelPreference !== 'sms' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Email Address
                </label>
                <input
                  id="alert-email"
                  name="email"
                  type="email"
                  autoComplete="email"
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
                    id="alert-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
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

          {/* 5. Alert Topic Selectors */}
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
