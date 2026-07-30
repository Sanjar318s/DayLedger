import apiClient from './client';

export interface FriendRequest {
  id: string;
  status: string;
  created_at: string;
  public_id: string;
  nickname: string;
  avatar_url: string;
  email: string;
}

export interface Friend {
  id: string;
  email: string;
  public_id: string;
  nickname: string;
  avatar_url: string;
  is_online?: boolean;
  active_frame_css?: string | null;
  last_message_at?: string;
}

export const sendFriendRequest = (publicId: string) =>
  apiClient.post('/friends/request', { publicId });

export const acceptFriendRequest = (requestId: string) =>
  apiClient.patch(`/friends/accept/${requestId}`);

export const rejectFriendRequest = (requestId: string) =>
  apiClient.patch(`/friends/reject/${requestId}`);

export const getFriends = () => apiClient.get<Friend[]>('/friends');

export const getFriendRequests = () =>
  apiClient.get<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/friends/requests');

export const deleteFriend = (friendId: string) =>
  apiClient.delete(`/friends/${friendId}`);

export const blockUser = (publicId: string) =>
  apiClient.post('/friends/block', { publicId });

export const unblockUser = (blockedUserId: string) =>
  apiClient.delete(`/friends/block/${blockedUserId}`);

export const getBlockedUsers = () =>
  apiClient.get<Friend[]>('/friends/blocked');

