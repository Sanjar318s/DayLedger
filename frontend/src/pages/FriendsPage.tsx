import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
  deleteFriend,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from '../api/friends';
import { useLocale } from '../context/LocaleContext';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { motion, AnimatePresence } from 'framer-motion';

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

export default function FriendsPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [publicId, setPublicId] = useState('');
  const [message, setMessage] = useState('');
  const [showBlocked, setShowBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const menuFriendRef = useRef<{ id: string; public_id: string } | null>(null);

  const { data: requests } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => getFriendRequests().then(res => res.data),
  });

  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => getFriends().then(res => res.data),
  });

  const { data: blockedUsers } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: () => getBlockedUsers().then(res => res.data),
    enabled: showBlocked,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendFriendRequest(publicId),
    onSuccess: () => { setMessage(t('requestSent')); setPublicId(''); queryClient.invalidateQueries({ queryKey: ['friendRequests'] }); },
    onError: (err: any) => setMessage(err.response?.data?.error || t('error')),
  });

  const acceptMutation = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friendRequests'] }); queryClient.invalidateQueries({ queryKey: ['friends'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendRequests'] }),
  });

  const removeFriendMutation = useMutation({
    mutationFn: deleteFriend,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friends'] }); queryClient.invalidateQueries({ queryKey: ['friendRequests'] }); closeMenu(); },
  });

  const unblockMutation = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blockedUsers'] }),
  });

  const handleSend = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (publicId.trim()) sendMutation.mutate();
  }, [publicId, sendMutation]);

  const handleMenuClick = useCallback((friendId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuOpen === friendId) {
      setMenuOpen(null);
      setMenuAnchor(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      setMenuOpen(friendId);
    }
  }, [menuOpen]);

  const closeMenu = useCallback(() => {
    setMenuOpen(null);
    setMenuAnchor(null);
  }, []);

  const currentFriend = friends?.find(f => f.id === menuOpen) || null;
  if (currentFriend) menuFriendRef.current = { id: currentFriend.id, public_id: currentFriend.public_id };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('friends')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('manageYourFriends')}</p>
      </header>

      <motion.section {...fadeUp} className="card p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t('addFriend')}</h2>
        <form onSubmit={handleSend} className="flex gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="friend-public-id" className="block text-sm font-medium mb-1">{t('userPublicId')}</label>
            <input
              id="friend-public-id" type="text" placeholder="#123456"
              value={publicId} onChange={e => setPublicId(e.target.value.toUpperCase())}
              required className="input-field" disabled={sendMutation.isPending}
            />
          </div>
          <button type="submit" className="btn-primary h-[42px]" disabled={sendMutation.isPending || !publicId.trim()}>
            {sendMutation.isPending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('sendRequest')}
          </button>
        </form>
        {message && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-3 p-3 rounded-xl text-sm font-medium ${message === t('requestSent') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {message}
          </motion.div>
        )}
      </motion.section>

      <motion.section {...fadeUp} className="card p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t('incomingRequests')}</h2>
        {requests?.incoming.length ? (
          <motion.ul {...stagger} initial="initial" animate="animate" className="space-y-3">
            {requests.incoming.map((req) => (
              <motion.li key={req.id} variants={fadeUp} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar avatarUrl={req.avatar_url} nickname={req.nickname} size={40} />
                  <span className="font-medium text-slate-700 dark:text-slate-200">{req.nickname ? `${req.nickname} (#${req.public_id})` : `#${req.public_id}`}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptMutation.mutate(req.id)} disabled={acceptMutation.isPending} className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors">
                    {t('accept')}
                  </button>
                  <button onClick={() => rejectMutation.mutate(req.id)} disabled={rejectMutation.isPending} className="btn-danger text-sm py-1.5 px-3">
                    {t('reject')}
                  </button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">{t('noIncomingRequestsMessage')}</p>
        )}
      </motion.section>

      <motion.section {...fadeUp} className="card p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t('outgoingRequests')}</h2>
        {requests?.outgoing.length ? (
          <motion.ul {...stagger} initial="initial" animate="animate" className="space-y-3">
            {requests.outgoing.map((req) => (
              <motion.li key={req.id} variants={fadeUp} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <Avatar avatarUrl={req.avatar_url} nickname={req.nickname} size={40} />
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{req.nickname ? `${req.nickname} (#${req.public_id})` : `#${req.public_id}`}</span>
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{t('pending')}</span>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">{t('noOutgoingRequestsMessage')}</p>
        )}
      </motion.section>

      <motion.section {...fadeUp} className="card p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t('myFriends')}</h2>
        {friends?.length ? (
          <motion.ul {...stagger} initial="initial" animate="animate" className="space-y-2">
            {friends.map((friend) => (
              <motion.li key={friend.id} variants={fadeUp} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${friend.public_id}`}>
                    <Avatar avatarUrl={friend.avatar_url} nickname={friend.nickname} size={44} frameCss={friend.active_frame_css} />
                  </Link>
                  <Link to={`/profile/${friend.public_id}`} className="font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {friend.nickname ? `${friend.nickname} (#${friend.public_id})` : `#${friend.public_id}`}
                  </Link>
                </div>
                <div className="relative">
                  <button onClick={(e) => handleMenuClick(friend.id, e)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors" aria-label={t('moreActions')}>⋯</button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{t('noFriendsMessage')}</p>
            <button className="btn-primary" onClick={() => document.getElementById('friend-public-id')?.focus()}>{t('addFirstFriend')}</button>
          </div>
        )}
      </motion.section>

      <motion.section {...fadeUp} className="card">
        <button onClick={() => setShowBlocked(!showBlocked)} className="w-full flex items-center justify-between p-6 text-left">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t('blockedUsers')}</h2>
          <span className="text-slate-400">{showBlocked ? '▲' : '▼'}</span>
        </button>
        <AnimatePresence>
          {showBlocked && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-6 pb-6">
                {blockedUsers?.length ? (
                  <ul className="space-y-3">
                    {blockedUsers.map((user) => (
                      <li key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          <Avatar avatarUrl={user.avatar_url} nickname={user.nickname} size={40} />
                          <span className="text-slate-700 dark:text-slate-300">{user.nickname ? `${user.nickname} (#${user.public_id})` : `#${user.public_id}`}</span>
                        </div>
                        <button onClick={() => unblockMutation.mutate(user.id)} disabled={unblockMutation.isPending} className="btn-secondary text-sm py-1.5 px-3">{t('unblock')}</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-4">{t('noBlockedUsersMessage')}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Portal dropdown */}
      {menuOpen && menuAnchor && createPortal(
        <>
          <div className="fixed inset-0 z-[99]" onClick={closeMenu} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ position: 'fixed', top: menuAnchor.top, right: menuAnchor.right }}
            className="w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-indigo-500/20 dark:border-indigo-400/20 py-1 z-[100]"
          >
            {(() => {
              const f = menuFriendRef.current;
              if (!f) return null;
              return (
                <>
                  <Link to={`/profile/${f.public_id}`} className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700" onClick={closeMenu}>👤 {t('viewProfile')}</Link>
                  <Link to="/chat" className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700" onClick={closeMenu}>💬 {t('chat')}</Link>
                  <hr className="my-1 border-gray-100 dark:border-slate-700" />
                  <button onClick={() => { removeFriendMutation.mutate(f.id); closeMenu(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700">🗑 {t('delete')}</button>
                  <button onClick={() => { blockMutation.mutate(f.public_id); closeMenu(); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">🚫 {t('block')}</button>
                </>
              );
            })()}
          </motion.div>
        </>,
        document.body
      )}
    </motion.div>
  );
}
