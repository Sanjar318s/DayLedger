import LocaleSwitcher from '../components/LocaleSwitcher';
import { useLocale } from '../context/LocaleContext';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function SettingsLanguage() {
  const { t } = useLocale();

  return (
    <motion.div {...fadeUp} className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t('language')} & {t('currency')}</h3>
      <LocaleSwitcher />
    </motion.div>
  );
}
