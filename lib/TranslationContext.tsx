'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey, getLanguageFromCountry } from './translations';

interface TranslationContextType {
  language: Language;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode; country?: string }> = ({ children, country }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Fast language detection from multiple sources
    let detectedLang: Language = 'en';
    
    // 1. Try to detect from country (fastest)
    if (country) {
      detectedLang = getLanguageFromCountry(country);
    } else {
      // 2. Try to detect from browser navigator language
      if (typeof navigator !== 'undefined' && navigator.language) {
        const browserLang = navigator.language.split('-')[0].toLowerCase();
        const langKeys = Object.keys(translations) as Language[];
        if (langKeys.includes(browserLang as Language)) {
          detectedLang = browserLang as Language;
        }
      }
    }
    
    setLanguage(detectedLang);
  }, [country]);

  const t = (key: TranslationKey): string => {
    return (translations[language] as Record<TranslationKey, string>)[key] || (translations.en as Record<TranslationKey, string>)[key] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};
