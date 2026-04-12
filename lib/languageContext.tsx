import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, Translations, translations } from './i18n';

const LANG_KEY = 'app_language';

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'tr',
  setLang: () => { },
  t: translations.tr,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('tr');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((val) => { if (val === 'en' || val === 'tr') setLangState(val); })
      .catch((e) => { console.error(e) });
  }, []);

  function setLang(newLang: Lang) {
    setLangState(newLang);
    AsyncStorage.setItem(LANG_KEY, newLang).catch((e) => { console.error(e) });
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
