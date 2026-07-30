import apiClient from './client';

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export const getCategories = () => apiClient.get<Category[]>('/categories');
export const createCategory = (name: string) => apiClient.post<Category>('/categories', { name });
export const deleteCategory = (id: string) => apiClient.delete(`/categories/${id}`);
