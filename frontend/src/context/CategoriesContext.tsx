import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getCategories, createCategory, deleteCategory, Category } from '../api/categories';
import { useAuth } from '../hooks/useAuth';

interface CategoriesState {
  categories: Category[];
  loading: boolean;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesState>({
  categories: [],
  loading: false,
  addCategory: async () => {},
  removeCategory: async () => {},
});

export const useCategories = () => useContext(CategoriesContext);

export const CategoriesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (name: string) => {
    await createCategory(name);
    fetchCategories();
  };

  const removeCategory = async (id: string) => {
    await deleteCategory(id);
    fetchCategories();
  };

  return (
    <CategoriesContext.Provider value={{ categories, loading, addCategory, removeCategory }}>
      {children}
    </CategoriesContext.Provider>
  );
};
