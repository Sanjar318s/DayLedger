import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { translations, Lang } from '../i18n/translations';
import apiClient from '../api/client';

interface LocaleState {
  lang: Lang;
  currency: string;
  setLang: (l: Lang) => void;
  setCurrency: (c: string) => void;
  t: (key: keyof typeof translations['ru']) => string;
}

const LocaleContext = createContext<LocaleState>({
  lang: 'ru',
  currency: 'UZS',
  setLang: () => {},
  setCurrency: () => {},
  t: (key) => key,
});

export const useLocale = () => useContext(LocaleContext);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>('ru');
  const [currency, setCurrencyState] = useState('UZS');

  useEffect(() => {
    if (user) {
      if (user.language && translations[user.language as Lang]) {
        setLangState(user.language as Lang);
      }
      if (user.currency) {
        setCurrencyState(user.currency);
      }
    }
  }, [user]);

  // Сохранение в профиль на сервере при изменении
  const saveToProfile = useCallback(async (field: string, value: string) => {
    try {
      await apiClient.patch('/auth/profile', { [field]: value });
    } catch (err) {
      console.warn('Failed to save profile:', err);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveToProfile('language', l);
  }, [saveToProfile]);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    saveToProfile('currency', c);
  }, [saveToProfile]);

  const t = (key: keyof typeof translations['ru']) => {
    return translations[lang]?.[key] || translations.ru[key] || key;
  };

  return (
    <LocaleContext.Provider value={{ lang, currency, setLang, setCurrency, t }}>
      {children}
    </LocaleContext.Provider>
  );
};
