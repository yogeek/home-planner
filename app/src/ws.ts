import { getToken } from './api';
import { useStore } from './store';

let socket: WebSocket | null = null;
let retryMs = 1000;
let closedByApp = false;

export function connectWs(): void {
  const token = getToken();
  if (!token || socket) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${proto}://${location.host}/api/ws?k=${encodeURIComponent(token)}`);

  socket.onopen = () => {
    retryMs = 1000;
    // Rattrape les changements manqués pendant la déconnexion
    void useStore.getState().refresh();
  };

  socket.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string);
      if (msg.type === 'refresh') void useStore.getState().refresh();
    } catch {
      // message inconnu, ignoré
    }
  };

  socket.onclose = () => {
    socket = null;
    if (closedByApp) return;
    setTimeout(connectWs, retryMs);
    retryMs = Math.min(retryMs * 2, 30000);
  };

  socket.onerror = () => socket?.close();
}

export function disconnectWs(): void {
  closedByApp = true;
  socket?.close();
}
