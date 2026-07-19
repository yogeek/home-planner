import { api } from './api';

export interface QueuedOp {
  path: string;
  body: Record<string, unknown>;
  method?: string;
}

const QUEUE_KEY = 'village.queue';
const CACHE_KEY = 'village.cache';

export function saveCache(state: unknown): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // stockage plein : tant pis pour le cache
  }
}

export function loadCache<T>(): T | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function readQueue(): QueuedOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedOp[];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedOp[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function enqueue(op: QueuedOp): void {
  writeQueue([...readQueue(), op]);
}

export function queueSize(): number {
  return readQueue().length;
}

/** Rejoue la file d'attente ; renvoie true si tout est passé */
export async function flushQueue(): Promise<boolean> {
  const q = readQueue();
  if (q.length === 0) return true;
  const remaining: QueuedOp[] = [];
  for (const op of q) {
    try {
      await api(op.path, { body: op.body, method: op.method });
    } catch (e) {
      // 4xx : opération invalide (doublon...), on la jette ; réseau : on garde
      if (!(e instanceof Error && 'status' in e && (e as { status: number }).status >= 400 && (e as { status: number }).status < 500)) {
        remaining.push(op);
      }
    }
  }
  writeQueue(remaining);
  return remaining.length === 0;
}
