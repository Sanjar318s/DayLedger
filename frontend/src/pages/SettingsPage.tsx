import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import Avatar from '../components/Avatar';
import { translations } from '../i18n/translations';
import { motion } from 'framer-motion';

type TranslationKey = keyof typeof translations['ru'];

const settingsTabs: { path: string; label: TranslationKey; icon: string; suffix?: TranslationKey }[] = [
  { path: '/settings/reports', label: 'reports', icon: '📊' },
  { path: '/settings/categories', label: 'categories', icon: '🏷️' },
  { path: '/settings/language', label: 'language', icon: '🌐', suffix: 'currency' },
  { path: '/settings/account', label: 'account', icon: '👤' },
  { path: '/settings/sound', label: 'sound', icon: '🔊' },
];

export default function SettingsPage() {
  const { t } = useLocale();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6 w-full max-w-full">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{t('settings')}</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-0.5">{t('manageYourAccount')}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-lg shadow-sm" aria-label={theme === 'light' ? t('darkMode') : theme === 'dark' ? t('redMode') : t('lightMode')}>
            {theme === 'light' ? '🌙' : theme === 'dark' ? '🔴' : '☀️'}
          </button>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <Avatar avatarUrl={user?.avatar_url} nickname={user?.nickname} size={28} frameCss={(user as any).active_frame_css} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden xs:inline">{user?.nickname || t('user')}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0">
        <nav className="lg:w-48 xl:w-56 shrink-0" aria-label={t('settingsNavigation')}>
          <div className="flex flex-wrap lg:flex-col gap-1.5 pb-1 lg:pb-0">
            {settingsTabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all max-w-full ${
                    isActive
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="truncate">{t(tab.label)}{tab.suffix ? ` & ${t(tab.suffix)}` : ''}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <main className="flex-1 min-w-0 max-w-full lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <div className="card p-4 sm:p-6 w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </motion.div>
  );
}
