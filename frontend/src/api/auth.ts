import apiClient from './client';
import { setAccessToken } from './token';
import type { User } from '../context/AuthContext';

export const login = async (email: string, password: string) => {
  const res = await apiClient.post('/auth/login', { email, password });
  setAccessToken(res.data.accessToken);
  return res.data.user as User;
};

export const register = async (name: string, email: string, password: string) => {
  const res = await apiClient.post('/auth/register', { name, email, password });
  setAccessToken(res.data.accessToken);
  return res.data.user as User;
};

export const logout = async () => {
  await apiClient.post('/auth/logout');
  setAccessToken(null);
};

export const getMe = () => apiClient.get<User>('/auth/me', { timeout: 15000 });

export const updateProfile = (data: Partial<User>) =>
  apiClient.patch<User>('/auth/profile', data);

export const changePassword = (oldPassword: string, newPassword: string) =>
  apiClient.patch('/auth/password', { oldPassword, newPassword });
