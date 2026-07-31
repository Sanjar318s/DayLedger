import apiClient from './client';

export interface AdminUser {
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

export const getAdminUsers = () => apiClient.get<AdminUser[]>('/admin/users');

export const updateUserPublicId = (userId: string, publicId: string) =>
  apiClient.patch<AdminUser>(`/admin/users/${userId}/public-id`, { public_id: publicId });

export const resetUserPassword = (userId: string, password: string) =>
  apiClient.patch<{ message: string; password: string }>(`/admin/users/${userId}/password`, { password });