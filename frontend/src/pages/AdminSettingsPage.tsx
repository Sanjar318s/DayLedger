import { useState, useEffect, useMemo } from 'react';
import { useLocale } from '../context/LocaleContext';
import { getAdminUsers, updateUserPublicId, resetUserPassword } from '../api/admin';
import Avatar from '../components/Avatar';

interface User {
  id: string;
  email: string;
  password_hash: string | null;
  public_id: string;
  nickname: string | null;
  avatar_url: string | null;
  language: string;
  currency: string;
  timezone: string;
  created_at: string;
}

const STRENGTH_COLORS = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-500'];
const STRENGTH_TEXT = ['text-red-500', 'text-red-500', 'text-amber-500', 'text-emerald-500', 'text-emerald-500'];
const PASSWORD_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

function getPasswordStrength(pwd: string): number {
  let strength = 0;
  if (pwd.length >= 8) strength++;
  if (/[A-Z]/.test(pwd)) strength++;
  if (/[a-z]/.test(pwd)) strength++;
  if (/[0-9]/.test(pwd)) strength++;
  if (/[^A-Za-z0-9]/.test(pwd)) strength++;
  return Math.min(strength, 4);
}

function generatePassword(): string {
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  let pwd = '';
  for (let i = 0; i < arr.length; i++) pwd += PASSWORD_CHARS[arr[i] % PASSWORD_CHARS.length];
  return pwd;
}

interface Notice {
  type: 'success' | 'error';
  text: string;
  password?: string;
}

export default function AdminSettingsPage() {
  const { t } = useLocale();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resettingEmail, setResettingEmail] = useState('');
  const [resetValue, setResetValue] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 10000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers();
      setUsers(res.data);
    } catch (err) {
      setNotice({ type: 'error', text: t('adminError') });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.nickname || '').toLowerCase().includes(q) ||
        u.public_id.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, query]);

  const stats = useMemo(() => {
    const total = users.length;
    const week = users.filter(
      (u) => Date.now() - new Date(u.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;
    const admins = users.filter((u) => u.public_id === '99999').length;
    return { total, week, admins };
  }, [users]);

  const strength = getPasswordStrength(resetValue);
  const strengthLabels = [
    t('passwordVeryWeak'),
    t('passwordWeak'),
    t('passwordFair'),
    t('passwordGood'),
    t('passwordStrong'),
  ];

  const copyText = async (text: string, target: 'hash' | 'result', key?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (target === 'hash') {
        setCopiedHash(key ?? null);
        window.setTimeout(() => setCopiedHash(null), 1500);
      } else {
        setCopiedResult(true);
        window.setTimeout(() => setCopiedResult(false), 1500);
      }
    } catch (err) {
      // clipboard unavailable
    }
  };

  const handleEditClick = (u: User) => {
    setEditingId(u.id);
    setEditValue(u.public_id);
  };

  const handleSave = async (id: string) => {
    try {
      await updateUserPublicId(id, editValue);
      setUsers(users.map((u) => (u.id === id ? { ...u, public_id: editValue } : u)));
      setEditingId(null);
      setNotice({ type: 'success', text: t('adminUpdated') });
    } catch (err) {
      setNotice({ type: 'error', text: t('adminUpdateError') });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleResetClick = (u: User) => {
    setResettingId(u.id);
    setResettingEmail(u.email);
    setResetValue('');
    setNotice(null);
  };

  const handleResetSave = async (id: string) => {
    if (resetValue.length < 8) {
      setNotice({ type: 'error', text: t('passwordTooShort') });
      return;
    }
    try {
      const res = await resetUserPassword(id, resetValue);
      setResettingId(null);
      setResetValue('');
      setNotice({ type: 'success', text: t('passwordReset'), password: res.data.password });
    } catch (err) {
      setNotice({ type: 'error', text: t('passwordResetError') });
    }
  };

  const handleResetCancel = () => {
    setResettingId(null);
    setResetValue('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('adminPanel')}</h1>
        <span className="px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-full">
          🛡️ {t('adminOnly')}
        </span>
      </div>

      {notice && (
        <div
          className={`flex flex-wrap items-center gap-2 p-4 rounded-2xl border text-sm ${
            notice.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/60 text-red-600 dark:text-red-400'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          <span>{notice.text}</span>
          {notice.password && (
            <>
              <code className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 font-mono text-xs break-all">
                {notice.password}
              </code>
              <button
                onClick={() => copyText(notice.password!, 'result')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                {copiedResult ? '✓ ' + t('copied') : '📋 ' + t('copy')}
              </button>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '👥', label: t('totalUsers'), value: stats.total },
          { icon: '✨', label: t('newThisWeek'), value: stats.week },
          { icon: '🛡️', label: t('admins'), value: stats.admins },
        ].map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-white to-indigo-50/70 dark:from-slate-800 dark:to-slate-800/40 border border-slate-200/60 dark:border-slate-700/60"
          >
            <span className="text-xl sm:text-2xl">{s.icon}</span>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white leading-tight">{s.value}</div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchUsers')}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={fetchUsers}
          className="px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          🔄 {t('refresh')}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/60 dark:border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 backdrop-blur">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('user')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('publicId')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('passwordHash')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('settings')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('registered')}
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-slate-800/60">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <Avatar avatarUrl={u.avatar_url} nickname={u.nickname} email={u.email} size={34} showFrame={false} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-800 dark:text-white truncate">
                            {u.nickname || t('user')}
                          </span>
                          {u.public_id === '99999' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              {t('adminBadge')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === u.id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                          #{u.public_id}
                        </span>
                        <button
                          onClick={() => handleEditClick(u)}
                          title={t('edit')}
                          className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors text-sm"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!u.password_hash ? (
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                        {t('googleAccount')}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span
                          className="font-mono text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate"
                          title={u.password_hash}
                        >
                          {u.password_hash}
                        </span>
                        <button
                          onClick={() => copyText(u.password_hash!, 'hash', u.id)}
                          title={t('copy')}
                          className="shrink-0 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500 transition-colors"
                        >
                          {copiedHash === u.id ? '✓' : '📋'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 text-[11px] font-semibold uppercase rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {u.language}
                      </span>
                      <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {u.currency}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[120px]" title={u.timezone}>
                      {u.timezone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === u.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSave(u.id)}
                          className="px-2 py-1 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                        >
                          {t('save')}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        >
                          {t('edit')}
                        </button>
                        <button
                          onClick={() => handleResetClick(u)}
                          className="px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                        >
                          🔑 {t('resetPassword')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            {query ? t('noSearchResults') : t('noUsers')}
          </div>
        )}
      </div>

      {resettingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200/60 dark:border-slate-700/60">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">🔑 {t('resetPassword')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 break-all">{resettingEmail}</p>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={resetValue}
                onChange={(e) => setResetValue(e.target.value)}
                placeholder={t('newPassword')}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <button
                onClick={() => setResetValue(generatePassword())}
                title={t('generatePassword')}
                className="px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                🎲 {t('generatePassword')}
              </button>
            </div>

            {resetValue && (
              <div className="mt-3">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= strength ? STRENGTH_COLORS[strength] : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <div className={`mt-1 text-xs font-medium ${STRENGTH_TEXT[strength]}`}>{strengthLabels[strength]}</div>
              </div>
            )}

            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{t('resetPasswordHint')}</p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={handleResetCancel}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleResetSave(resettingId)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-sm"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
