import { useSound } from '../context/SoundContext';
import { useLocale } from '../context/LocaleContext';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function SettingsSound() {
  const { volume, muted, setVolume, setMuted } = useSound();
  const { t } = useLocale();

  const testSound = () => {
    window.__playNotificationSound?.();
  };

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
    </motion.div>
  );
}
