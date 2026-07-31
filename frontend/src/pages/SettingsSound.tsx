import { useSound } from '../context/SoundContext';
import { useLocale } from '../context/LocaleContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function SettingsSound() {
  const { volume, muted, setVolume, setMuted } = useSound();
  const { t } = useLocale();
  const push = usePushNotifications();

  const testSound = () => {
    window.__playNotificationSound?.();
  };

  const handlePushToggle = async (on: boolean) => {
    if (on) await push.enable();
    else await push.disable();
  };

  const pushEnabled = push.permission === 'granted' && push.subscribed;

  return (
    <motion.div {...fadeUp} className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t('soundSettings')}</h3>

      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={muted}
            onChange={(e) => setMuted(e.target.checked)}
            className="peer sr-only"
          />
          <div className="w-10 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-500 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">{t('mute')}</span>
      </label>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{t('volume')}</span>
          <span className="text-slate-800 dark:text-white font-medium">{volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          disabled={muted}
          className="w-full h-2 rounded-full appearance-none bg-slate-200 dark:bg-slate-600 disabled:opacity-40 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
        />
      </div>

      <button onClick={testSound} className="btn-secondary px-6 py-2 rounded-xl text-sm">
        {t('testSound')}
      </button>

      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Push-уведомления на телефон</h4>

        {push.supported ? (
          <>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  disabled={push.enabling}
                  onChange={(e) => handlePushToggle(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-10 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-500 transition-colors peer-disabled:opacity-40" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
                {pushEnabled ? 'Уведомления включены' : 'Включить уведомления'}
              </span>
            </label>

            {push.permission === 'denied' && (
              <p className="text-sm text-red-500">
                Доступ к уведомлениям заблокирован в браузере. Разрешите его в настройках сайта.
              </p>
            )}
            {push.error && <p className="text-sm text-red-500">{push.error}</p>}

            <p className="text-xs text-slate-400 leading-relaxed">
              Уведомления приходят, даже когда приложение закрыто: новые сообщения, заявки в друзья, доступ к записи и напоминания.
              {push.permission === 'granted' && !push.subscribed ? ' Нажмите переключатель, чтобы подписаться.' : ''}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              На iPhone уведомления работают после установки приложения: Safari → Поделиться → «На экран «Домой»».
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">Ваш браузер не поддерживает push-уведомления.</p>
        )}
      </div>
    </motion.div>
  );
}
