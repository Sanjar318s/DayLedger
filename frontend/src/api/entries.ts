import apiClient from './client';

export interface Entry {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  event_at: string;
  remind_before_minutes: number;
  amount?: number;
  amount_type?: 'expense' | 'income';
  category?: string;
  category_id?: string;
  currency?: string;
  is_done: boolean;
  notified: boolean;
  created_at: string;
  updated_at: string;
  // Shared entry fields
  permission?: 'view' | 'edit';
  owner_avatar_url?: string;
  owner_nickname?: string;
  owner_frame_css?: string;
  owner_public_id?: string;
}

export const getEntries = (from: string, to: string, category_id?: string) =>
  apiClient.get<Entry[]>('/entries', { params: { from, to, category_id } });

export const createEntry = (data: Partial<Entry>) =>
  apiClient.post<Entry>('/entries', data);

export const updateEntry = (id: string, data: Partial<Entry>) =>
  apiClient.patch<Entry>(`/entries/${id}`, data);

export const deleteEntry = (id: string) =>
  apiClient.delete(`/entries/${id}`);

export const appendToDescription = (entryId: string, text: string) =>
  apiClient.patch(`/entries/${entryId}/append`, { text });
