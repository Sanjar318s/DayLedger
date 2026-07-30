import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFriends } from '../api/friends';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../context/LocaleContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const listContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

export default function ChatPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const {
    activeFriendId,
    setActiveFriendId,
    messages,
    sendMessage,
    loading,
    replyingToMessage,
    setReplyingToMessage,
  } = useChat();
  const { startCall } = useCall();
  const [input, setInput] = useState('');

  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => getFriends().then(res => res.data),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  const activeFriend = friends?.find(f => f.id === activeFriendId);

  return (
    <motion.div
      className="flex h-[calc(100vh-80px)] gap-4 p-4 relative"
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={{ duration: 0.35 }}
    >
      {/* Sidebar */}
      <aside
        className={`glass rounded-2xl w-64 flex-shrink-0 flex flex-col overflow-hidden max-md:absolute max-md:inset-0 max-md:w-full max-md:z-10 ${activeFriendId ? 'max-md:hidden' : ''}`}
        aria-label={t('conversations')}
      >
        <header className="px-4 pt-4 pb-3 border-b border-white/10">
          <h2 className="text-lg font-bold text-text">{t('chats')}</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-2">
          {friends?.length ? (
            <ul className="space-y-1" role="list">
              {friends.map(friend => (
                <li key={friend.id}>
                  <button
                    onClick={() => setActiveFriendId(friend.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 text-left ${
                      friend.id === activeFriendId
                        ? 'bg-gray-200 dark:bg-white/15'
                        : 'hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                    role="option"
                    aria-selected={friend.id === activeFriendId}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        avatarUrl={friend.avatar_url}
                        nickname={friend.nickname}
                        size={44}
                        frameCss={(friend as any).active_frame_css}
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white/20 ${
                          friend.is_online ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                        aria-label={friend.is_online ? t('online') : t('offline')}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-text truncate">
                          {friend.nickname || friend.email || t('unknown')}
                        </span>
                        {friend.last_message_at && (
                          <span className="text-xs text-text-muted ml-2 flex-shrink-0">
                            {format(new Date(friend.last_message_at), 'HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <p className="text-text-muted text-sm">{t('noFriendsYet')}</p>
              <Link to="/friends" className="btn-primary text-sm py-2 px-4">
                {t('addFriends')}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <main
        className={`flex-1 flex flex-col glass rounded-2xl overflow-hidden max-md:absolute max-md:inset-0 max-md:z-10 ${!activeFriendId ? 'max-md:hidden' : ''}`}
        role="main"
      >
        {activeFriend ? (
          <>
            {/* Chat header */}
            <header className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 border-b border-white/10 overflow-visible">
              <button
                onClick={() => setActiveFriendId(null)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={t('back')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar
                  avatarUrl={activeFriend.avatar_url}
                  nickname={activeFriend.nickname}
                  size={40}
                  frameCss={(activeFriend as any).active_frame_css}
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-text truncate">
                    {activeFriend.nickname || activeFriend.email || t('unknown')}
                  </h3>
                  <span className={`text-xs ${activeFriend.is_online ? 'text-green-400' : 'text-text-muted'}`}>
                    {activeFriend.is_online ? t('online') : t('offline')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startCall(activeFriend.id, activeFriend.nickname || activeFriend.email || t('unknown'), 'audio')}
                  className="p-2.5 md:p-2 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
                  aria-label={t('call')}
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </button>
                <button
                  onClick={() => startCall(activeFriend.id, activeFriend.nickname || activeFriend.email || t('unknown'), 'video')}
                  className="p-2.5 md:p-2 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
                  aria-label={t('videoCall')}
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </button>
                <button className="p-2.5 md:p-2 rounded-lg hover:bg-white/10 transition-colors active:scale-95" aria-label={t('moreOptions')} style={{ touchAction: 'manipulation' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                  </svg>
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite" aria-label={t('messages')}>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" aria-hidden="true" />
                  <span className="text-sm">{t('loading')}</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <p className="text-text-muted">{t('noMessagesYet')}</p>
                  <span className="text-xs text-text-light">{t('startConversation')}</span>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={listContainer}
                >
                  {messages.map(msg => {
                    const isSent = msg.sender_id === user?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        className={`flex flex-col max-w-[70%] ${isSent ? 'ml-auto items-end' : 'items-start'}`}
                        variants={fadeInUp}
                        transition={{ duration: 0.25 }}
                      >
                        {msg.reply_to_id && (
                          <div className="bg-gray-50 dark:bg-white/5 border-l-2 border-indigo-400 rounded-r-lg px-3 py-1.5 mb-1.5 text-xs w-full">
                            <span className="font-semibold text-indigo-400 block">{t('replyTo')}</span>
                            <span className="text-text-muted line-clamp-1">
                              {messages.find(m => m.id === msg.reply_to_id)?.text || t('messageDeleted')}
                            </span>
                          </div>
                        )}

                        <div
                          className={`relative group px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isSent
                              ? 'bg-indigo-500 text-white rounded-br-md'
                              : 'bg-gray-100 dark:bg-white/10 text-text rounded-bl-md'
                          }`}
                        >
                          <span className="whitespace-pre-wrap break-words">{msg.text}</span>

                          <button
                            onClick={() => setReplyingToMessage(msg)}
                            className={`absolute -bottom-2 ${
                              isSent ? '-left-2' : '-right-2'
                            } w-6 h-6 rounded-full bg-gray-200 dark:bg-white/15 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}
                            aria-label={t('reply')}
                            title={t('reply')}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M4 4h16v16H4z"/><path d="M10 10h4v4h-4z"/>
                            </svg>
                          </button>
                        </div>

                        <div className={`flex items-center gap-1.5 mt-1 px-1 text-[0.65rem] text-text-muted ${isSent ? 'flex-row-reverse' : ''}`}>
                          <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                          {isSent && (
                            <span className={msg.read_at ? 'text-indigo-400' : ''}>
                              {msg.read_at ? '✓✓' : '✓'}
                            </span>
                          )}
                          {!isSent && msg.read_at && <span className="text-indigo-400">✓✓</span>}
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </motion.div>
              )}
            </div>

            {/* Reply bar */}
            {replyingToMessage && (
              <motion.div
                className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 border-l-2 border-indigo-400 px-4 py-2.5 text-sm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-indigo-400 text-xs block">{t('replyingTo')}</span>
                  <span className="text-text-muted text-xs truncate block">{replyingToMessage.text}</span>
                </div>
                <button
                  onClick={() => setReplyingToMessage(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                  aria-label={t('cancel')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </motion.div>
            )}

            {/* Input bar */}
            <form
              className="flex items-center gap-2 p-3 border-t border-white/10"
              onSubmit={handleSubmit}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={t('typeMessage')}
                className="flex-1 bg-gray-100 dark:bg-white/10 text-text placeholder-text-light text-sm rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400/40 transition-shadow"
                aria-label={t('typeMessage')}
              />
              <button
                type="submit"
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-40 disabled:pointer-events-none"
                aria-label={t('send')}
                disabled={!input.trim()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="text-5xl" aria-hidden="true">💬</div>
            <h2 className="text-xl font-bold text-text">{t('selectFriendToChat')}</h2>
            <p className="text-sm text-text-muted max-w-xs">{t('selectFriendMessage')}</p>
          </div>
        )}
      </main>
    </motion.div>
  );
}
