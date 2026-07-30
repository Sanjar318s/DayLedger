import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Entry } from '../api/entries';
import { motion } from 'framer-motion';

interface Props {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  entries: Entry[];
}

export default function CalendarView({ selectedDate, onSelectDate, entries }: Props) {
  const start = startOfMonth(selectedDate);
  const end = endOfMonth(selectedDate);
  const days = eachDayOfInterval({ start, end });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }}
      className="grid grid-cols-7 gap-1"
    >
      {days.map(day => {
        const hasEntry = entries.some(e => isSameDay(parseISO(e.event_at), day));
        const isSelected = isSameDay(day, selectedDate);
        return (
          <div
            key={day.toString()}
            onClick={() => onSelectDate(day)}
            className={[
              'aspect-square flex items-center justify-center rounded-lg text-sm font-medium cursor-pointer transition-all',
              isSelected
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : hasEntry
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10',
            ].join(' ')}
          >
            {format(day, 'd')}
          </div>
        );
      })}
    </motion.div>
  );
}
