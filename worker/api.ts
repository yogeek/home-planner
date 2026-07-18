import type { Env } from './index';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function handleApi(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice('/api'.length);

  if (path === '/health') {
    return json({ ok: true, ts: new Date().toISOString() });
  }

  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('k');
  if (token !== env.FAMILY_TOKEN) {
    return json({ error: 'Accès refusé' }, 401);
  }

  return json({ error: 'Introuvable' }, 404);
}
