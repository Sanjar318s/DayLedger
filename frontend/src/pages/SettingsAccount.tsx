import { useState, FormEvent, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, changePassword } from '../api/auth';
import { getProfile, updateVisibilitySettings } from '../api/profile';
import { getFrames, setActiveFrame, getActiveFrame } from '../api/frames';
import { parseCss } from '../utils/cssParser';
import { useLocale } from '../context/LocaleContext';
import { usePerfMode, PerfMode } from '../hooks/usePerfMode';
import AvatarCropper from '../components/AvatarCropper';
import Avatar from '../components/Avatar';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

function extractColor(css: string): string {
  const match = css.match(/#([0-9a-fA-F]{3}){1,2}\b/);
  if (match) return match[0];
  const matchRgba = css.match(/rgba?\([^)]+\)/);
  if (matchRgba) return matchRgba[0];
  return '#6366f1';
}

function getAccentColor(color: string): string {
  const golds = ['#ffd700', '#ffc107', '#ffb300', '#ffab00', '#ffa000', '#ff8f00'];
  if (golds.includes(color.toLowerCase())) return '#ff6b6b';
  const purples = ['#9c27b0', '#7b1fa2', '#6a1b9a', '#8e24aa'];
  if (purples.some(p => color.toLowerCase().includes(p))) return '#ff6b6b';
  const blues = ['#2196f3', '#1976d2', '#1565c0', '#1e88e5'];
  if (blues.some(b => color.toLowerCase().includes(b))) return '#00e5ff';
  const greens = ['#4caf50', '#388e3c', '#2e7d32', '#43a047'];
  if (greens.some(g => color.toLowerCase().includes(g))) return '#76ff03';
  return '#ffffff';
}

export default function SettingsAccount() {
  const { user, setUser } = useAuth();
  const { t } = useLocale();
  const { perfMode, weakDevice, setPerfMode } = usePerfMode();
  const queryClient = useQueryClient();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [message, setMessage] = useState('');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);

  const { data: profileSettings } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => getProfile(user!.public_id!).then(res => res.data),
    enabled: !!user,
  });

  const { data: frames } = useQuery({
    queryKey: ['frames'],
    queryFn: () => getFrames().then(res => res.data),
  });

  const { data: activeFrame } = useQuery({
    queryKey: ['activeFrame'],
    queryFn: () => getActiveFrame().then(res => res.data),
  });

  const frameMutation = useMutation({
    mutationFn: setActiveFrame,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeFrame'] });
      queryClient.invalidateQueries({ queryKey: ['frames'] });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: updateVisibilitySettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myProfile'] }),
  });

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateProfile({
        nickname,
        avatar_url: avatarPreview || user?.avatar_url,
      });
      setUser({ ...user!, ...updated.data });
      setMessage(t('profileUpdated'));
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Error');
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await changePassword(oldPass, newPass);
      setMessage(t('changePassword'));
      setOldPass('');
      setNewPass('');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Error');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageToCrop(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = (dataUrl: string) => {
    setAvatarPreview(dataUrl);
    setImageToCrop(null);
  };

  return (
    <div className="space-y-6 divide-y divide-slate-200 dark:divide-slate-700">
      {imageToCrop && (
        <AvatarCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          onCancel={() => setImageToCrop(null)}
        />
      )}

      <motion.div {...fadeUp} className="pt-0 first:pt-0 pb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('avatar')}</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <Avatar avatarUrl={avatarPreview || user?.avatar_url} nickname={user?.nickname} email={user?.email} size={80} />
          <label className="btn-secondary px-4 py-2 rounded-xl cursor-pointer text-sm">
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {t('avatar')}
          </label>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row gap-3">
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder={t('nickname')}
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary px-6 py-2 rounded-xl text-sm sm:w-auto w-full">
            {t('save')}
          </button>
        </form>
      </motion.div>

      <motion.div {...fadeUp} className="py-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('changePassword')}</h3>
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <input
            type="password"
            placeholder={t('oldPassword')}
            value={oldPass}
            onChange={e => setOldPass(e.target.value)}
            required
            className="input-field w-full"
          />
          <input
            type="password"
            placeholder={t('newPassword')}
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            required
            className="input-field w-full"
          />
          <button type="submit" className="btn-primary px-6 py-2 rounded-xl text-sm">
            {t('change')}
          </button>
        </form>
      </motion.div>

      <motion.div {...fadeUp} className="py-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">⚡ {t('perfMode')}</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit">
            {(['auto', 'on', 'off'] as PerfMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setPerfMode(m)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  perfMode === m
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {m === 'auto' ? t('perfModeAuto') : m === 'on' ? t('perfModeOn') : t('perfModeOff')}
              </button>
            ))}
          </div>
          {weakDevice && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">⚠️ {t('perfModeWeakDevice')}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('perfModeHint')}</p>
      </motion.div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-emerald-600 dark:text-emerald-400 py-2">
          {message}
        </motion.div>
      )}

      <motion.div {...fadeUp} className="py-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">ID: {user?.public_id}</p>
      </motion.div>

      <motion.div {...fadeUp} className="py-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('privacySettings')}</h3>
        <div className="space-y-3">
          {[
            { key: 'show_notes_count', checked: profileSettings?.notesCount !== -1, label: t('showNotesCount') },
            { key: 'show_friends_count', checked: profileSettings?.friendsCount !== -1, label: t('showFriendsCount') },
            { key: 'show_projects_count', checked: profileSettings?.projectsCount !== -1, label: t('showProjectsCount') },
          ].map(({ key, checked, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => visibilityMutation.mutate({ [key]: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="w-10 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-500 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </motion.div>

      <motion.div {...fadeUp} className="py-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('avatarFrame')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {frames?.map(frame => {
            const isActive = activeFrame?.id === frame.id;
            const frameStyle = parseCss(frame.css_style);
            const color = extractColor(frame.css_style);
            const accent = getAccentColor(color);
            return (
              <div
                key={frame.id}
                className={`rounded-2xl p-4 text-center transition-all cursor-pointer border-2 relative overflow-hidden ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md ring-2 ring-indigo-300 dark:ring-indigo-700'
                    : frame.unlocked
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-40'
                }`}
                onClick={() => frame.unlocked && frameMutation.mutate(frame.id)}
              >
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <div
                    className="frame-glow-ring"
                    style={{ boxShadow: `0 0 18px 6px ${color}66, 0 0 40px 12px ${color}33` }}
                  />
                  {isActive && (
                    <div
                      className="frame-rotating-accent"
                      style={{
                        background: `conic-gradient(from 0deg, ${color}, transparent 30%, ${accent} 50%, transparent 70%, ${color})`,
                        mask: 'radial-gradient(circle at 50% 50%, transparent 74%, black 75%)',
                        WebkitMask: 'radial-gradient(circle at 50% 50%, transparent 74%, black 75%)',
                      }}
                    />
                  )}
                  <div className="frame-shimmer-overlay" />
                  <div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center relative z-10"
                    style={frameStyle}
                  >
                    <Avatar avatarUrl={avatarPreview || user?.avatar_url} nickname={user?.nickname} email={user?.email} size={50} showFrame={false} gameGlow={false} />
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{frame.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{frame.required_achievements} {t('achievements').toLowerCase()}</div>
                {isActive && <div className="text-xs text-indigo-500 mt-1 font-semibold">✓ {t('active')}</div>}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
