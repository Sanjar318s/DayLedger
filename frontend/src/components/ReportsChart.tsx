import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { getReportSummary } from '../api/reports';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../api/client';
import { motion } from 'framer-motion';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'];

interface Props {
  from: string;
  to: string;
}

export default function ReportsChart({ from, to }: Props) {
  const { t } = useLocale();

  const { data: summary } = useQuery({
    queryKey: ['reportSummary', from, to],
    queryFn: () => getReportSummary({ period: 'custom', from, to }).then(res => res.data),
    enabled: !!from && !!to,
  });

  const { data: daily } = useQuery({
    queryKey: ['reportDaily', from, to],
    queryFn: () => apiClient.get('/reports/daily', { params: { from, to } }).then(res => res.data),
    enabled: !!from && !!to,
  });

  const pieData = summary?.by_category.map(cat => ({
    name: cat.category,
    value: Number(cat.amount),
  })) || [];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}`;
  };

  const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  };

  return (
    <div className="space-y-8">
      <motion.div {...fadeUp} className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-text mb-4">{t('categoryChart')}</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-12">{t('noData')}</p>
        )}
      </motion.div>

      <motion.div {...fadeUp} className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-text mb-4">{t('dailyChart')}</h3>
        {daily && daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Line type="monotone" dataKey="income" stroke="#34d399" name={t('income')} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expense" stroke="#f87171" name={t('expense')} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-12">{t('noData')}</p>
        )}
      </motion.div>
    </div>
  );
}
