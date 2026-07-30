import apiClient from './client';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  points: number;
  unlocked: boolean;
  current_value?: number;
  next_threshold?: number;
  progress?: number;
}

export const getAchievements = () =>
  apiClient.get<Achievement[]>('/achievements');
