import { useState, FormEvent } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { register } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { usePerfMode } from '../hooks/usePerfMode';
import { useLocale } from '../context/LocaleContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { user, setUser } = useAuth();
  const { reducedMotion } = usePerfMode();
  const navigate = useNavigate();
  const { t } = useLocale();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 4);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordsNotMatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    setIsLoading(true);
    try {
      const user = await register(name, email, password);
      setUser(user);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || t('errorRegister'));
    } finally {
      setIsLoading(false);
    }
  };

  const strengthLabels = [
    t('passwordVeryWeak'), t('passwordWeak'), t('passwordFair'), t('passwordGood'), t('passwordStrong')
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-indigo-600">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {!reducedMotion && (
          <>
            <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-indigo-400 rounded-full blur-3xl opacity-30 animate-[float_8s_ease-in-out_infinite]" />
            <div className="absolute -bottom-16 -left-16 w-[350px] h-[350px] bg-cyan-400 rounded-full blur-3xl opacity-30 animate-[float_8s_ease-in-out_infinite_2s]" />
            <div className="absolute top-1/3 left-1/4 w-[200px] h-[200px] bg-emerald-400 rounded-full blur-3xl opacity-20 animate-[float_8s_ease-in-out_infinite_4s]" />
          </>
        )}
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-2xl mb-5 shadow-lg shadow-indigo-500/30 mx-auto"
                aria-hidden="true"
              >
                <span className="text-3xl">📝</span>
              </motion.div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
                {t('createAccount')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('registerSubtitle')}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 mb-5"
                role="alert"
              >
                <span className="text-red-500 mt-0.5 flex-shrink-0">⚠️</span>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="name" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('name')}
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder={t('namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="input-field"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input-field"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('password')}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  className="input-field"
                  disabled={isLoading}
                  aria-describedby="password-strength"
                />
                {password && (
                  <div className="mt-2" id="password-strength">
                    <div className="flex gap-1 h-1 mb-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 h-full rounded-full transition-all duration-300 ${
                            level <= passwordStrength
                              ? ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-500'][passwordStrength]
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${
                      ['text-red-500', 'text-red-500', 'text-amber-500', 'text-emerald-500', 'text-emerald-500'][passwordStrength]
                    }`}>
                      {strengthLabels[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="input-field"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="sr-only peer"
                  />
                  <span className="w-5 h-5 mt-0.5 border-2 border-slate-300 dark:border-slate-600 rounded flex-shrink-0 transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500 relative after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-2.5 after:h-1 after:border-b-2 after:border-r-2 after:border-white after:rotate-45 after:opacity-0 peer-checked:after:opacity-100" aria-hidden="true" />
                  <span className="text-sm text-slate-600 dark:text-slate-400 leading-tight">
                    {t('agreeToTerms')}{' '}
                    <Link to="/terms" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline">{t('termsOfService')}</Link>{' '}
                    {t('and')}{' '}
                    <Link to="/privacy" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline">{t('privacyPolicy')}</Link>
                  </span>
                </label>
              </div>

              <motion.button
                type="submit"
                className="btn-primary w-full py-3 text-base"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
                    {t('creatingAccount')}
                  </span>
                ) : (
                  t('register')
                )}
              </motion.button>
            </form>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-4 text-slate-400">{t('or')}</span>
              </div>
            </div>

            <button
              onClick={() => window.location.href = 'http://localhost:4000/api/auth/google'}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 disabled:opacity-50 disabled:pointer-events-none"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('loginWithGoogle')}
            </button>

            <p className="text-center mt-7 text-sm text-slate-500 dark:text-slate-400">
              {t('haveAccount')}{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline">
                {t('login')}
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      <p className="text-center pb-6 text-xs text-white/60 relative z-10">
        &copy; {new Date().getFullYear()} {t('appName')}. {t('allRightsReserved')}
      </p>
    </div>
  );
}
