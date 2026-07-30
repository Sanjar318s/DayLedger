import { useQuery } from '@tanstack/react-query';
import { getEntries } from '../api/entries';
import { getSharedWithMe } from '../api/shares';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { useCategories } from '../context/CategoriesContext';
import ModernCalendar from '../components/ModernCalendar';
import EntryList from '../components/EntryList';
import SharedEntryList from '../components/SharedEntryList';
import HeroBlock from '../components/HeroBlock';
import DashboardBackground from '../components/DashboardBackground';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const from = format(monthStart, 'yyyy-MM-dd');
  const to = format(monthEnd, 'yyyy-MM-dd');

  const { t } = useLocale();
  const { categories } = useCategories();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['entries', from, to],
    queryFn: () => getEntries(from, to).then((res) => res.data),
  });

  const { data: sharedEntries } = useQuery({
    queryKey: ['sharedWithMe'],
    queryFn: () => getSharedWithMe().then((res) => res.data),
  });

  const hasShared = sharedEntries && sharedEntries.length > 0;

  const filteredEntries = (entries || []).filter((entry) => {
    const entryDate = new Date(entry.event_at);
    const matchCategory = activeCategoryId ? entry.category_id === activeCategoryId : true;
    return matchCategory;
  });

  const entriesForSelectedDay = filteredEntries.filter((entry) =>
    new Date(entry.event_at).toDateString() === selectedDate.toDateString()
  );

  const displayEntries = entriesForSelectedDay.length > 0 ? entriesForSelectedDay : filteredEntries;

  const isSharedMode = activeCategoryId === 'shared';
  const showOwnEntries = !isSharedMode;

  const stats = entries || [];
  const totalEntries = stats.length;
  const completedEntries = stats.filter((e) => e.is_done).length;
  const pendingEntries = stats.filter((e) => !e.is_done).length;
  const balance = stats.reduce(
    (sum, e) => sum + (e.amount_type === 'income' ? e.amount || 0 : -(e.amount || 0)),
    0
  );
  const incomeEntries = stats.filter((e) => e.amount_type === 'income').length;
  const expenseEntries = stats.filter((e) => e.amount_type === 'expense').length;
  const reminderEntries = stats.filter((e) => e.remind_before_minutes > 0).length;

  const categoryButtons = [
    { id: null, label: t('all'), icon: '📋' },
    ...categories.map((cat) => ({ id: cat.id, label: cat.name, icon: cat.icon || '🏷️' })),
  ];

  if (hasShared) {
    categoryButtons.push({ id: 'shared', label: t('sharedEntries'), icon: '🔗' });
  }

  const statCards = [
    { value: totalEntries, label: t('totalEntries'), icon: '📝', bg: '#6366f1' },
    { value: completedEntries, label: t('completed'), icon: '✅', bg: '#10b981' },
    { value: pendingEntries, label: t('pending'), icon: '⏳', bg: '#f59e0b' },
    { value: `${balance >= 0 ? '+' : ''}${balance}`, label: t('balance'), icon: '💰', bg: '#06b6d4' },
  ];

  return (
    <>
      <DashboardBackground />
      <HeroBlock />
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            {t('dashboard')}
          </h1>
          <p className="mt-0.5 text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {format(selectedDate, 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <motion.div
          whileHover={{ y: -3, boxShadow: '0 10px 40px -8px rgba(79,70,229,0.4)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Link
            to="/entry/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 font-semibold rounded-xl"
            style={{
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
            }}
          >
            <span className="text-lg leading-none">+</span>
            {t('newEntry')}
          </Link>
        </motion.div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="text-white rounded-2xl p-5 shadow-lg"
            style={{ backgroundColor: stat.bg }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <div className="text-xl font-bold leading-tight">{stat.value}</div>
                <div className="text-xs font-medium opacity-80 mt-0.5">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <motion.div variants={itemVariants} className="space-y-5">
          {/* Calendar */}
          <section className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-slate-700/50 p-5">
            <ModernCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              entries={entries || []}
            />
          </section>

          {/* Categories */}
          <section className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-slate-700/50 p-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 uppercase tracking-wide">
              {t('categories')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {categoryButtons.map((cat) => {
                const isActive = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Quick Stats */}
          {showOwnEntries && entries && entries.length > 0 && (
            <section className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-slate-700/50 p-5">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 uppercase tracking-wide">
                {t('quickStats')}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{incomeEntries}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('income')}</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{expenseEntries}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('expense')}</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{reminderEntries}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('withReminders')}</div>
                </div>
              </div>
            </section>
          )}
        </motion.div>

        {/* Main Content */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <section className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-slate-700/50 p-5 min-h-[400px]">
            {isSharedMode ? (
              <SharedEntryList entries={sharedEntries || []} />
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-slate-800 dark:text-white">
                    {entriesForSelectedDay.length > 0
                      ? `${t('entriesFor')} ${format(selectedDate, 'd MMMM')}`
                      : format(selectedDate, 'LLLL yyyy')}
                  </h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-full font-medium">
                    {displayEntries.length}
                  </span>
                </div>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3" role="status">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-slate-400">{t('loading')}</span>
                  </div>
                ) : (
                  <EntryList entries={displayEntries} />
                )}
              </>
            )}
          </section>
        </motion.div>
      </div>
    </motion.div>
    </>
  );
}
