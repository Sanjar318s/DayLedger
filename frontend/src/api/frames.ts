import apiClient from './client';

export interface AvatarFrame {
  id: string;
  name: string;
  description: string;
  required_achievements: number;
  css_style: string;
  unlocked: boolean;
}

export const getFrames = () =>
  apiClient.get<AvatarFrame[]>('/frames');

export const setActiveFrame = (frameId: string) =>
  apiClient.patch('/frames/active', { frame_id: frameId });

export const getActiveFrame = () =>
  apiClient.get<AvatarFrame | null>('/frames/active');
