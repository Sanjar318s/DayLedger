import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { getSocket } from '../api/socket';
import { getMessages, markMessagesRead, Message } from '../api/messages';
import { useAuth } from '../hooks/useAuth';
import { useSound } from '../context/SoundContext';
import { useQueryClient } from '@tanstack/react-query';

interface ChatState {
  activeFriendId: string | null;
  setActiveFriendId: (id: string | null) => void;
  messages: Message[];
  sendMessage: (text: string) => void;
  loading: boolean;
  replyingToMessage: Message | null;
  setReplyingToMessage: (msg: Message | null) => void;
}

const ChatContext = createContext<ChatState>({
  activeFriendId: null,
  setActiveFriendId: () => {},
  messages: [],
  sendMessage: () => {},
  loading: false,
  replyingToMessage: null,
  setReplyingToMessage: () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { muted } = useSound();
  const queryClient = useQueryClient();
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.id);
    socket.emit('join', { userId: user.id });
    socketRef.current = socket;

    const handleNewMessage = (msg: Message) => {
      // Если сообщение входящее (не от нас)
      if (msg.sender_id !== user.id) {
        // Обновим счётчик непрочитанных
        queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });

        if (msg.sender_id === activeFriendId) {
          // Диалог открыт — сразу помечаем прочитанным
          socket.emit('mark_read', { friendId: msg.sender_id });
          setMessages(prev =>
            prev.map(m => (m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m))
          );
          // После mark_read тоже обновим счётчик
          queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
        } else {
          // Уведомление и звук
          if (Notification.permission === 'granted') {
            new Notification('DayLedger', {
              body: msg.text,
              icon: '/icons/icon-192.png',
              silent: false,
            });
          }
          window.__playNotificationSound?.();
        }
      }

      // Добавляем сообщение в список, если диалог открыт
      if (activeFriendId && (msg.sender_id === activeFriendId || msg.receiver_id === activeFriendId)) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleMessagesRead = (data: { read_by: string; message_ids: string[] }) => {
      setMessages(prev =>
        prev.map(m =>
          data.message_ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m
        )
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [user, activeFriendId, queryClient]);

  // При смене активного друга загружаем историю и помечаем прочитанным
  useEffect(() => {
    if (!user || !activeFriendId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    getMessages(activeFriendId)
      .then(res => {
        setMessages(res.data);
        // Оптимистично помечаем все входящие сообщения прочитанными
        setMessages(prev =>
          prev.map(m =>
            m.sender_id === activeFriendId && m.receiver_id === user.id && !m.read_at
              ? { ...m, read_at: new Date().toISOString() }
              : m
          )
        );
        // Отправляем mark_read на сервер
        socketRef.current?.emit('mark_read', { friendId: activeFriendId });
        markMessagesRead(activeFriendId).catch(() => {}); // надёжный REST-вызов
        // Обновляем счётчик непрочитанных
        queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
      })
      .finally(() => setLoading(false));
  }, [activeFriendId, user, queryClient]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!activeFriendId || !user || !text.trim()) return;
      socketRef.current?.emit('private_message', {
        to: activeFriendId,
        text: text.trim(),
        replyToId: replyingToMessage?.id || null,
      });
      setReplyingToMessage(null);
    },
    [activeFriendId, user, replyingToMessage]
  );

  return (
    <ChatContext.Provider
      value={{
        activeFriendId,
        setActiveFriendId,
        messages,
        sendMessage,
        loading,
        replyingToMessage,
        setReplyingToMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
