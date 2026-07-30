import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './token';

let socket: Socket | null = null;

export const getSocket = (userId?: string): Socket => {
  if (!socket) {
    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:4000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      query: { userId: userId || '' }, // передаём userId
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
