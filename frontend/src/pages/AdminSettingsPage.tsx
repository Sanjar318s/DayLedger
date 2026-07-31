import { useState, useEffect } from 'react';
import { useLocale } from '../context/LocaleContext';
import { getAdminUsers, updateUserPublicId, resetUserPassword } from '../api/admin';

interface User {
  id: string;
  email: string;
  password_hash: string;
  public_id: string;
  nickname: string | null;
  avatar_url: string | null;
  language: string;
  currency: string;
  timezone: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const { t } = useLocale();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resettingEmail, setResettingEmail] = useState('');
  const [resetValue, setResetValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers();
      setUsers(res.data);
    } catch (err) {
      setError(t('adminError'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u: User) => {
    setEditingId(u.id);
    setEditValue(u.public_id);
  };

  const handleSave = async (id: string) => {
    try {
      await updateUserPublicId(id, editValue);
      setUsers(users.map(u => u.id === id ? { ...u, public_id: editValue } : u));
      setEditingId(null);
      setSuccess(t('adminUpdated'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(t('adminUpdateError'));
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
    setError('');
  };

  const handleResetSave = async (id: string) => {
    if (resetValue.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    try {
      const res = await resetUserPassword(id, resetValue);
      setSuccess(`${t('passwordReset')} ${res.data.password}`);
      setTimeout(() => setSuccess(''), 8000);
      setResettingId(null);
      setResetValue('');
    } catch (err) {
      setError(t('passwordResetError'));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adminPanel')}</h1>
        <span className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-full">
          {t('adminOnly')}
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/60 dark:border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('id')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('email')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('passwordHash')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('publicId')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('nickname')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('registered')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {u.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400 max-w-md truncate" title={u.password_hash}>
                    {u.password_hash}
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
                      <span className="px-2 py-1 text-sm font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        #{u.public_id}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {u.nickname || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === u.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSave(u.id)}
                          className="px-2 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                        >
                          {t('save')}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
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
                          {t('resetPassword')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('noUsers')}
          </div>
        )}
      </div>

      {resettingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('resetPassword')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{resettingEmail}</p>
            <input
              type="text"
              value={resetValue}
              onChange={(e) => setResetValue(e.target.value)}
              placeholder={t('newPassword')}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleResetCancel}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleResetSave(resettingId)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
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