import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Lang, Translations, LANGUAGES, interpolate } from './translations';
import { STORAGE_KEYS } from './constants';

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
  isReady: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'tr',
  setLang: () => { },
  t: translations.tr,
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

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang], isReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
