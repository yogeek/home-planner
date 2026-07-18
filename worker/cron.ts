import type { Env } from './index';

export async function runCron(cron: string, _env: Env): Promise<void> {
  console.log(`Cron déclenché : ${cron}`);
}
