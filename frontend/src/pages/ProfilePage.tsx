import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getProfile } from '../api/profile';
import { getAchievements } from '../api/achievements';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../hooks/useAuth';
import Avatar from '../components/Avatar';
import { motion } from 'framer-motion';

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

export default function ProfilePage() {
  const { publicId } = useParams();
  const { t } = useLocale();
  const { user } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', publicId],
    queryFn: () => getProfile(publicId!).then(res => res.data),
    enabled: !!publicId,
  });

  const { data: achievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => getAchievements().then(res => res.data),
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error || !profile) return <div className="text-center py-20 text-gray-400">{t('profileNotFound')}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <motion.div {...fadeUp} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/20 p-8">
        <div className="flex items-center gap-6">
          <Avatar avatarUrl={profile.avatar_url} nickname={profile.nickname} size={80} frameCss={profile.active_frame_css} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.nickname || '#' + profile.public_id}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('level')}: {profile.level}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{profile.currentLevelXP} / {profile.xpForNextLevel} XP</span>
                <span>{profile.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${profile.progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' as const }}
                  className="h-full bg-indigo-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp} className="grid grid-cols-3 gap-4">
        {[
          { label: t('notes'), value: profile.notesCount },
          { label: t('friends'), value: profile.friendsCount },
          { label: t('projects'), value: profile.projectsCount },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/20 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value >= 0 ? stat.value : t('hidden')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      <motion.div {...fadeUp} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/20 p-6">
        <h3 className="text-lg font-semibold mb-4">{t('achievements')}</h3>
        {achievements?.length ? (
          <motion.ul {...stagger} initial="initial" animate="animate" className="space-y-4">
            {achievements.map(a => (
              <motion.li key={a.id} variants={fadeUp} className={`p-4 rounded-xl transition-opacity ${a.unlocked ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-slate-700/30 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">{a.unlocked ? '✅' : '🔒'}</span>
                  <div className="flex-1">
                    <div className="font-medium">{a.name} <span className="text-xs text-gray-400">({a.points} XP)</span></div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{a.description}</div>
                    {!a.unlocked && a.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{a.current_value} / {a.next_threshold}</span>
                          <span>{a.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${a.progress}%` }} transition={{ duration: 0.6 }}
                            className="h-full bg-indigo-500 rounded-full" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : <p className="text-gray-400 text-center py-4">{t('noAchievements')}</p>}
      </motion.div>
    </motion.div>
  );
}
