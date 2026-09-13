'use client';

import { useState, useEffect } from 'react';
import AlertsModal from './AlertsModal';

export default function FirstVisitAlertPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Only run in client browser
    if (typeof window === 'undefined') return;

    try {
      const promptSeen = localStorage.getItem('crffl_alert_prompt_seen');
      const alreadySubscribed = localStorage.getItem('crffl_alert_pref');

      // If visitor has already seen the prompt or subscribed, don't show
      if (promptSeen || alreadySubscribed) {
        return;
      }

      // Show after a gentle 2.5 second delay on first visit
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2500);

      return () => clearTimeout(timer);
    } catch (_) {}
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('crffl_alert_prompt_seen', 'true');
    } catch (_) {}
    setIsVisible(false);
  };

  const handleOpenAlerts = () => {
    try {
      localStorage.setItem('crffl_alert_prompt_seen', 'true');
    } catch (_) {}
    setIsVisible(false);
    setModalOpen(true);
  };

  if (!isVisible && !modalOpen) return null;

  return (
    <>
      {isVisible && (
        <div
          role="dialog"
          aria-live="polite"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-full animate-slideUp"
        >
          <div className="relative rounded-2xl bg-[#121824]/95 backdrop-blur-md border border-[#d4af37]/50 p-5 sm:p-6 shadow-2xl shadow-black/80 space-y-3.5">
            {/* Top Bar with Badge & Dismiss */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#d4af37]" />
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#d4af37] bg-[#d4af37]/15 px-2 py-0.5 rounded border border-[#d4af37]/30">
                  CRFFL Dispatch Wire
                </span>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-7 h-7 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition text-xs font-bold"
                aria-label="Dismiss alert prompt"
              >
                ✕
              </button>
            </div>

            {/* Title & Body */}
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Never Miss a Breaking Dispatch</span>
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Stay updated with instant browser push notifications, email, or text alerts for weekly columnist articles, Wednesday power rankings, and wager payouts.
              </p>
            </div>

            {/* Category Badges */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-[10px] text-gray-300 bg-black/50 px-2 py-0.5 rounded border border-gray-800">
                ⚡ Push Alerts
              </span>
              <span className="text-[10px] text-gray-300 bg-black/50 px-2 py-0.5 rounded border border-gray-800">
                📰 Columnist Beats
              </span>
              <span className="text-[10px] text-gray-300 bg-black/50 px-2 py-0.5 rounded border border-gray-800">
                📊 Power Rankings
              </span>
              <span className="text-[10px] text-gray-300 bg-black/50 px-2 py-0.5 rounded border border-gray-800">
                💰 Bet Payouts
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleOpenAlerts}
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c24d] hover:brightness-110 text-gray-950 font-black text-xs transition shadow-lg text-center"
              >
                <span>Enable Alerts & Push →</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-3 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-xs font-semibold transition"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Alerts Modal */}
      <AlertsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

