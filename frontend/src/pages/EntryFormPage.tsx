import { useState, FormEvent, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createEntry, updateEntry, getEntries, Entry } from '../api/entries';
import { format } from 'date-fns';
import { useLocale } from '../context/LocaleContext';
import { useCategories } from '../context/CategoriesContext';
import { getSocket } from '../api/socket';
import { useAuth } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

const availableCurrencies = ['UZS', 'USD', 'EUR', 'RUB'];
const currencySymbols: Record<string, string> = { UZS: 'сум', USD: '$', EUR: '€', RUB: '₽' };

interface EntryDraft {
  title: string;
  description: string;
  eventAt: string;
  remindEnabled: boolean;
  remindBefore: number;
  financeEnabled: boolean;
  amount: string;
  amountType: 'expense' | 'income';
  currency: string;
  categoryId: string;
  savedAt: number;
}

function getDraftKey(id?: string) {
  return id ? `entryDraft:${id}` : 'entryDraft:new';
}

function loadDraft(key: string): EntryDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const sectionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.07, ease: 'easeOut' as const },
  }),
};

const slideDown = {
  initial: { opacity: 0, height: 0, marginTop: 0 },
  animate: { opacity: 1, height: 'auto', marginTop: 16, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

export default function EntryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { t, currency: globalCurrency } = useLocale();
  const { categories } = useCategories();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventAt, setEventAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [remindEnabled, setRemindEnabled] = useState(false);
  const [remindBefore, setRemindBefore] = useState(0);
  const [financeEnabled, setFinanceEnabled] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountType, setAmountType] = useState<'expense' | 'income'>('expense');
  const [currency, setCurrency] = useState(globalCurrency);
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const lastDescriptionRef = useRef('');
  const userInputRef = useRef('');
  const socketRef = useRef(getSocket(user?.id));
  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = getDraftKey(id);
  const draftRef = useRef<EntryDraft | null>(null);

  const applyDraft = useCallback((draft: EntryDraft) => {
    setTitle(draft.title);
    setDescription(draft.description);
    if (draft.eventAt) setEventAt(draft.eventAt);
    setRemindEnabled(draft.remindEnabled);
    setRemindBefore(draft.remindBefore);
    setFinanceEnabled(draft.financeEnabled);
    setAmount(draft.amount);
    setAmountType(draft.amountType);
    setCurrency(draft.currency);
    setCategoryId(draft.categoryId);
    lastDescriptionRef.current = draft.description;
    userInputRef.current = draft.description;
  }, []);

  const flushDraft = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;
    const hasContent = draft.title.trim()
      || draft.description.trim()
      || draft.financeEnabled
      || draft.remindEnabled
      || draft.amount
      || draft.categoryId;
    if (!hasContent) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draftKey]);

  const validateField = useCallback((name: string, value: string) => {
    switch (name) {
      case 'title':
        if (!value.trim()) return t('titleRequired');
        if (value.trim().length < 2) return t('titleTooShort');
        if (value.length > 200) return t('titleTooLong');
        return '';
      case 'description':
        if (!value.trim()) return t('descriptionRequired');
        return '';
      case 'eventAt':
        if (remindEnabled && !value) return t('dateRequired');
        if (remindEnabled && new Date(value) < new Date(Date.now() - 60000)) return t('dateInPast');
        return '';
      case 'amount':
        if (financeEnabled && value && isNaN(Number(value))) return t('invalidAmount');
        return '';
      case 'remindBefore':
        if (remindEnabled && value && (Number(value) < 0 || Number(value) > 10080)) return t('invalidReminder');
        return '';
      default:
        return '';
    }
  }, [t, financeEnabled, remindEnabled]);

  const handleBlur = useCallback((name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  const handleChange = useCallback((name: string, value: string) => {
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  useEffect(() => {
    userInputRef.current = description;
  }, [description]);

  useEffect(() => {
    if (id) {
      getEntries('2000-01-01', '2100-01-01').then(res => {
        const entry = res.data.find((e: Entry) => e.id === id);
        if (entry) {
          setTitle(entry.title);
          const desc = entry.description || '';
          setDescription(desc);
          lastDescriptionRef.current = desc;
          userInputRef.current = desc;
          setEventAt(format(new Date(entry.event_at), "yyyy-MM-dd'T'HH:mm"));
          setRemindBefore(entry.remind_before_minutes);
          setRemindEnabled(entry.remind_before_minutes > 0);
          if (entry.amount) {
            setFinanceEnabled(true);
            setAmount(String(entry.amount));
            setAmountType(entry.amount_type || 'expense');
            setCurrency(entry.currency || globalCurrency);
          }
          if (entry.category_id) setCategoryId(entry.category_id);

          const draft = loadDraft(draftKey);
          const entryUpdatedAt = new Date(entry.updated_at).getTime();
          if (draft && (!entryUpdatedAt || draft.savedAt > entryUpdatedAt)) {
            applyDraft(draft);
          }
        }
      });
    }
  }, [id, globalCurrency, draftKey, applyDraft]);

  useEffect(() => {
    if (!id) {
      const draft = loadDraft(draftKey);
      if (draft) applyDraft(draft);
    }
  }, [id, draftKey, applyDraft]);

  useEffect(() => {
    draftRef.current = {
      title,
      description,
      eventAt,
      remindEnabled,
      remindBefore,
      financeEnabled,
      amount,
      amountType,
      currency,
      categoryId,
      savedAt: Date.now(),
    };
  }, [title, description, eventAt, remindEnabled, remindBefore, financeEnabled, amount, amountType, currency, categoryId]);

  useEffect(() => {
    const timer = setTimeout(flushDraft, 400);
    return () => clearTimeout(timer);
  }, [flushDraft, title, description, eventAt, remindEnabled, remindBefore, financeEnabled, amount, amountType, currency, categoryId]);

  useEffect(() => {
    const flush = () => flushDraft();
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [flushDraft]);

  useEffect(() => {
    if (!id || description === lastDescriptionRef.current) return;
    const timer = setTimeout(async () => {
      try {
        await updateEntry(id, { description });
        lastDescriptionRef.current = description;
        queryClient.invalidateQueries({ queryKey: ['entry', id] });
      } catch {
        // silently ignore
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [description, id, queryClient]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !id) return;

    const handleEntryUpdated = (data: any) => {
      if (data.entry?.id === id) {
        queryClient.setQueryData(['entry', id], (old: any) => {
          if (!old) return old;
          return { ...old, description: data.entry.description };
        });

        const serverDesc = data.entry.description || '';
        const currentUserInput = userInputRef.current;
        const previousServer = lastDescriptionRef.current;

        if (previousServer && currentUserInput !== previousServer) {
          const unsaved = currentUserInput.slice(previousServer.length);
          if (unsaved.trim().length > 0) {
            const merged = serverDesc + (serverDesc ? '\n' : '') + unsaved;
            setDescription(merged);
            lastDescriptionRef.current = serverDesc;
            userInputRef.current = merged;
            return;
          }
        }

        setDescription(serverDesc);
        lastDescriptionRef.current = serverDesc;
        userInputRef.current = serverDesc;
      }
    };

    socket.on('entry_updated', handleEntryUpdated);
    return () => {
      socket.off('entry_updated', handleEntryUpdated);
    };
  }, [id, queryClient]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const allTouched: Record<string, boolean> = { title: true, description: true };

    if (remindEnabled) {
      allTouched.eventAt = true;
      allTouched.remindBefore = true;
    }

    if (financeEnabled) {
      allTouched.amount = true;
    }

    Object.keys(allTouched).forEach(key => {
      const value = key === 'title' ? title
        : key === 'description' ? description
        : key === 'eventAt' ? eventAt
        : key === 'amount' ? amount
        : remindBefore.toString();
      const error = validateField(key, value);
      if (error) newErrors[key] = error;
    });

    setTouched(allTouched);
    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = formRef.current?.querySelector('[aria-invalid="true"]') as HTMLElement;
      firstError?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      event_at: new Date(eventAt).toISOString(),
      remind_before_minutes: remindEnabled ? remindBefore : 0,
      category_id: categoryId || null,
    };

    if (financeEnabled && amount) {
      payload.amount = Number(amount);
      payload.amount_type = amountType;
      payload.currency = currency;
    }

    try {
      if (isEdit) {
        await updateEntry(id!, payload);
      } else {
        await createEntry(payload);
      }
      // Invalidate entries queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      clearDraft(draftKey);
      lastDescriptionRef.current = description;
      userInputRef.current = description;
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || t('errorSaving'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.values(fieldErrors).some(e => e);

  return (
    <motion.div
      className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-md text-gray-600 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 dark:bg-slate-800/80 dark:border-slate-700/20 dark:text-gray-300 dark:hover:text-indigo-400"
            aria-label={t('back')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEdit ? t('editEntry') : t('newEntry')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isEdit ? t('editEntrySubtitle') : t('newEntrySubtitle')}
            </p>
          </div>
        </header>

        <main>
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
            <motion.section
              custom={0}
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 dark:bg-slate-800/80 dark:border-slate-700/20"
              aria-labelledby="basic-info-heading"
            >
              <h2 id="basic-info-heading" className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-5">
                {t('basicInfo')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('title')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    autoComplete="off"
                    placeholder={t('titlePlaceholder')}
                    value={title}
                    onChange={e => { setTitle(e.target.value); handleChange('title', e.target.value); }}
                    onBlur={e => handleBlur('title', e.target.value)}
                    className={`input-field ${fieldErrors.title && touched.title ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
                    aria-invalid={fieldErrors.title && touched.title ? 'true' : 'false'}
                    aria-describedby={fieldErrors.title && touched.title ? 'title-error' : 'title-hint'}
                    disabled={isSubmitting}
                    maxLength={200}
                  />
                  {fieldErrors.title && touched.title && (
                    <p id="title-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                      {fieldErrors.title}
                    </p>
                  )}
                  <p id="title-hint" className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('titleHint')}</p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('description')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    placeholder={t('descriptionPlaceholder')}
                    value={description}
                    onChange={e => { setDescription(e.target.value); handleChange('description', e.target.value); }}
                    onBlur={e => handleBlur('description', e.target.value)}
                    rows={6}
                    className={`input-field resize-y min-h-[120px] ${fieldErrors.description && touched.description ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
                    aria-invalid={fieldErrors.description && touched.description ? 'true' : 'false'}
                    aria-describedby={fieldErrors.description && touched.description ? 'desc-error' : 'desc-hint'}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.description && touched.description && (
                    <p id="desc-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                      {fieldErrors.description}
                    </p>
                  )}
                  <p id="desc-hint" className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('descriptionHint')}</p>
                </div>

              </div>
            </motion.section>

            <motion.section
              custom={1}
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 dark:bg-slate-800/80 dark:border-slate-700/20"
              aria-labelledby="reminder-heading"
            >
              <div className="flex items-center justify-between">
                <h2 id="reminder-heading" className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t('reminder')}
                </h2>
                <button
                  type="button"
                  role="switch"
                  aria-checked={remindEnabled}
                  onClick={() => setRemindEnabled(!remindEnabled)}
                  disabled={isSubmitting}
                  aria-label={t('enableReminder')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                    remindEnabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      remindEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                {remindEnabled ? t('on') : t('off')}
              </span>

              <AnimatePresence>
                {remindEnabled && (
                  <motion.div
                    key="remind-fields"
                    variants={slideDown}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="overflow-hidden"
                  >
                    <div className="mt-4">
                      <label htmlFor="eventAt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t('eventAt')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="eventAt"
                        value={eventAt}
                        onChange={e => { setEventAt(e.target.value); handleChange('eventAt', e.target.value); }}
                        onBlur={e => handleBlur('eventAt', e.target.value)}
                        className={`input-field ${fieldErrors.eventAt && touched.eventAt ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
                        aria-invalid={fieldErrors.eventAt && touched.eventAt ? 'true' : 'false'}
                        aria-describedby={fieldErrors.eventAt && touched.eventAt ? 'eventAt-error' : 'eventAt-hint'}
                        disabled={isSubmitting}
                        min={format(new Date(Date.now() - 60000), "yyyy-MM-dd'T'HH:mm")}
                      />
                      {fieldErrors.eventAt && touched.eventAt && (
                        <p id="eventAt-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                          {fieldErrors.eventAt}
                        </p>
                      )}
                      <p id="eventAt-hint" className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('eventAtHint')}</p>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="remindBefore" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t('remindBefore')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="remindBefore"
                        min="0"
                        max="10080"
                        value={remindBefore}
                        onChange={e => { setRemindBefore(Number(e.target.value) || 0); handleChange('remindBefore', e.target.value); }}
                        onBlur={e => handleBlur('remindBefore', e.target.value)}
                        className={`input-field ${fieldErrors.remindBefore && touched.remindBefore ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
                        aria-invalid={fieldErrors.remindBefore && touched.remindBefore ? 'true' : 'false'}
                        aria-describedby={fieldErrors.remindBefore && touched.remindBefore ? 'remindBefore-error' : 'remindBefore-hint'}
                        disabled={isSubmitting}
                      />
                      {fieldErrors.remindBefore && touched.remindBefore && (
                        <p id="remindBefore-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                          {fieldErrors.remindBefore}
                        </p>
                      )}
                      <p id="remindBefore-hint" className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('remindBeforeHint')}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            <motion.section
              custom={2}
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 dark:bg-slate-800/80 dark:border-slate-700/20"
              aria-labelledby="finance-heading"
            >
              <div className="flex items-center justify-between">
                <h2 id="finance-heading" className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t('finance')}
                </h2>
                <button
                  type="button"
                  role="switch"
                  aria-checked={financeEnabled}
                  onClick={() => setFinanceEnabled(!financeEnabled)}
                  disabled={isSubmitting}
                  aria-label={t('enableFinance')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                    financeEnabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      financeEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                {financeEnabled ? t('on') : t('off')}
              </span>

              <AnimatePresence>
                {financeEnabled && (
                  <motion.div
                    key="finance-fields"
                    variants={slideDown}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t('amount')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="amount"
                          step="0.01"
                          min="0"
                          placeholder={t('amountPlaceholder')}
                          value={amount}
                          onChange={e => { setAmount(e.target.value); handleChange('amount', e.target.value); }}
                          onBlur={e => handleBlur('amount', e.target.value)}
                          className={`input-field ${fieldErrors.amount && touched.amount ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
                          aria-invalid={fieldErrors.amount && touched.amount ? 'true' : 'false'}
                          aria-describedby={fieldErrors.amount && touched.amount ? 'amount-error' : 'amount-hint'}
                          disabled={isSubmitting}
                        />
                        {fieldErrors.amount && touched.amount && (
                          <p id="amount-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                            {fieldErrors.amount}
                          </p>
                        )}
                        <p id="amount-hint" className="mt-1 text-xs text-gray-400 dark:text-gray-500">{currencySymbols[currency]}</p>
                      </div>

                      <div>
                        <label htmlFor="amountType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t('type')}
                        </label>
                        <select
                          id="amountType"
                          value={amountType}
                          onChange={e => setAmountType(e.target.value as 'expense' | 'income')}
                          className="input-field"
                          disabled={isSubmitting}
                        >
                          <option value="expense">{t('expense')}</option>
                          <option value="income">{t('income')}</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t('currency')}
                        </label>
                        <select
                          id="currency"
                          value={currency}
                          onChange={e => setCurrency(e.target.value)}
                          className="input-field"
                          disabled={isSubmitting}
                        >
                          {availableCurrencies.map(c => (
                            <option key={c} value={c}>{c} ({currencySymbols[c]})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            <motion.section
              custom={3}
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 dark:bg-slate-800/80 dark:border-slate-700/20"
              aria-labelledby="category-heading"
            >
              <h2 id="category-heading" className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t('category')}
              </h2>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('category')}
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="input-field"
                  disabled={isSubmitting}
                >
                  <option value="">{t('none')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </motion.section>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200/50 dark:border-red-700/30 p-4 flex items-start gap-3"
                  role="alert"
                >
                  <span className="text-red-500 dark:text-red-400 text-lg mt-0.5" aria-hidden="true">⚠</span>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              custom={4}
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              className="flex items-center justify-end gap-3 pt-2"
            >
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || hasErrors}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {isEdit ? t('saving') : t('creating')}
                  </span>
                ) : (
                  isEdit ? t('save') : t('create')
                )}
              </button>
            </motion.div>
          </form>
        </main>
      </div>
    </motion.div>
  );
}
