import { io, Socket } from 'socket.io-client';
import { authStore } from '@/stores/auth-store';

let socketInstance: Socket | null = null;

export function getSocket() {
  const token = authStore.getState().token;

  if (!socketInstance) {
    socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      autoConnect: false
    });
  }

  if (!token) {
    if (socketInstance.connected) socketInstance.disconnect();
    return socketInstance;
  }

  socketInstance.auth = { token };
  if (!socketInstance.connected) socketInstance.connect();

  return socketInstance;
}
