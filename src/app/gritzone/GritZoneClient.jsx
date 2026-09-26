'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  MANAGERS_OPTIONS,
  getStoredManagerCredentials,
  setStoredManagerCredentials,
  clearStoredManagerCredentials,
} from '@/lib/managers';
import { COLUMNISTS, REPORTERS_CHAT_LIST } from '@/lib/columnists';

export default function GritZoneClient() {
  // Navigation / View Tabs ('matchups' or 'chat')
  const [activeTab, setActiveTab] = useState('matchups');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Matchups State
  const [matchupsData, setMatchupsData] = useState(null);
  const [matchupsLoading, setMatchupsLoading] = useState(true);
  const [matchupsError, setMatchupsError] = useState(null);
  const [expandedMatchupId, setExpandedMatchupId] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // War Room Chat State
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');

  // Manager Authentication State
  const [authManager, setAuthManager] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginManager, setLoginManager] = useState('Eric');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Reporter Typing & Spoofing State
  const [typingReporter, setTypingReporter] = useState(null);
  const [postAsReporter, setPostAsReporter] = useState(null);
  const typingTimeoutRef = useRef(null);
  const channelRef = useRef(null);

  // Active Managers Presence State
  const [activeManagers, setActiveManagers] = useState([]);
  const [showActivePopover, setShowActivePopover] = useState(false);

  const isCommissioner =
    authManager === 'Eric' ||
    authManager === 'The Commissioner' ||
    Boolean(authManager?.toLowerCase().includes('commissioner'));

  const selectedReporterMeta = (isCommissioner && postAsReporter) ? COLUMNISTS[postAsReporter] : null;

  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // 1. Load credentials from storage on mount
  useEffect(() => {
    const { managerName: storedMgr, pin: storedPin } = getStoredManagerCredentials();
    if (storedMgr && storedPin) {
      setAuthManager(storedMgr);
      setAuthPin(storedPin);
      setLoginManager(storedMgr);
    }
  }, []);

  // 2. Fetch Live Matchups
  const fetchMatchups = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/live-matchups');
      const data = await res.json();
      if (data.success) {
        setMatchupsData(data);
        setMatchupsError(null);
      } else {
        setMatchupsError(data.error || 'Failed to load live matchups');
      }
    } catch (err) {
      setMatchupsError('Network error loading matchups');
    } finally {
      setMatchupsLoading(false);
      if (manual) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
      setCountdown(60);
    }
  }, []);

  // 3. Matchup Countdown & 60s Polling Loop
  useEffect(() => {
    fetchMatchups();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchMatchups();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchMatchups]);

  // 4. Fetch Chat Messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/messages');
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      setChatLoading(false);
    }
  }, []);

  // 5. Chat Realtime Subscription + 8s Polling Fallback
  useEffect(() => {
    fetchMessages();

    // Supabase Realtime channel with Presence tracking
    const channel = supabase
      .channel('gritzone_war_room', {
        config: {
          presence: {
            key: authManager || 'Guest',
          },
        },
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'newsroom_chat_messages' },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // If a reporter reply arrived, clear any typing indicators
          if (newMsg?.sender_type === 'reporter') {
            setTypingReporter(null);
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
          }

          // Increment unread count if user is on matchups tab
          setActiveTab((cur) => {
            if (cur !== 'chat') {
              setUnreadChatCount((c) => c + 1);
            }
            return cur;
          });
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload?.payload) {
          setTypingReporter(payload.payload);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingReporter(null);
          }, 6000);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeMap = new Map();
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p.managerName && p.managerName !== 'Guest') {
              activeMap.set(p.managerName, {
                managerName: p.managerName,
                teamName: p.teamName || '',
                logo: p.logo || '/logos/league.png',
                isCommissioner: Boolean(p.isCommissioner),
              });
            }
          });
        });
        setActiveManagers(Array.from(activeMap.values()));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && authManager) {
          const currentMgrMeta = MANAGERS_OPTIONS.find((m) => m.name === authManager);
          await channel.track({
            managerName: authManager,
            teamName: currentMgrMeta?.team || '',
            logo: currentMgrMeta?.logo || '/logos/league.png',
            isCommissioner: authManager === 'Eric' || authManager === 'The Commissioner',
            onlineAt: new Date().toISOString(),
          }).catch(() => {});
        }
      });

    channelRef.current = channel;

    // Polling fallback
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 8000);

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [fetchMessages]);

  // Scroll chat to bottom when new messages arrive or when reporter is typing
  useEffect(() => {
    if (activeTab === 'chat' && isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingReporter, activeTab, isNearBottom]);

  // Track presence when manager identity updates
  useEffect(() => {
    if (channelRef.current && authManager) {
      const currentMgrMeta = MANAGERS_OPTIONS.find((m) => m.name === authManager);
      channelRef.current
        .track({
          managerName: authManager,
          teamName: currentMgrMeta?.team || '',
          logo: currentMgrMeta?.logo || '/logos/league.png',
          isCommissioner: authManager === 'Eric' || authManager === 'The Commissioner',
          onlineAt: new Date().toISOString(),
        })
        .catch(() => {});
    }
  }, [authManager]);

  // Handle scroll events in chat container
  const handleChatScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom < 100);
  };

  // Switch tabs
  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setUnreadChatCount(0);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  };

  // Login handler
  const handleSaveLogin = (e) => {
    e.preventDefault();
    if (!loginPin || loginPin.trim().length !== 4) {
      setLoginError('PIN must be a 4-digit number.');
      return;
    }
    const cleanPin = loginPin.trim();
    setAuthManager(loginManager);
    setAuthPin(cleanPin);
    setLoginError('');
    setShowLoginModal(false);

    setStoredManagerCredentials(loginManager, cleanPin);
  };

  const handleLogout = () => {
    setAuthManager('');
    setAuthPin('');
    setPostAsReporter(null);
    clearStoredManagerCredentials();
    if (channelRef.current) {
      channelRef.current.untrack().catch(() => {});
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || isSending) return;

    if (!authManager || !authPin) {
      setShowLoginModal(true);
      return;
    }

    const textToSend = chatInput.trim();
    setIsSending(true);
    setChatError('');

    // Optimistic UI insertion
    const currentMgrMeta = MANAGERS_OPTIONS.find((m) => m.name === authManager);
    const activeReporterMeta = (isCommissioner && postAsReporter) ? COLUMNISTS[postAsReporter] : null;
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = activeReporterMeta
      ? {
          id: tempId,
          created_at: new Date().toISOString(),
          sender_type: 'reporter',
          sender_name: activeReporterMeta.name,
          sender_role: activeReporterMeta.chatRole || activeReporterMeta.title || 'Columnist',
          sender_avatar: activeReporterMeta.avatar,
          team_name: 'CRFFL Times-Herald',
          message: textToSend,
          is_pinned: false,
        }
      : {
          id: tempId,
          created_at: new Date().toISOString(),
          sender_type: 'manager',
          sender_name: authManager,
          sender_role: 'CRFFL Manager',
          sender_avatar: currentMgrMeta?.logo || '/logos/league.png',
          team_name: currentMgrMeta?.team || 'CRFFL Franchise',
          message: textToSend,
          is_pinned: false,
        };

    setMessages((prev) => [...prev, optimisticMessage]);
    setChatInput('');

    // Eagerly detect tagged reporter to show typing dots only if NOT manually posting as a reporter
    if (!activeReporterMeta) {
      const lower = textToSend.toLowerCase();
      let taggedReporter = null;
      if (lower.includes('@chloe') || lower.includes('chloe') || lower.includes('carmichael')) {
        taggedReporter = {
          name: 'Chloe Carmichael',
          role: 'The Spin Room',
          avatar: '/reporters/chloe-carmichael-avatar.png',
        };
      } else if (lower.includes('@marcus') || lower.includes('marcus') || lower.includes('vance')) {
        taggedReporter = {
          name: 'Dr. Marcus Vance',
          role: 'Analytics Desk',
          avatar: '/reporters/marcus-vance-avatar.png',
        };
      } else if (lower.includes('@buck') || lower.includes('buck') || lower.includes('callahan')) {
        taggedReporter = {
          name: 'Buck Callahan',
          role: 'The Grit Desk',
          avatar: '/reporters/buck-callahan-avatar.png',
        };
      } else if (lower.includes('@marty') || lower.includes('marty') || lower.includes('sullivan')) {
        taggedReporter = {
          name: 'Marty Sullivan',
          role: 'Tuesday Recap',
          avatar: '/reporters/marty-sullivan-avatar.png',
        };
      }

      if (taggedReporter) {
        setTypingReporter(taggedReporter);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingReporter(null);
        }, 7000);
      }
    }

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_name: authManager,
          pin: authPin,
          message: textToSend,
          as_reporter: (isCommissioner && postAsReporter) ? postAsReporter : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setChatError(data.error || 'Failed to post message. Check PIN.');
        // Revert optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setChatInput(textToSend);
        setTypingReporter(null);
        if (res.status === 401) {
          setShowLoginModal(true);
        }
      } else {
        // Replace optimistic message with confirmed database record
        if (data.message) {
          setMessages((prev) => {
            const updated = prev.map((m) => (m.id === tempId ? data.message : m));
            if (data.reporterReply && !updated.some((m) => m.id === data.reporterReply.id)) {
              return [...updated, data.reporterReply];
            }
            return updated;
          });
        }

        // If a reporter is scheduled to reply after typing delay
        if (data.typingReporter) {
          setTypingReporter(data.typingReporter);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingReporter(null);
          }, (data.typingReporter.delayMs || 3500) + 2500);

          // Broadcast typing status to any other active users
          channelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: data.typingReporter,
          });

          // Fallback poll in case realtime socket is latent
          setTimeout(() => {
            fetchMessages();
          }, (data.typingReporter.delayMs || 3500) + 1500);
        } else if (!taggedReporter) {
          setTypingReporter(null);
        }
      }
    } catch (err) {
      setChatError('Network error sending message.');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setChatInput(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  // Tag reporter helper
  const handleTagReporter = (tag) => {
    setChatInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${tag} `;
      if (trimmed.includes(tag)) return prev;
      return `${trimmed} ${tag} `;
    });
  };

  // Format timestamp
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper for reporter styling
  const getReporterStyle = (name) => {
    if (name?.includes('Marcus') || name?.includes('Vance')) {
      return {
        badge: 'Dr. Marcus Vance • Analytics Desk',
        border: 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-[#091829]',
        tagBg: 'bg-cyan-900/60 text-cyan-300 border-cyan-500/40',
        nameColor: 'text-cyan-300',
      };
    }
    if (name?.includes('Buck') || name?.includes('Callahan')) {
      return {
        badge: 'Buck Callahan • The Grit Desk',
        border: 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-[#241306]',
        tagBg: 'bg-amber-900/60 text-amber-300 border-amber-500/40',
        nameColor: 'text-amber-400',
      };
    }
    if (name?.includes('Marty') || name?.includes('Sullivan')) {
      return {
        badge: 'Marty Sullivan • Tuesday Recap',
        border: 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-[#091f14]',
        tagBg: 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40',
        nameColor: 'text-emerald-300',
      };
    }
    if (name?.includes('Chloe') || name?.includes('Carmichael')) {
      return {
        badge: 'Chloe Carmichael • The Spin Room',
        border: 'border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-[#1e0a26]',
        tagBg: 'bg-purple-900/60 text-purple-300 border-purple-500/40',
        nameColor: 'text-purple-300',
      };
    }
    return {
      badge: 'Newsroom Reporter',
      border: 'border-[#d4af37]/50 bg-[#161d2b]',
      tagBg: 'bg-gray-800 text-[#d4af37] border-gray-700',
      nameColor: 'text-[#d4af37]',
    };
  };

  const matchups = matchupsData?.matchups || [];
  const weekNum = matchupsData?.week || 1;

  return (
    <div className="min-h-screen bg-[#090d14] text-gray-100 flex flex-col font-sans pb-12">
      {/* 1. GRITZone Top Master Bar */}
      <div className="bg-[#101726] border-b border-red-900/40 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          {/* Brand & Live Beacon */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
            </span>
            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-base sm:text-lg tracking-wider text-white uppercase flex items-center gap-1">
                  THE <span className="text-red-500 font-extrabold">GRIT</span>ZONE
                </span>
                <span className="text-[10px] font-mono font-bold uppercase bg-red-950/80 text-red-400 border border-red-700/50 px-1.5 py-0.5 rounded">
                  Week {weekNum} Live
                </span>
              </div>
            </div>
          </div>

          {/* Sync Status & Manager Auth Pill */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 60s Heartbeat countdown button */}
            <button
              onClick={() => fetchMatchups(true)}
              disabled={isRefreshing}
              title="Click to refresh scores"
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-gray-900/90 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white transition cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 text-red-400 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden xs:inline text-gray-400">Sync:</span>
              <span className="font-bold text-red-400">{countdown}s</span>
            </button>

            {/* Auth Button / Current User */}
            {authManager ? (
              <div className="flex items-center gap-1.5 bg-[#172236] border border-[#d4af37]/40 px-2.5 py-1 rounded-lg">
                <div className="w-5 h-5 rounded-full overflow-hidden border border-[#d4af37]/60 relative bg-black shrink-0">
                  <Image
                    src={MANAGERS_OPTIONS.find((m) => m.name === authManager)?.logo || '/logos/league.png'}
                    alt={authManager}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-xs font-bold text-gray-200 hidden sm:inline">{authManager}</span>
                <button
                  onClick={handleLogout}
                  title="Switch Manager / Logout"
                  className="text-[10px] text-gray-400 hover:text-red-400 underline ml-1 cursor-pointer"
                >
                  Exit
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#d4af37] text-gray-950 hover:bg-[#e6c24d] font-bold text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>PIN Login</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Mobile-First Segmented Control (Tabs) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2.5 lg:hidden">
          <div className="grid grid-cols-2 gap-1.5 bg-[#090d14] p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => handleSelectTab('matchups')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition min-h-[44px] cursor-pointer ${
                activeTab === 'matchups'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>🏈 Matchups</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  activeTab === 'matchups' ? 'bg-black/30 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                5
              </span>
            </button>

            <button
              onClick={() => handleSelectTab('chat')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition min-h-[44px] relative cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[#d4af37] text-gray-950 shadow-md shadow-amber-950 font-black'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>💬 War Room</span>
              {activeManagers.length > 0 && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'chat'
                      ? 'bg-black/25 text-gray-950'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                  }`}
                  title={`${activeManagers.length} active`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeManagers.length}
                </span>
              )}
              {unreadChatCount > 0 && activeTab !== 'chat' && (
                <span className="animate-bounce bg-red-500 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-View / Tabbed Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 w-full flex-1">
        {/* Desktop Split Layout or Mobile Tab switching */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          {/* LEFT COLUMN: Matchups Center (Visible if activeTab === 'matchups' on mobile, always visible on lg) */}
          <div
            className={`lg:col-span-7 xl:col-span-7 space-y-4 ${
              activeTab === 'matchups' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Quick Thriller Banner / Alert */}
            <div className="bg-gradient-to-r from-red-950/60 via-[#131b2e] to-gray-900 border border-red-800/40 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">🔥</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                    Live CRFFL Action Desk
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-400">
                    5 Matchups • Instant Sleeper API sync • Win probability computed per snap
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchMatchups(true)}
                className="hidden sm:flex text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/40 px-2.5 py-1 rounded bg-red-950/40 transition shrink-0"
              >
                Refresh Now
              </button>
            </div>

            {/* Error Message */}
            {matchupsError && (
              <div className="bg-red-950/40 border border-red-700/50 rounded-xl p-3 text-red-300 text-xs">
                ⚠️ {matchupsError}
              </div>
            )}

            {/* Matchup Cards Loading Skeleton */}
            {matchupsLoading && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-gray-900/60 border border-gray-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Matchup Cards List */}
            {!matchupsLoading && matchups.length === 0 && (
              <div className="text-center py-12 bg-gray-900/40 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-sm">No live matchups available for Week {weekNum}.</p>
                <p className="text-xs text-gray-500 mt-1">Check back on Sunday kickoff!</p>
              </div>
            )}

            {!matchupsLoading &&
              matchups.map((m) => {
                const isExpanded = expandedMatchupId === m.matchupId;
                const t1 = m.team1 || m.teamA || {};
                const t2 = m.team2 || m.teamB || {};

                const team1Prob = Math.round(t1.winProbability ?? m.winProbA ?? 50);
                const team2Prob = Math.round(t2.winProbability ?? m.winProbB ?? (100 - team1Prob));
                const margin = m.projectedMargin ?? m.margin ?? Math.abs((t1.points || 0) - (t2.points || 0));
                const isThriller = m.isThriller || m.isClose || margin <= 10;

                const t1Points = Number(t1.currentPoints ?? t1.points ?? 0).toFixed(1);
                const t2Points = Number(t2.currentPoints ?? t2.points ?? 0).toFixed(1);
                const t1Proj = Number(t1.projectedPoints ?? t1.projected ?? 0).toFixed(1);
                const t2Proj = Number(t2.projectedPoints ?? t2.projected ?? 0).toFixed(1);
                const t1Remaining = t1.startersRemaining ?? 0;
                const t2Remaining = t2.startersRemaining ?? 0;
                const startersInPlay = t1Remaining + t2Remaining;

                const t1Starters = Array.isArray(t1.starters) ? t1.starters : [];
                const t2Starters = Array.isArray(t2.starters) ? t2.starters : [];
                const maxStarters = Math.max(t1Starters.length, t2Starters.length);

                return (
                  <div
                    key={m.matchupId}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden bg-[#0d131f] shadow-md ${
                      isThriller
                        ? 'border-red-600/70 shadow-[0_0_20px_rgba(220,38,38,0.15)] ring-1 ring-red-500/40'
                        : 'border-gray-800/80 hover:border-gray-700'
                    }`}
                  >
                    {/* Matchup Card Header */}
                    <div className="bg-[#121929] px-3.5 py-2 border-b border-gray-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {isThriller ? (
                          <span className="flex items-center gap-1 text-[11px] font-black uppercase text-red-400 bg-red-950/80 border border-red-700/60 px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            Grit Thriller
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono font-bold text-gray-400 uppercase">
                            Matchup #{m.matchupId}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400">
                          Spread: <span className="font-mono font-bold text-gray-200">{margin} pts</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-mono text-gray-400">
                          {startersInPlay} in-play
                        </span>
                      </div>
                    </div>

                    {/* Matchup Main Score Grid */}
                    <div className="p-3 sm:p-4">
                      <div className="grid grid-cols-12 items-center gap-2">
                        {/* Team 1 (Left) */}
                        <div className="col-span-5 flex flex-col items-start min-w-0">
                          <div className="flex items-center gap-2 w-full">
                            <div className="w-10 h-10 rounded-full border border-gray-700/80 overflow-hidden relative bg-black shrink-0 shadow-sm">
                              <Image
                                src={t1.logo || '/logos/league.png'}
                                alt={t1.managerName || 'Team 1'}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 truncate">
                              <div className="font-extrabold text-sm sm:text-base text-white truncate">
                                {t1.managerName || 'Manager 1'}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {t1.teamName || 'Franchise 1'}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2.5 w-full">
                            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                              {t1Points}
                            </div>
                            <div className="text-[11px] font-mono text-gray-400 flex items-center justify-between">
                              <span>Proj: <span className="text-[#d4af37] font-bold">{t1Proj}</span></span>
                              <span className="text-[10px] text-gray-400">{t1Remaining} left</span>
                            </div>
                          </div>
                        </div>

                        {/* Middle VS & Probability */}
                        <div className="col-span-2 flex flex-col items-center justify-center text-center">
                          <span className="text-xs font-black text-gray-400 font-mono tracking-wider">
                            VS
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 mt-1">
                            {team1Prob}% - {team2Prob}%
                          </span>
                        </div>

                        {/* Team 2 (Right) */}
                        <div className="col-span-5 flex flex-col items-end min-w-0">
                          <div className="flex items-center gap-2 w-full justify-end">
                            <div className="min-w-0 truncate text-right">
                              <div className="font-extrabold text-sm sm:text-base text-white truncate">
                                {t2.managerName || 'Manager 2'}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {t2.teamName || 'Franchise 2'}
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-full border border-gray-700/80 overflow-hidden relative bg-black shrink-0 shadow-sm">
                              <Image
                                src={t2.logo || '/logos/league.png'}
                                alt={t2.managerName || 'Team 2'}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>

                          <div className="mt-2.5 w-full text-right">
                            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                              {t2Points}
                            </div>
                            <div className="text-[11px] font-mono text-gray-400 flex items-center justify-between flex-row-reverse">
                              <span>Proj: <span className="text-[#d4af37] font-bold">{t2Proj}</span></span>
                              <span className="text-[10px] text-gray-400">{t2Remaining} left</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Win Probability Bar */}
                      <div className="mt-3.5">
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            style={{ width: `${team1Prob}%` }}
                            className={`h-full transition-all duration-500 ${
                              team1Prob >= 50
                                ? 'bg-gradient-to-r from-red-600 to-amber-500'
                                : 'bg-gray-600'
                            }`}
                          />
                          <div
                            style={{ width: `${team2Prob}%` }}
                            className={`h-full transition-all duration-500 ${
                              team2Prob > 50
                                ? 'bg-gradient-to-r from-amber-500 to-red-600'
                                : 'bg-gray-700'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expand / Collapse Lineup Toggle */}
                      <div className="mt-3 pt-2.5 border-t border-gray-800/60 flex items-center justify-between">
                        <button
                          onClick={() =>
                            setExpandedMatchupId(isExpanded ? null : m.matchupId)
                          }
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/40 transition min-h-[40px] cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Lineups' : 'View Head-to-Head Starters'}</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Expanded Starters Drawer */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-800 space-y-1.5 animate-fadeIn">
                          <div className="text-[10px] font-mono uppercase text-gray-400 text-center tracking-wider pb-1">
                            Starter Points Comparison
                          </div>

                          {maxStarters === 0 ? (
                            <div className="text-center py-3 text-xs text-gray-500">
                              No starters submitted yet for this matchup.
                            </div>
                          ) : (
                            Array.from({ length: maxStarters }).map((_, idx) => {
                              const p1 = t1Starters[idx] || {};
                              const p2 = t2Starters[idx] || {};
                              const slotLabel = p1.pos || p1.position || p2.pos || p2.position || 'SLOT';

                              return (
                                <div
                                  key={idx}
                                  className="grid grid-cols-12 items-center text-xs py-1.5 px-2 rounded-lg bg-[#0a0f19] border border-gray-800/60 gap-1.5"
                                >
                                  {/* Team 1 Starter */}
                                  <div className="col-span-5 flex items-center justify-between min-w-0 pr-1">
                                    <div className="truncate">
                                      <div className="font-bold text-gray-200 truncate text-[11px] sm:text-xs">
                                        {p1.name || '—'}
                                      </div>
                                      <div className="text-[9px] text-gray-400 font-mono truncate">
                                        {p1.team ? `${p1.team} - ${p1.pos || p1.position || 'SLOT'}` : (p1.pos || p1.position || 'SLOT')}
                                      </div>
                                    </div>
                                    <span className="font-mono font-black text-white text-xs ml-1">
                                      {Number(p1.points || 0).toFixed(1)}
                                    </span>
                                  </div>

                                  {/* Position Badge */}
                                  <div className="col-span-2 text-center">
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                                      {slotLabel}
                                    </span>
                                  </div>

                                  {/* Team 2 Starter */}
                                  <div className="col-span-5 flex items-center justify-between min-w-0 pl-1 flex-row-reverse">
                                    <div className="truncate text-right">
                                      <div className="font-bold text-gray-200 truncate text-[11px] sm:text-xs">
                                        {p2.name || '—'}
                                      </div>
                                      <div className="text-[9px] text-gray-400 font-mono truncate">
                                        {p2.team ? `${p2.team} - ${p2.pos || p2.position || 'SLOT'}` : (p2.pos || p2.position || 'SLOT')}
                                      </div>
                                    </div>
                                    <span className="font-mono font-black text-white text-xs mr-1">
                                      {Number(p2.points || 0).toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* RIGHT COLUMN: The War Room Chat (Visible if activeTab === 'chat' on mobile, always visible on lg) */}
          <div
            className={`lg:col-span-5 xl:col-span-5 flex flex-col bg-[#0d131f] border border-gray-800 rounded-2xl overflow-hidden shadow-xl ${
              activeTab === 'chat' ? 'flex h-[calc(100dvh-175px)]' : 'hidden lg:flex lg:h-[780px]'
            }`}
          >
            {/* War Room Header */}
            <div className="bg-[#121929] px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <div>
                  <h2 className="font-black text-sm text-white tracking-wider uppercase">
                    The War Room
                  </h2>
                  <p className="text-[10px] text-gray-400">
                    Live Manager Banter &amp; Columnist Takes
                  </p>
                </div>
              </div>

              {/* Active Managers Presence Counter & Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowActivePopover((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0a0f19] border border-gray-700/80 hover:border-gray-600 transition cursor-pointer text-left shadow-sm group"
                  title="Click to view online managers"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 group-hover:text-emerald-300">
                    {activeManagers.length} {activeManagers.length === 1 ? 'Manager' : 'Managers'} Active
                  </span>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${showActivePopover ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Active Managers Dropdown Popover */}
                {showActivePopover && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#0f1726] border border-gray-700 rounded-xl shadow-2xl p-3 z-30 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <span>🟢 Active in Room</span>
                        <span className="text-gray-400 font-mono">({activeManagers.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowActivePopover(false)}
                        className="text-gray-400 hover:text-white text-xs p-0.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {activeManagers.length === 0 ? (
                      <p className="text-xs text-gray-400 py-1">
                        No managers currently authenticated. Enter your PIN to join!
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {activeManagers.map((m) => (
                          <div
                            key={m.managerName}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-[#141d2e] border border-gray-800/80"
                          >
                            <div className="w-5 h-5 rounded-full overflow-hidden relative border border-gray-700 bg-black shrink-0">
                              <Image
                                src={m.logo || '/logos/league.png'}
                                alt={m.managerName}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1 truncate">
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                                <span>{m.managerName}</span>
                                {m.isCommissioner && (
                                  <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Commish
                                  </span>
                                )}
                              </div>
                              {m.teamName && (
                                <div className="text-[10px] text-gray-400 truncate">
                                  {m.teamName}
                                </div>
                              )}
                            </div>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tag Chips Bar */}
            <div className="bg-[#0f1523] px-3 py-2 border-b border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-mono uppercase text-gray-400 shrink-0 mr-1">
                Summon:
              </span>
              {REPORTERS_CHAT_LIST.map((r) => (
                <button
                  key={r.tag}
                  onClick={() => handleTagReporter(r.tag)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition shrink-0 cursor-pointer ${r.chatColor} hover:brightness-125`}
                  title={`Prompt ${r.name}`}
                >
                  {r.tag}
                </button>
              ))}
            </div>

            {/* Message Stream Container */}
            <div
              ref={chatScrollContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-[#0a0e17]"
            >
              {chatLoading && messages.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-xs animate-pulse">
                  Connecting to Times-Herald live feed...
                </div>
              )}

              {!chatLoading && messages.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-xs">
                  The War Room is quiet. Drop a message or summon @Marcus, @Buck, @Marty, or @Chloe!
                </div>
              )}

              {messages.map((msg) => {
                const isReporter = msg.sender_type === 'reporter';
                const isMine = !isReporter && msg.sender_name === authManager;
                const repStyle = isReporter ? getReporterStyle(msg.sender_name) : null;

                if (isReporter) {
                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl border ${repStyle.border} transition-all animate-fadeIn`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-[#d4af37]/60 relative bg-black shrink-0">
                            <Image
                              src={msg.sender_avatar || '/reporters/default-avatar.png'}
                              alt={msg.sender_name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <span className={`text-xs font-black ${repStyle.nameColor}`}>
                              {msg.sender_name}
                            </span>
                            <span className={`ml-1.5 text-[9px] font-mono px-1.5 py-0.2 rounded border ${repStyle.tagBg}`}>
                              {repStyle.badge}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-100 leading-relaxed pl-9">
                        {msg.message}
                      </p>
                    </div>
                  );
                }

                // Manager Message
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-fadeIn`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      {!isMine && (
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-700 relative bg-black shrink-0">
                          <Image
                            src={msg.sender_avatar || '/logos/league.png'}
                            alt={msg.sender_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <span className="text-xs font-bold text-gray-300">
                        {msg.sender_name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        ({msg.team_name})
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono ml-1">
                        {formatTime(msg.created_at)}
                      </span>
                      {isMine && (
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-[#d4af37]/60 relative bg-black shrink-0">
                          <Image
                            src={msg.sender_avatar || '/logos/league.png'}
                            alt={msg.sender_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed ${
                        isMine
                          ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md rounded-tr-none'
                          : 'bg-[#161f30] text-gray-100 border border-gray-800 rounded-tl-none'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}

              {/* Reporter Typing Indicator */}
              {typingReporter && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-800 bg-[#121929]/90 shadow-md animate-fadeIn transition-all">
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-[#d4af37]/60 relative bg-black shrink-0">
                    <Image
                      src={typingReporter.avatar || '/reporters/default-avatar.png'}
                      alt={typingReporter.name || 'Reporter'}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-200 truncate">
                      {typingReporter.name} is typing
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0 px-1 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Jump to bottom indicator */}
            {!isNearBottom && (
              <div className="relative">
                <button
                  onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-800/90 text-white border border-gray-700 px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 hover:bg-gray-700 transition cursor-pointer"
                >
                  <span>↓ Jump to latest</span>
                </button>
              </div>
            )}

            {/* Sticky Chat Input Bar */}
            <div className="bg-[#121929] border-t border-gray-800 p-2.5 sm:p-3 shrink-0">
              {chatError && (
                <div className="text-red-400 text-[11px] mb-2 px-1">
                  ⚠️ {chatError}
                </div>
              )}

              {authManager ? (
                <div className="space-y-2">
                  {/* Commissioner Exclusive: Post as Reporter Toolbar */}
                  {isCommissioner && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold shrink-0 flex items-center gap-1 mr-0.5">
                        <span>👑 Post As:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPostAsReporter(null)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition shrink-0 cursor-pointer flex items-center gap-1 ${
                          postAsReporter === null
                            ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-sm ring-1 ring-amber-400/40'
                            : 'border-gray-800 bg-[#0f1523] text-gray-400 hover:text-gray-200'
                        }`}
                        title="Post as yourself"
                      >
                        <span>👤 {authManager || 'Commish'}</span>
                      </button>
                      {REPORTERS_CHAT_LIST.map((r) => {
                        const isSelected = postAsReporter === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setPostAsReporter(isSelected ? null : r.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? `${r.chatBorder} ring-1 ring-white/40 scale-105`
                                : 'border-gray-800 bg-[#0f1523] text-gray-400 hover:text-gray-200'
                            }`}
                            title={`Insert comment as ${r.name}`}
                          >
                            <div className="w-3.5 h-3.5 rounded-full overflow-hidden relative shrink-0">
                              <Image src={r.avatar} alt={r.name} fill className="object-cover" />
                            </div>
                            <span className={isSelected ? r.nameColor : ''}>{r.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={
                        selectedReporterMeta
                          ? `Draft take as ${selectedReporterMeta.name} (${selectedReporterMeta.chatRole})...`
                          : `Banter as ${authManager}... (tag @Marcus, @Buck)`
                      }
                      className={`flex-1 bg-[#0a0f19] border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none min-h-[44px] transition-all ${
                        selectedReporterMeta
                          ? `${selectedReporterMeta.chatBorder} focus:ring-1 focus:ring-amber-400`
                          : 'border-gray-700 focus:border-red-500'
                      }`}
                      maxLength={400}
                    />
                    <button
                      type="submit"
                      disabled={isSending || !chatInput.trim()}
                      className={`disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm min-h-[44px] flex items-center justify-center transition shadow-md cursor-pointer shrink-0 ${
                        selectedReporterMeta
                          ? selectedReporterMeta.id === 'chloe_carmichael'
                            ? 'bg-purple-600 hover:bg-purple-500'
                            : selectedReporterMeta.id === 'marcus_vance'
                            ? 'bg-cyan-600 hover:bg-cyan-500'
                            : selectedReporterMeta.id === 'buck_callahan'
                            ? 'bg-amber-600 hover:bg-amber-500'
                            : 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-red-600 hover:bg-red-500'
                      }`}
                    >
                      {isSending ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>
                          {selectedReporterMeta
                            ? `Post as ${selectedReporterMeta.name.split(' ')[0]}`
                            : 'Send'}
                        </span>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#172236] border border-[#d4af37]/40">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔒</span>
                    <span className="text-xs text-gray-300 font-medium">
                      Authenticate with your 4-digit PIN to post.
                    </span>
                  </div>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="bg-[#d4af37] text-gray-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#e6c24d] transition shadow-sm cursor-pointer shrink-0"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. PIN Authentication Drawer / Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1726] border border-[#d4af37]/50 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-3.5 right-3.5 text-gray-400 hover:text-white p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🏈</span>
              <h3 className="text-base font-extrabold text-white">
                Manager War Room Authentication
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Select your franchise and enter your 4-digit CRFFL security PIN to chat and banter with the columnists.
            </p>

            <form onSubmit={handleSaveLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Manager Identity
                </label>
                <select
                  value={loginManager}
                  onChange={(e) => setLoginManager(e.target.value)}
                  className="w-full bg-[#090d14] border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37] min-h-[44px]"
                >
                  {MANAGERS_OPTIONS.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.team})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  4-Digit Security PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-[#090d14] border border-gray-700 rounded-xl px-3 py-2.5 text-center text-lg tracking-widest font-mono text-white focus:outline-none focus:border-[#d4af37] min-h-[44px]"
                />
              </div>

              {loginError && (
                <div className="text-xs text-red-400 font-medium">
                  ⚠️ {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#d4af37] hover:bg-[#e6c24d] text-gray-950 font-black py-2.5 rounded-xl text-xs transition shadow-md min-h-[44px] cursor-pointer"
              >
                Authorize &amp; Enter War Room
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
