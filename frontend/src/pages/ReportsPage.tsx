import { useState } from 'react';
import ReportsChart from '../components/ReportsChart';
import { useLocale } from '../context/LocaleContext';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function ReportsPage() {
  const { t } = useLocale();
  const [from, setFrom] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('report')}</h2>
      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium mb-1">{t('from')}</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('to')}</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field" />
        </div>
      </div>
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/20 p-6">
        <ReportsChart from={from} to={to} />
      </div>
    </motion.div>
  );
}
