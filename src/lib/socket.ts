import { io, Socket } from 'socket.io-client';

import { API_URL } from './api';
import { tokenStorage } from './storage';

/**
 * Lazily-created singleton Socket.IO connection to the realtime gateway.
 *
 * Auth uses the current access token via `handshake.auth.token`. We force the
 * `websocket` transport — React Native has no XHR long-polling, and adb reverse
 * tunnels port 3000, so `ws://localhost:3000` reaches the dev server.
 */
let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket) return socket;
  const token = await tokenStorage.getAccess();
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    autoConnect: true,
  });
  return socket;
}

/** Re-authenticate the socket after login/refresh and reconnect. */
export async function reconnectSocket(): Promise<void> {
  const token = await tokenStorage.getAccess();
  if (!socket) {
    await getSocket();
    return;
  }
  socket.auth = { token };
  socket.disconnect().connect();
}

/** Tear the socket down on logout. */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
