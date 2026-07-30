import { Entry, deleteEntry, updateEntry } from '../api/entries';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '../context/LocaleContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import ShareModal from './ShareModal';

const currencySymbols: Record<string, string> = {
  UZS: 'сум',
  USD: '$',
  EUR: '€',
  RUB: '₽',
};

export default function EntryList({ entries }: { entries: Entry[] }) {
  const queryClient = useQueryClient();
  const { t } = useLocale();
  const [shareEntryId, setShareEntryId] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleDone = async (entry: Entry) => {
    await updateEntry(entry.id, { is_done: !entry.is_done });
    queryClient.invalidateQueries({ queryKey: ['entries'] });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('deleteConfirm'))) {
      await deleteEntry(id);
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    }
  };

  const toggleExpand = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  if (!entries.length) {
    return (
      <div className="text-center py-12 text-gray-400" role="status">
        <div className="text-4xl mb-4" aria-hidden="true">📝</div>
        <h3 className="text-lg font-semibold text-gray-300 mb-1">{t('noEntries')}</h3>
        <p className="text-sm text-gray-400">{t('noEntriesMessage')}</p>
      </div>
    );
  }

  return (
    <>
      <motion.ul
        className="space-y-3"
        role="list"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {entries.map((entry) => {
          const entryCurrency = entry.currency || 'UZS';
          const symbol = currencySymbols[entryCurrency] || entryCurrency;
          const createdDate = entry.created_at
            ? format(parseISO(entry.created_at), 'dd.MM.yyyy')
            : '';
          const isExpanded = expandedEntries.has(entry.id);
          const description = entry.description || '';
          const shouldTruncate = description.length > 150;
          const displayDescription = shouldTruncate && !isExpanded
            ? description.slice(0, 150) + '...'
            : description;

          return (
            <motion.li
              key={entry.id}
              className={`glass-card rounded-2xl p-4 hover:bg-white/5 transition ${entry.is_done ? 'opacity-60' : ''}`}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <div className="space-y-2">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    to={`/entry/${entry.id}`}
                    className="text-lg font-semibold hover:text-indigo-400 transition"
                    aria-label={`${t('viewEntry')}: ${entry.title}`}
                  >
                    {entry.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.amount && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300">
                        {entry.amount} {symbol} ({entry.amount_type === 'income' ? t('income') : t('expense')})
                      </span>
                    )}
                    {entry.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-300">
                        {entry.category}
                      </span>
                    )}
                    {entry.remind_before_minutes && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                        🔔 {entry.remind_before_minutes} {t('minutesBefore')}
                      </span>
                    )}
                  </div>
                </header>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {createdDate && (
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true">📅</span>
                      {createdDate}
                    </span>
                  )}
                  {entry.event_at && (
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true">⏰</span>
                      {format(parseISO(entry.event_at), 'dd.MM.yyyy HH:mm')}
                    </span>
                  )}
                </div>

                {description && (
                  <div>
                    <p className={`text-sm text-gray-300 ${shouldTruncate && !isExpanded ? 'max-h-20 overflow-hidden' : ''}`}>
                      {displayDescription}
                    </p>
                    {shouldTruncate && (
                      <button
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition mt-1"
                        onClick={() => toggleExpand(entry.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`entry-desc-${entry.id}`}
                      >
                        {isExpanded ? t('showLess') : t('showMore')}
                        <span className="ml-1" aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <footer className="flex items-center justify-end pt-2 border-t border-white/5 mt-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleDone(entry)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${entry.is_done ? 'bg-green-500/20 text-green-400' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                    aria-label={entry.is_done ? t('markIncomplete') : t('markComplete')}
                    title={entry.is_done ? t('markIncomplete') : t('markComplete')}
                  >
                    {entry.is_done ? '↩' : '✓'}
                  </button>
                  <Link
                    to={`/entry/${entry.id}/edit`}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-gray-300"
                    aria-label={t('edit')}
                    title={t('edit')}
                  >
                    ✎
                  </Link>
                  <button
                    onClick={() => setShareEntryId(entry.id)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-gray-300"
                    aria-label={t('share')}
                    title={t('share')}
                  >
                    ↗
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 transition flex items-center justify-center text-red-400"
                    aria-label={t('delete')}
                    title={t('delete')}
                  >
                    ✕
                  </button>
                </div>
              </footer>
            </motion.li>
          );
        })}
      </motion.ul>
      {shareEntryId && (
        <ShareModal entryId={shareEntryId} onClose={() => setShareEntryId(null)} />
      )}
    </>
  );
}
