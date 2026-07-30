import apiClient from './client';

export interface Comment {
  id: string;
  entry_id: string;
  user_id: string;
  text: string;
  created_at: string;
  nickname: string;
  public_id: string;
  avatar_url: string;
}

export const getComments = (entryId: string) =>
  apiClient.get<Comment[]>(`/comments/${entryId}`);

export const addComment = (entryId: string, text: string) =>
  apiClient.post<Comment>(`/comments/${entryId}`, { text });

export const deleteComment = (entryId: string, commentId: string) =>
  apiClient.delete(`/comments/${entryId}/${commentId}`);
