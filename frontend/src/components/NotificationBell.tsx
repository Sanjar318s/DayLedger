import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEntries, Entry } from '../api/entries';
import { format, parseISO } from 'date-fns';
import { useLocale } from '../context/LocaleContext';
import { useSound } from '../context/SoundContext';
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../api/friends';
import { getShareInvites, respondToShare } from '../api/shares';
import { markAllMessagesRead } from '../api/messages';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const { t } = useLocale();
  const { muted } = useSound();
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const now = new Date().toISOString();
  const { data: overdueEntries = [] } = useQuery<Entry[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await getEntries('2000-01-01', now);
      return res.data.filter(e => !e.is_done && new Date(e.event_at) <= new Date());
    },
    refetchInterval: 60000,
  });

  const { data: requests } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      const res = await getFriendRequests();
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: shareInvites = [] } = useQuery({
    queryKey: ['shareInvites'],
    queryFn: () => getShareInvites().then(res => res.data),
    refetchInterval: 30000,
  });

  const { data: unreadMessages } = useQuery<{ count: number }>({
    queryKey: ['unreadMessagesCount'],
    queryFn: async () => {
      const res = await apiClient.get('/messages/unread/count');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const incomingRequests = requests?.incoming || [];
  const unreadChatCount = unreadMessages?.count || 0;

  const acceptMutation = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
  const rejectMutation = useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });

  const acceptShareMutation = useMutation({
    mutationFn: (shareId: string) => respondToShare(shareId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shareInvites'] });
      queryClient.invalidateQueries({ queryKey: ['sharedWithMe'] });
    },
  });
  const rejectShareMutation = useMutation({
    mutationFn: (shareId: string) => respondToShare(shareId, false),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shareInvites'] }),
  });

  const unreadCount = overdueEntries.length + incomingRequests.length + unreadChatCount + shareInvites.length;

  const prevIncomingLength = useRef(incomingRequests.length);
  useEffect(() => {
    if (incomingRequests.length > prevIncomingLength.current && !muted) {
      window.__playNotificationSound?.();
    }
    prevIncomingLength.current = incomingRequests.length;
  }, [incomingRequests.length, muted]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    markAllMessagesRead().then(() => {
      queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
    }).catch(() => {});
  }, [open, queryClient]);

  return (
    <div className="relative" ref={bellRef}>
      <button
        className="relative w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-xl"
        onClick={() => setOpen(!open)}
        title={t('notifications')}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-80 glass-card rounded-2xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">{t('notifications')}</h4>

            {unreadChatCount > 0 && (
              <div className="mb-3">
                <Link
                  to="/chat"
                  onClick={() => setOpen(false)}
                  className="block p-2 rounded-xl hover:bg-white/5 transition text-sm text-indigo-400"
                >
                  📩 {unreadChatCount} {t('unreadMessages')}
                </Link>
              </div>
            )}

            {shareInvites.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">{t('sharedEntries')}</h5>
                <ul className="space-y-1">
                  {shareInvites.map(invite => (
                    <li key={invite.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">{invite.title}</div>
                        <div className="text-xs text-gray-400">
                          {invite.owner_nickname || '#' + invite.owner_public_id}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <button
                          onClick={() => acceptShareMutation.mutate(invite.id)}
                          disabled={acceptShareMutation.isPending}
                          className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition flex items-center justify-center text-sm"
                        >✓</button>
                        <button
                          onClick={() => rejectShareMutation.mutate(invite.id)}
                          disabled={rejectShareMutation.isPending}
                          className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition flex items-center justify-center text-sm"
                        >✕</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {incomingRequests.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">{t('friendRequests')}</h5>
                <ul className="space-y-1">
                  {incomingRequests.map(req => (
                    <li key={req.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">
                          {req.nickname ? `${req.nickname} (#${req.public_id})` : `#${req.public_id}`}
                        </div>
                        <div className="text-xs text-gray-400">{t('wantsToBeFriend')}</div>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <button
                          onClick={() => acceptMutation.mutate(req.id)}
                          disabled={acceptMutation.isPending}
                          className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition flex items-center justify-center text-sm"
                        >✓</button>
                        <button
                          onClick={() => rejectMutation.mutate(req.id)}
                          disabled={rejectMutation.isPending}
                          className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition flex items-center justify-center text-sm"
                        >✕</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {overdueEntries.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">{t('missedEvents')}</h5>
                <ul className="space-y-1">
                  {overdueEntries.map(entry => (
                    <li key={entry.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">{entry.title}</div>
                        <div className="text-xs text-gray-400">
                          {format(parseISO(entry.event_at), 'dd.MM.yyyy HH:mm')}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {incomingRequests.length === 0 && overdueEntries.length === 0 && unreadChatCount === 0 && shareInvites.length === 0 && (
              <p className="text-center py-8 text-gray-500 text-sm">{t('noNotifications')}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
