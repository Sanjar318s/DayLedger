import apiClient from './client';
import { Entry } from './entries';

export interface Share {
  id: string;
  entry_id: string;
  owner_id: string;
  friend_id: string;
  permission: 'view' | 'edit';
  accepted: boolean;
  created_at: string;
  owner_public_id?: string;
  owner_nickname?: string;
  friend_public_id?: string;
  friend_nickname?: string;
  title?: string;
  entry_title?: string;
}

export const shareEntry = (entryId: string, friendPublicId: string, permission: string) =>
  apiClient.post(`/shares/${entryId}`, { friendPublicId, permission });

export const respondToShare = (shareId: string, accept: boolean) =>
  apiClient.patch(`/shares/${shareId}`, { accept });

export const updateSharePermission = (shareId: string, permission: string) =>
  apiClient.patch(`/shares/${shareId}`, { permission });

export const getSharedWithMe = () =>
  apiClient.get<Array<Entry & { share_id: string; permission: string; owner_public_id: string; owner_nickname: string }>>('/shares/shared-with-me');

export const getSharedByMe = () =>
  apiClient.get<Share[]>('/shares/shared-by-me');

export const deleteShare = (shareId: string) =>
  apiClient.delete(`/shares/${shareId}`);

export const getShareInvites = () =>
  apiClient.get<Share[]>('/shares/invites');
