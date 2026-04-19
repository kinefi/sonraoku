import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Lang, Translations, interpolate } from './translations';
import { STORAGE_KEYS } from '../constants';

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
  translate: (key: string, params?: Record<string, any>) => string;
  isReady: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'tr',
  setLang: () => { },
  t: translations.tr,
  translate: (key: string, _params?: Record<string, any>) => key,
  isReady: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('tr');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE)
      .then((val) => { if (val === 'en' || val === 'tr') setLangState(val); })
      .catch((e) => { console.error(e) })
      .finally(() => setIsReady(true));
  }, []);

  function setLang(newLang: Lang) {
    setLangState(newLang);
    AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang).catch((e) => { console.error(e) });
  }

  const translate = useCallback((key: string, params?: Record<string, any>) => {
    // Handle nested keys via path traversal (e.g. 'common.appName')
    const paths = key.split('.');
    let current: any = translations[lang];
    for (const path of paths) {
      current = current?.[path];
    }
    const text = current || key;
    return params ? interpolate(text, params) : text;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang], translate, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
