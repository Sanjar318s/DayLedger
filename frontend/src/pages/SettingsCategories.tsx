import { useState, FormEvent } from 'react';
import { useCategories } from '../context/CategoriesContext';
import { useLocale } from '../context/LocaleContext';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function SettingsCategories() {
  const { t } = useLocale();
  const { categories, addCategory, removeCategory } = useCategories();
  const [newName, setNewName] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      await addCategory(newName.trim());
      setNewName('');
    }
  };

  return (
    <motion.div {...fadeUp} className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t('categories')}</h3>
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
        <input
          placeholder={t('category')}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary px-6 py-2 rounded-xl text-sm">
          {t('add')}
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('noEntries')}</p>
      ) : (
        <ul className="space-y-2">
          {categories.map(cat => (
            <li key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <span className="text-sm text-slate-700 dark:text-slate-300">{cat.name}</span>
              <button
                onClick={() => removeCategory(cat.id)}
                className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center text-sm"
                aria-label={t('delete')}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
