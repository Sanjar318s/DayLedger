import apiClient from './client';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  reply_to_id?: string | null;
  created_at: string;
  read_at?: string | null;
}

export const getMessages = (friendId: string) =>
  apiClient.get<Message[]>(`/messages/${friendId}`);

export const markMessagesRead = (friendId: string) =>
  apiClient.patch(`/messages/read/${friendId}`);

export const markAllMessagesRead = () =>
  apiClient.patch('/messages/read-all');
