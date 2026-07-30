import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/', label: 'dashboard', icon: '📊' },
  { path: '/entry/new', label: 'newEntry', icon: '✏️' },
  { path: '/friends', label: 'friends', icon: '👥' },
  { path: '/chat', label: 'chat', icon: '💬' },
  { path: '/shared', label: 'sharedEntries', icon: '🔗' },
  { path: '/settings', label: 'settings', icon: '⚙️' },
];

export default function Layout() {
  const { user, setUser } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
    navigate('/login');
  }, [setUser, navigate]);

  const closeAllMenus = useCallback(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (userMenuOpen || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, mobileMenuOpen]);

  useEffect(() => {
    closeAllMenus();
  }, [location.pathname, closeAllMenus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllMenus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeAllMenus]);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950 transition-colors duration-300 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-gray-200/60 dark:border-slate-800/60 fixed inset-y-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-200/60 dark:border-slate-800/60">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20 flex-shrink-0">
            📝
          </div>
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            DayLedger
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="navigation">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-slate-800/60'
                  }
                `}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{t(item.label as any)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-gray-200/60 dark:border-slate-800/60">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50/60 dark:bg-slate-800/40">
              <Avatar
                avatarUrl={user.avatar_url}
                nickname={user.nickname}
                size={36}
                frameCss={(user as any).active_frame_css}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.nickname || 'User'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  #{user.public_id}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen max-w-full w-full">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile: brand + menu */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-slate-800/60 transition-colors"
                aria-label={t('menu')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 lg:hidden">
                DayLedger
              </span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 ml-auto">
              <motion.button
                onClick={toggleTheme}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-slate-800/60 transition-colors"
                aria-label={theme === 'light' ? t('darkMode') : theme === 'dark' ? t('redMode') : t('lightMode')}
              >
                <span className="text-lg">{theme === 'light' ? '🌙' : theme === 'dark' ? '🔴' : '☀️'}</span>
              </motion.button>

              <NotificationBell />

              {user && (
                <div className="relative" ref={userMenuRef}>
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100/60 dark:hover:bg-slate-800/60 transition-colors"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <Avatar
                      avatarUrl={user.avatar_url}
                      nickname={user.nickname}
                      size={34}
                      frameCss={(user as any).active_frame_css}
                    />
                  </motion.button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50"
                        role="menu"
                      >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {user.nickname || 'User'}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            #{user.public_id}
                          </p>
                        </div>

                        <Link
                          to={`/profile/${user.public_id}`}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                          role="menuitem"
                          onClick={closeAllMenus}
                        >
                          👤 {t('myProfile')}
                        </Link>

                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                          role="menuitem"
                          onClick={closeAllMenus}
                        >
                          ⚙️ {t('settings')}
                        </Link>

                        <div className="h-px bg-gray-100 dark:bg-slate-800" />

                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          role="menuitem"
                        >
                          🚪 {t('logout')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden" role="main">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            ref={mobileMenuRef}
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl lg:hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-sm shadow-lg shadow-indigo-500/20">
                  📝
                </div>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  DayLedger
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${active
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-slate-800/60'
                      }
                    `}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{t(item.label as any)}</span>
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="p-3 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                  <Avatar
                    avatarUrl={user.avatar_url}
                    nickname={user.nickname}
                    size={36}
                    frameCss={(user as any).active_frame_css}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.nickname || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      #{user.public_id}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
