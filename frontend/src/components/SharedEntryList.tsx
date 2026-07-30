import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteShare } from '../api/shares';
import type { Entry } from '../api/entries';
import { motion } from 'framer-motion';

interface SharedEntry extends Entry {
  share_id: string;
  permission: 'view' | 'edit';
  owner_public_id: string;
  owner_nickname: string;
}

interface Props {
  entries: SharedEntry[];
}

export default function SharedEntryList({ entries }: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const leaveMutation = useMutation({
    mutationFn: (shareId: string) => deleteShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedWithMe'] });
    },
  });

  if (!entries.length) return <p className="text-center text-gray-500 py-8">{t('noSharedEntries')}</p>;

  return (
    <ul className="space-y-3">
      {entries.map((entry, index) => (
        <motion.li
          key={entry.share_id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay: index * 0.05 } }}
          className="glass-card rounded-2xl p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text truncate">{entry.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span>{entry.owner_nickname || `#${entry.owner_public_id}`}</span>
                <span className="text-gray-600">•</span>
                <span className={entry.permission === 'edit' ? 'text-indigo-400' : 'text-gray-500'}>
                  {entry.permission === 'edit' ? '✎' : '👁'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <Link
                to={`/entry/${entry.id}`}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/30 transition-colors"
              >
                {t('open')}
              </Link>
              <button
                onClick={() => leaveMutation.mutate(entry.share_id)}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors"
              >
                {t('leave')}
              </button>
            </div>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
