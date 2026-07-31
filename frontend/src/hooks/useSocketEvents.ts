import { useEffect } from 'react';
import { getSocket } from '../api/socket';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { Friend } from '../api/friends';

export const useSocketEvents = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.id);

    // Присоединяемся к своей комнате
    socket.emit('join', { userId: user.id });

    const handleFriendRequest = (data: any) => {
      const message = `Заявка в друзья от #${data.from_public_id} ${data.from_nickname || ''}`;
      addToast(message);

      if (window.__playNotificationSound) {
        window.__playNotificationSound();
      }

      // Браузерное уведомление со звуком
      if (Notification.permission === 'granted') {
        new Notification('DayLedger', {
          body: message,
          icon: '/icons/icon-192.png',
          silent: false, // будет звук по умолчанию
        });
      }

      // Обновить список заявок в колокольчике (перезапросить friendRequests)
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    };

    const handleFriendResponse = (data: any) => {
      let message;
      if (data.type === 'accepted') {
        message = `#${data.from_public_id} ${data.from_nickname || ''} принял(а) вашу заявку в друзья`;
      } else {
        message = `#${data.from_public_id} ${data.from_nickname || ''} отклонил(а) вашу заявку в друзья`;
      }
      addToast(message);

      if (window.__playNotificationSound) {
        window.__playNotificationSound();
      }

      if (Notification.permission === 'granted') {
        new Notification('DayLedger', {
          body: message,
          icon: '/icons/icon-192.png',
          silent: false,
        });
      }

      // Обновить списки друзей и заявок
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    };

    const handleFriendStatus = (data: any) => {
      queryClient.setQueryData<Friend[]>(['friends'], (old) =>
        old?.map(f => f.id === data.userId ? { ...f, is_online: data.online } : f)
      );
    };

    const handleMessagesRead = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    };

    const handleEntryUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['sharedWithMe'] });
    };

    const handleShareInvite = (data: any) => {
      const message = `Новый доступ к записи: ${data.entry_title || ''}`;
      addToast(message);
      if (window.__playNotificationSound) {
        window.__playNotificationSound();
      }
      if (Notification.permission === 'granted') {
        new Notification('DayLedger', {
          body: message,
          icon: '/icons/icon-192.png',
          silent: false,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['shareInvites'] });
    };

    socket.on('friend_request', handleFriendRequest);
    socket.on('friend_response', handleFriendResponse);
    socket.on('friend_status', handleFriendStatus);
    socket.on('messages_read', handleMessagesRead);
    socket.on('entry_updated', handleEntryUpdated);
    socket.on('share_invite', handleShareInvite);

    return () => {
      socket.off('friend_request', handleFriendRequest);
      socket.off('friend_response', handleFriendResponse);
      socket.off('friend_status', handleFriendStatus);
      socket.off('messages_read', handleMessagesRead);
      socket.off('entry_updated', handleEntryUpdated);
    };
  }, [user, addToast, queryClient]);
};
