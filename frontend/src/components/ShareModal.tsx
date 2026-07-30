import { useState, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shareEntry } from '../api/shares';
import { getFriends } from '../api/friends';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '../context/LocaleContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareModalProps {
  entryId: string;
  onClose: () => void;
}

export default function ShareModal({ entryId, onClose }: ShareModalProps) {
  const [publicId, setPublicId] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => getFriends().then(res => res.data),
  });

  const handleShare = async (friendPublicId: string) => {
    setIsLoading(true);
    try {
      await shareEntry(entryId, friendPublicId, permission);
      setMessage(t('shareSuccess'));
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setMessage(err.response?.data?.error || t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!publicId.trim()) return;
    await handleShare(publicId.trim().toUpperCase());
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card rounded-2xl w-full max-w-md p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <header className="flex items-center justify-between mb-6">
            <h2 id="share-modal-title" className="text-lg font-semibold text-text">{t('shareEntry')}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400" aria-label={t('close')}>
              <span aria-hidden="true">✕</span>
            </button>
          </header>

          {friends && friends.length > 0 && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-400 mb-2">{t('selectFriend')}</label>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {friends.map(friend => (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => handleShare(friend.public_id)}
                      disabled={isLoading}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left disabled:opacity-40"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm text-indigo-300 font-medium shrink-0">
                        {(friend.nickname || friend.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-text truncate">
                          {friend.nickname || friend.email || t('unknown')}
                        </div>
                        <div className="text-xs text-text-muted">#{friend.public_id}</div>
                      </div>
                      <span className="text-xs text-indigo-400 shrink-0">{t('share')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs text-text-muted">
              <span className="bg-[var(--bg-card)] px-2">{t('or')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="share-public-id" className="block text-sm font-medium text-gray-400 mb-1.5">
                {t('userPublicId')}
              </label>
              <input
                id="share-public-id"
                type="text"
                placeholder="#123456"
                value={publicId}
                onChange={e => setPublicId(e.target.value.toUpperCase())}
                className="input-field w-full"
                disabled={isLoading}
                autoFocus={!friends || friends.length === 0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">{t('permission')}</label>
              <div className="flex gap-3">
                {(['view', 'edit'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPermission(p)}
                    disabled={isLoading}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      permission === p
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {p === 'view' ? t('viewOnly') : t('canEdit')}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 rounded-xl text-sm ${
                    message === t('shareSuccess')
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                  role="alert"
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <footer className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5 rounded-xl text-sm" disabled={isLoading}>
                {t('cancel')}
              </button>
              <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl text-sm" disabled={isLoading || !publicId.trim()}>
                {isLoading ? t('sharing') : t('share')}
              </button>
            </footer>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
