import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMonths,
  subMonths,
  Locale,
} from 'date-fns';
import { ru, uz, enUS } from 'date-fns/locale';
import { Entry } from '../api/entries';
import { useLocale } from '../context/LocaleContext';
import { motion } from 'framer-motion';

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  entries: Entry[];
}

const locales: Record<string, Locale> = { ru, uz, en: enUS };
const dayNamesRu = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const dayNamesEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ModernCalendar({ selectedDate, onSelectDate, entries }: Props) {
  const { lang, t } = useLocale();
  const locale = locales[lang] || enUS;
  const localizedDayNames = ['ru', 'uz'].includes(lang) ? dayNamesRu : dayNamesEn;

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    onSelectDate(today);
  };

  const hasEntries = (date: Date) =>
    entries.some((e) => isSameDay(parseISO(e.event_at), date));

  const entriesCount = (date: Date) =>
    entries.filter((e) => isSameDay(parseISO(e.event_at), date)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }}
      className="glass-card rounded-2xl p-5 w-full max-w-[360px]"
      role="region"
      aria-label={t('calendar')}
    >
      <header className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center flex-shrink-0"
          aria-label={t('prevMonth')}
          title={t('prevMonth')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <h2
          className="text-lg font-semibold capitalize text-center flex-1 min-w-[120px] text-indigo-600 dark:text-indigo-400"
          aria-live="polite"
        >
          {format(currentMonth, 'LLLL yyyy', { locale })}
        </h2>

        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center flex-shrink-0"
          aria-label={t('nextMonth')}
          title={t('nextMonth')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        <button
          onClick={goToToday}
          className="px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 rounded-full hover:bg-indigo-500 hover:text-white transition-all flex-shrink-0"
          aria-label={t('today')}
          title={t('today')}
        >
          {t('today')}
        </button>
      </header>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t('calendarGrid')}>
        {localizedDayNames.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2 uppercase tracking-wider" role="columnheader" aria-label={d}>
            {d}
          </div>
        ))}

        {days.map((d) => {
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const isSelected = isSameDay(d, selectedDate);
          const isTodayDate = isToday(d);
          const hasEvent = hasEntries(d);
          const count = entriesCount(d);

          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelectDate(d)}
              className={[
                'relative flex flex-col items-center justify-center aspect-square min-h-[40px] rounded-xl text-sm font-medium transition-all border-none bg-transparent outline-none cursor-pointer',
                'hover:bg-white/10 hover:scale-105',
                'focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2 focus-visible:z-10',
                !isCurrentMonth ? 'text-gray-600 hover:bg-white/5' : 'text-gray-300',
                isTodayDate ? 'font-bold text-indigo-400' : '',
                isSelected
                  ? 'bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30'
                  : '',
              ].join(' ')}
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isTodayDate ? 'date' : undefined}
              aria-label={format(d, 'EEEE, MMMM d, yyyy', { locale })}
              title={hasEvent ? `${t('entriesCount')} ${count}` : undefined}
            >
              <span className="z-10 leading-none">{format(d, 'd')}</span>

              {hasEvent && (
                <span className="absolute bottom-1 flex items-center justify-center z-10" aria-hidden="true">
                  {count > 1 ? (
                    <span className="text-[10px] font-bold text-white bg-amber-500 px-1 h-3.5 rounded-full flex items-center justify-center min-w-[14px]">
                      {count}
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </span>
              )}

              {isTodayDate && !isSelected && (
                <span className="absolute inset-[-2px] border-2 border-indigo-400/50 rounded-xl pointer-events-none animate-pulse" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
