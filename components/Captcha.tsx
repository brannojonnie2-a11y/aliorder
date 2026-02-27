'use client';
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/lib/TranslationContext';

interface CaptchaProps {
  onVerified: () => void;
}

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export const Captcha: React.FC<CaptchaProps> = ({ onVerified }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState(generateCode);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const refresh = () => {
    setCode(generateCode());
    setInput('');
    setError(false);
  };

  const handleVerify = () => {
    if (processing) return;
    if (input === code) {
      setProcessing(true);
      setTimeout(() => {
        onVerified();
      }, 3000);
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setInput('');
      setCode(generateCode());
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-md mx-auto relative shadow-xl px-6">
      <div className="w-full flex flex-col items-center gap-6 py-10">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-[#FF4747]" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t('securityCheck')}</h1>
          <p className="text-sm text-gray-500 max-w-[280px] mx-auto">{t('securityCheckDesc')}</p>
        </div>

        {/* Captcha display */}
        <div className={`relative w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center py-5 select-none ${shake ? 'animate-bounce' : ''}`}>
          <span className="text-4xl font-black tracking-[0.3em] text-gray-800 font-mono">
            {code.split('').join(' ')}
          </span>
          <button
            onClick={refresh}
            disabled={processing}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-40"
            aria-label={t('refreshCode')}
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Input */}
        <div className="w-full space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {t('enterCode')}
          </label>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={input}
            disabled={processing}
            onChange={(e) => { setInput(e.target.value.replace(/\D/g, '')); setError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="----"
            className={`w-full px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] border-2 rounded-xl outline-none transition-all bg-white disabled:opacity-60 ${
              error ? 'border-red-400 text-red-500' : 'border-gray-200 focus:border-[#FF4747] text-gray-900'
            }`}
          />
          {error && <p className="text-xs text-red-500 text-center font-medium">{t('incorrectCode')}</p>}
        </div>

        {/* Button */}
        <button
          onClick={handleVerify}
          disabled={input.length < 4 || processing}
          className={`w-full py-4 rounded-full text-lg font-bold text-white transition-all active:scale-[0.98] ${
            input.length < 4 || processing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#FF4747] hover:bg-[#e03030]'
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
          ) : t('verifyIdentity')}
        </button>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center">{t('protectedBy')}</p>
      </div>
    </div>
  );
};
