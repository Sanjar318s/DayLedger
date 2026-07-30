import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Entry, updateEntry } from '../api/entries';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { getSocket } from '../api/socket';
import { motion } from 'framer-motion';

const currencySymbols: Record<string, string> = { UZS: 'сум', USD: '$', EUR: '€', RUB: '₽' };

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function EntryViewPage() {
  const { id } = useParams();
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [localDescription, setLocalDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef('');
  const userInputRef = useRef('');
  const socketRef = useRef(getSocket(user?.id));

  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['entry', id],
    queryFn: () =>
      apiClient
        .get<Entry & { permission?: string }>(`/entries/${id}`)
        .then(res => res.data),
    enabled: !!id,
  });

  useEffect(() => {
    userInputRef.current = localDescription;
  }, [localDescription]);

  useEffect(() => {
    if (entry) {
      const serverDesc = entry.description || '';
      const previousServer = lastSavedRef.current;
      const currentUserInput = userInputRef.current;

      if (previousServer && currentUserInput !== previousServer) {
        const unsaved = currentUserInput.slice(previousServer.length);
        if (unsaved.trim().length > 0) {
          const merged = serverDesc + (serverDesc ? '\n' : '') + unsaved;
          setLocalDescription(merged);
          lastSavedRef.current = serverDesc;
          userInputRef.current = merged;
          return;
        }
      }

      setLocalDescription(serverDesc);
      lastSavedRef.current = serverDesc;
      userInputRef.current = serverDesc;
    }
  }, [entry?.description]);

  const saveMutation = useMutation({
    mutationFn: (desc: string) => updateEntry(id!, { description: desc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entry', id] });
      setIsSaving(false);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!id || localDescription === lastSavedRef.current) return;
    const timer = setTimeout(() => {
      lastSavedRef.current = localDescription;
      saveMutation.mutate(localDescription);
      setIsSaving(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [localDescription, id]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleEntryUpdated = (data: any) => {
      if (data.entry?.id === id) {
        queryClient.setQueryData(['entry', id], (old: any) => {
          if (!old) return old;
          return { ...old, description: data.entry.description };
        });
      }
    };

    socket.on('entry_updated', handleEntryUpdated);
    return () => {
      socket.off('entry_updated', handleEntryUpdated);
    };
  }, [id, queryClient]);

  const handleManualSave = () => {
    lastSavedRef.current = localDescription;
    saveMutation.mutate(localDescription);
    setIsSaving(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-8 dark:bg-slate-800/80 dark:border-slate-700/20">
            <div className="space-y-6 animate-pulse">
              <div className="h-7 w-2/3 bg-gray-200 dark:bg-slate-700 rounded-lg" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-200/80 dark:bg-slate-700/80 rounded" />
                <div className="h-4 w-5/6 bg-gray-200/80 dark:bg-slate-700/80 rounded" />
                <div className="h-4 w-3/4 bg-gray-200/80 dark:bg-slate-700/80 rounded" />
              </div>
              <div className="border-t border-gray-100 dark:border-slate-700/50 pt-6">
                <div className="h-5 w-1/4 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-24 w-full bg-gray-200/60 dark:bg-slate-700/60 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-10 text-center max-w-md dark:bg-slate-800/80 dark:border-slate-700/20"
        >
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('entryNotFound')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{t('entryNotFoundMessage')}</p>
          <Link to="/" className="btn-primary inline-flex">
            {t('backToDashboard')}
          </Link>
        </motion.div>
      </div>
    );
  }

  const isOwner = entry.user_id === user?.id;
  const canEdit = isOwner || entry.permission === 'edit';
  const isEditor = canEdit && !isOwner;
  const symbol = currencySymbols[entry.currency || 'UZS'] || entry.currency;

  return (
    <motion.div
      className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-md text-gray-600 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 dark:bg-slate-800/80 dark:border-slate-700/20 dark:text-gray-300 dark:hover:text-indigo-400"
              aria-label={t('back')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-gray-400 hover:text-indigo-500 transition-colors dark:text-gray-500 dark:hover:text-indigo-400">
                {t('dashboard')}
              </Link>
              <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">/</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                {entry.title}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <Link
                to={`/entry/${entry.id}/edit`}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {t('edit')}
              </Link>
            )}
            {isEditor && (
              <button
                onClick={handleManualSave}
                className="btn-primary inline-flex items-center gap-2"
                disabled={saveMutation.isPending || isSaving}
              >
                {saveMutation.isPending || isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </button>
            )}
            <button onClick={() => navigate(-1)} className="btn-secondary">
              {t('close')}
            </button>
          </div>
        </header>

        <main>
          <motion.article
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-8 dark:bg-slate-800/80 dark:border-slate-700/20"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.header variants={staggerItem}>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{entry.title}</h1>
              <div className="flex flex-wrap gap-2 mb-6">
                {entry.amount && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    entry.amount_type === 'income'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-red-500 text-white shadow-sm'
                  }`}>
                    {entry.amount_type === 'income' ? '+' : '-'}{entry.amount} {symbol}
                  </span>
                )}
                {entry.category && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500 text-white shadow-sm">
                    {entry.category}
                  </span>
                )}
                {entry.remind_before_minutes && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white shadow-sm">
                    🔔 {entry.remind_before_minutes} {t('minutesBefore')}
                  </span>
                )}
                {entry.is_done && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-sm">
                    {t('completed')}
                  </span>
                )}
              </div>
            </motion.header>

            <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50/80 dark:bg-slate-700/40 rounded-xl p-4">
                <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('eventAt')}</dt>
                <dd className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  📅 {format(parseISO(entry.event_at), 'EEEE, d MMMM yyyy, HH:mm')}
                </dd>
              </div>
              {entry.amount && (
                <div className="bg-gray-50/80 dark:bg-slate-700/40 rounded-xl p-4">
                  <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('amount')}</dt>
                  <dd className="text-sm font-medium">
                    <span className={entry.amount_type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {entry.amount} {symbol}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 ml-2">
                      ({entry.amount_type === 'income' ? t('income') : t('expense')})
                    </span>
                  </dd>
                </div>
              )}
              <div className="bg-gray-50/80 dark:bg-slate-700/40 rounded-xl p-4">
                <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('category')}</dt>
                <dd className="text-sm font-medium text-gray-800 dark:text-gray-100">{entry.category || t('none')}</dd>
              </div>
              {entry.created_at && (
                <div className="bg-gray-50/80 dark:bg-slate-700/40 rounded-xl p-4">
                  <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('createdAt')}</dt>
                  <dd className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    ✨ {format(parseISO(entry.created_at), 'EEEE, d MMMM yyyy, HH:mm')}
                  </dd>
                </div>
              )}
              {entry.owner_nickname && !isOwner && (
                <div className="bg-gray-50/80 dark:bg-slate-700/40 rounded-xl p-4">
                  <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('owner')}</dt>
                  <dd className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    👤 {entry.owner_nickname} #{entry.owner_public_id}
                  </dd>
                </div>
              )}
            </motion.div>

            <div className="border-t border-gray-100 dark:border-slate-700/50 pt-6">
              <motion.section variants={staggerItem} aria-labelledby="description-heading">
                <h2 id="description-heading" className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  {t('description')}
                </h2>

                {canEdit ? (
                  <div>
                    <textarea
                      value={localDescription}
                      onChange={e => setLocalDescription(e.target.value)}
                      rows={10}
                      placeholder={t('descriptionPlaceholder')}
                      className="input-field resize-y min-h-[200px]"
                      aria-describedby="description-hint"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span id="description-hint" className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                        {isSaving ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {t('saving')}
                          </>
                        ) : lastSavedRef.current !== localDescription ? (
                          <span className="text-amber-500 dark:text-amber-400">{t('unsavedChanges')}</span>
                        ) : (
                          t('autoSaved')
                        )}
                      </span>
                      {isEditor && (
                        <button
                          onClick={handleManualSave}
                          className="btn-primary text-xs px-3 py-1.5"
                          disabled={saveMutation.isPending || isSaving}
                        >
                          {saveMutation.isPending || isSaving ? t('saving') : t('saveNow')}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {entry.description ? (
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans bg-gray-50/80 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700/30">
                        {entry.description}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('noDescription')}</p>
                    )}
                  </div>
                )}
              </motion.section>
            </div>
          </motion.article>
        </main>
      </div>
    </motion.div>
  );
}
