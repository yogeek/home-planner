import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import type { Env } from './index';

export interface PushMessage {
  title: string;
  body: string;
  tag?: string;
}

/** Envoie une notification à tous les abonnements d'un membre. Nettoie les abonnements morts. */
export async function pushToMember(env: Env, memberId: string, message: PushMessage): Promise<void> {
  if (!env.VAPID_PUBLIC || !env.VAPID_PRIVATE) return;
  const { results } = await env.DB.prepare('SELECT * FROM push_subs WHERE member_id = ?').bind(memberId).all();

  const vapid = {
    subject: 'mailto:gdupin.continental@gmail.com',
    publicKey: env.VAPID_PUBLIC,
    privateKey: env.VAPID_PRIVATE,
  };

  for (const row of results) {
    const sub: PushSubscription = {
      endpoint: row.endpoint as string,
      expirationTime: null,
      keys: JSON.parse(row.keys as string),
    };
    try {
      const payload = await buildPushPayload({ data: JSON.stringify(message), options: { ttl: 3600 * 12 } }, sub, vapid);
      const res = await fetch(sub.endpoint, payload);
      if (res.status === 404 || res.status === 410) {
        await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(sub.endpoint).run();
      }
    } catch (e) {
      console.error('Échec push', memberId, e);
    }
  }
}
