import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);
const LocaleContext = createContext(null);

const STR = {
  en: {
    hello: 'Hello',
    forYou: 'Pre-approved for you',
    conventional: 'Conventional',
    islamic: 'Islamic',
    home: 'Home',
    simulate: 'Simulate',
    loans: 'Loans',
    track: 'Track',
    help: 'Help',
    profile: 'Profile',
    continue: 'Continue',
    seeCost: 'See what it costs',
  },
  ur: {
    hello: 'السلام علیکم',
    forYou: 'آپ کے لیے پیشگی منظوری',
    conventional: 'روایتی',
    islamic: 'اسلامی',
    home: 'ہوم',
    simulate: 'تخمینہ',
    loans: 'قرضے',
    track: 'ٹریک',
    help: 'مدد',
    profile: 'پروفائل',
    continue: 'آگے بڑھیں',
    seeCost: 'لاگت دیکھیں',
  },
  ar: {
    hello: 'مرحبا',
    forYou: 'موافقة مسبقة لك',
    conventional: 'تقليدي',
    islamic: 'إسلامي',
    home: 'الرئيسية',
    simulate: 'المحاكاة',
    loans: 'التمويلات',
    track: 'التتبع',
    help: 'المساعدة',
    profile: 'الملف',
    continue: 'متابعة',
    seeCost: 'اعرض التكلفة',
  },
};

export function AppState({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    api('/api/identity/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const auth = useMemo(() => ({
    user,
    loading,
    setUser,
    async logout() {
      await api('/api/identity/logout', { method: 'POST', body: {} });
      setUser(null);
    },
  }), [user, loading]);

  const i18n = useMemo(() => ({
    locale,
    setLocale,
    dir: locale === 'en' ? 'ltr' : 'rtl',
    t: (key) => STR[locale][key] || STR.en[key] || key,
  }), [locale]);

  return (
    <AuthContext.Provider value={auth}>
      <LocaleContext.Provider value={i18n}>{children}</LocaleContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useLocale() {
  return useContext(LocaleContext);
}
