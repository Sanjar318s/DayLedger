import apiClient from './client';
import { setAccessToken, setRefreshToken } from './token';
import type { User } from '../context/AuthContext';

export const login = async (email: string, password: string) => {
  const res = await apiClient.post('/auth/login', { email, password });
  setAccessToken(res.data.accessToken);
  setRefreshToken(res.data.refreshToken);
  return res.data.user as User;
};

export const register = async (name: string, email: string, password: string) => {
  const res = await apiClient.post('/auth/register', { name, email, password });
  setAccessToken(res.data.accessToken);
  setRefreshToken(res.data.refreshToken);
  return res.data.user as User;
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    setAccessToken(null);
    setRefreshToken(null);
  }
};

export const getMe = () => apiClient.get<User>('/auth/me', { timeout: 15000 });

export const updateProfile = (data: Partial<User>) =>
  apiClient.patch<User>('/auth/profile', data);

export const changePassword = (oldPassword: string, newPassword: string) =>
  apiClient.patch('/auth/password', { oldPassword, newPassword });
