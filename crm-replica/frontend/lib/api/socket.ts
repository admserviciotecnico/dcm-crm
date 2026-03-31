import { io, Socket } from 'socket.io-client';
import { authStore } from '@/stores/auth-store';

let socketInstance: Socket | null = null;

export function getSocket() {
  const token = authStore.getState().token;

  if (!socketInstance) {
    socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
  }

  if (!token) {
    socketInstance.auth = {};
    if (socketInstance.connected) socketInstance.disconnect();
    return socketInstance;
  }

  const previousToken = typeof socketInstance.auth === 'object' && socketInstance.auth !== null
    ? (socketInstance.auth as { token?: string }).token
    : undefined;

  if (previousToken !== token) {
    socketInstance.auth = { token };
    if (socketInstance.connected) {
      socketInstance.disconnect();
      socketInstance.connect();
    } else {
      socketInstance.connect();
    }
  } else if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}
