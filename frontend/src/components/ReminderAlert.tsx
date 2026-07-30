import { useQuery } from '@tanstack/react-query';
import { getEntries } from '../api/entries';
import { format, parseISO } from 'date-fns';
import { useLocale } from '../context/LocaleContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReminderAlert() {
  const now = new Date().toISOString();
  const { t } = useLocale();
  const { data } = useQuery({
    queryKey: ['overdue'],
    queryFn: () => getEntries('2000-01-01', now).then(res => res.data.filter(e => !e.is_done && new Date(e.event_at) < new Date())),
    refetchInterval: 60_000,
  });

  if (!data?.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-amber-400" aria-hidden="true">⚠️</span>
          <span className="text-sm font-semibold text-amber-300">{t('overdue')}</span>
        </div>
        <ul className="space-y-1 ml-6">
          {data.map(e => (
            <li key={e.id} className="text-sm text-amber-200/80">
              {e.title} — {format(parseISO(e.event_at), 'dd.MM HH:mm')}
            </li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}
