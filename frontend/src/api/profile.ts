import apiClient from './client';

export interface UserProfile {
  public_id: string;
  nickname: string | null;
  avatar_url: string | null;
  level: number;
  points: number;
  xpForNextLevel: number;
  currentLevelXP: number;
  progress: number;
  notesCount: number;
  friendsCount: number;
  projectsCount: number;
  isOwner?: boolean;
  active_frame_css?: string | null;
}

export const getProfile = (publicId: string) =>
  apiClient.get<UserProfile>(`/profile/${publicId}`);

export const updateVisibilitySettings = (data: {
  show_notes_count?: boolean;
  show_friends_count?: boolean;
  show_projects_count?: boolean;
}) => apiClient.patch('/profile/settings', data);
