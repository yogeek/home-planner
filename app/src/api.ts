import type { AppState } from './types';

const TOKEN_KEY = 'village.token';
const MEMBER_KEY = 'village.memberId';

/** Capture le jeton familial depuis l'URL (?k=...) puis le mémorise */
export function initToken(): void {
  const url = new URL(window.location.href);
  const k = url.searchParams.get('k');
  if (k) {
    localStorage.setItem(TOKEN_KEY, k);
    url.searchParams.delete('k');
    history.replaceState(null, '', url.toString());
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getMemberId(): string | null {
  return localStorage.getItem(MEMBER_KEY);
}

export function setMemberId(id: string): void {
  localStorage.setItem(MEMBER_KEY, id);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = AppState>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options?.method ?? (options?.body !== undefined ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${getToken() ?? ''}`,
      ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, (data.error as string) ?? 'Erreur réseau');
  return data as T;
}
