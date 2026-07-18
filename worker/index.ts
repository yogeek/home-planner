import { handleApi } from './api';
import { VillageHub } from './do';
import { runCron } from './cron';

export { VillageHub };

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  VILLAGE_HUB: DurableObjectNamespace;
  FAMILY_TOKEN: string;
  VAPID_PUBLIC?: string;
  VAPID_PRIVATE?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCron(event.cron, env));
  },
} satisfies ExportedHandler<Env>;
