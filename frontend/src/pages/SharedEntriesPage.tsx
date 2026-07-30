import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSharedWithMe, getSharedByMe, deleteShare, updateSharePermission } from '../api/shares';
import { deleteEntry } from '../api/entries';
import { useLocale } from '../context/LocaleContext';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SharedEntriesPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'withMe' | 'byMe'>('withMe');

  const { data: sharedWithMe, isLoading: loadingWithMe } = useQuery({
    queryKey: ['sharedWithMe'],
    queryFn: () => getSharedWithMe().then(res => res.data),
    enabled: tab === 'withMe',
  });

  const { data: sharedByMe, isLoading: loadingByMe } = useQuery({
    queryKey: ['sharedByMe'],
    queryFn: () => getSharedByMe().then(res => res.data),
    enabled: tab === 'byMe',
  });

  const leaveMutation = useMutation({
    mutationFn: deleteShare,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sharedWithMe'] }); queryClient.invalidateQueries({ queryKey: ['sharedByMe'] }); },
  });

  const changePermissionMutation = useMutation({
    mutationFn: ({ shareId, permission }: { shareId: string; permission: string }) => updateSharePermission(shareId, permission),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sharedByMe'] }),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sharedByMe'] }); queryClient.invalidateQueries({ queryKey: ['entries'] }); },
  });

  const handleDeleteEntry = (entryId: string) => {
    if (window.confirm(t('confirmDeleteEntry'))) deleteEntryMutation.mutate(entryId);
  };

  const groupedByEntry = sharedByMe?.reduce((acc, share) => {
    if (!acc[share.entry_id]) acc[share.entry_id] = { entry_id: share.entry_id, entry_title: share.entry_title || share.entry_id, shares: [] };
    acc[share.entry_id].shares.push(share);
    return acc;
  }, {} as Record<string, { entry_id: string; entry_title: string; shares: typeof sharedByMe }>) || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('sharedEntries')}</h1>

      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit">
        {(['withMe', 'byMe'] as const).map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {key === 'withMe' ? t('sharedWithMe') : t('sharedByMe')}
          </button>
        ))}
      </div>

      {tab === 'withMe' && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/20 p-6">
          {loadingWithMe ? <p className="text-gray-400 text-center py-8">{t('loading')}</p>
            : sharedWithMe?.length ? (
              <ul className="space-y-3">
                {sharedWithMe.map(entry => (
                  <li key={entry.share_id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div>
                      <span className="font-medium">{entry.title}</span>
                      <span className="ml-2 text-sm text-gray-400">({entry.owner_nickname || '#' + entry.owner_public_id})</span>
                      {entry.permission === 'edit' && <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">✎ {t('edit')}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/entry/${entry.id}`} className="btn-secondary text-sm py-1.5 px-3">{t('open')}</Link>
                      <button onClick={() => leaveMutation.mutate(entry.share_id)} className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5">{t('leave')}</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-400 text-center py-8">{t('noSharedEntries')}</p>}
        </div>
      )}

      {tab === 'byMe' && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/20 p-6">
          {loadingByMe ? <p className="text-gray-400 text-center py-8">{t('loading')}</p>
            : Object.keys(groupedByEntry).length > 0 ? (
              <div className="space-y-6">
                {Object.values(groupedByEntry).map(group => (
                  <div key={group.entry_id} className="border border-gray-100 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{group.entry_title}</h3>
                      <button onClick={() => handleDeleteEntry(group.entry_id)} className="text-sm text-red-500 hover:text-red-700">{t('deleteEntry')}</button>
                    </div>
                    <ul className="space-y-2">
                      {group.shares.map(share => (
                        <li key={share.id} className="flex items-center gap-3 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{share.friend_nickname || `#${share.friend_public_id}`}</span>
                          <select value={share.permission} onChange={(e) => changePermissionMutation.mutate({ shareId: share.id, permission: e.target.value })}
                            className="input-field !py-1 !px-2 text-xs w-24">
                            <option value="view">{t('view')}</option>
                            <option value="edit">{t('edit')}</option>
                          </select>
                          <button onClick={() => leaveMutation.mutate(share.id)} className="text-red-500 hover:text-red-700 text-xs">{t('removeFriend')}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-center py-8">{t('noSharedByMe')}</p>}
        </div>
      )}
    </motion.div>
  );
}
