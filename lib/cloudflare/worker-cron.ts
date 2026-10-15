// Vercel cron parity on Workers. One Cloudflare trigger ("*/5 * * * *") fires
// every 5 minutes; each Vercel schedule below runs when its minute/hour fields
// match the trigger time (UTC, same as Vercel). Routes keep their existing
// Bearer CRON_SECRET check. Disabled unless CF_CRON_MODE === 'enabled'.
export const VERCEL_CRONS: readonly { path: string; schedule: string }[] = [
  { path: '/api/orders/expire', schedule: '30 1 * * *' },
  { path: '/api/orders/sync-google-sheet', schedule: '45 16 * * *' },
  { path: '/api/admin/purge-deleted', schedule: '30 17 * * *' },
  { path: '/api/meta/purchase-retry', schedule: '20 18 * * *' },
  { path: '/api/agent-kit/preorder-launch', schedule: '10 17 * * *' },
  { path: '/api/reports/telegram/full-day', schedule: '5 10 * * *' },
  { path: '/api/email/campaigns/send-due', schedule: '0 2 * * *' },
  { path: '/api/email/worker/send-due', schedule: '30-59/5 1 * * *' },
];
export const WORKER_CRON_TRIGGER = '*/5 * * * *';

function field(spec: string, value: number, min: number, max: number): boolean {
  return spec.split(',').some(part => {
    const [range, stepText] = part.split('/'), step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw Error('Unsupported cron field');
    let lo: number, hi: number;
    if (range === '*') { lo = min; hi = max; }
    else if (range.includes('-')) { [lo, hi] = range.split('-').map(Number); }
    else { lo = Number(range); hi = stepText === undefined ? lo : max; }
    if (![lo, hi].every(Number.isInteger) || lo < min || hi > max || lo > hi) throw Error('Unsupported cron field');
    return value >= lo && value <= hi && (value - lo) % step === 0;
  });
}
export function cronMatches(schedule: string, at: Date) {
  const [m, h, dom, mon, dow] = schedule.trim().split(/\s+/);
  if ([dom, mon, dow].some(f => f !== '*')) throw Error('Only minute/hour schedules are supported');
  return field(m, at.getUTCMinutes(), 0, 59) && field(h, at.getUTCHours(), 0, 23);
}
// Every Vercel schedule must land on the 5-minute grid, or it would be skipped.
export function assertCronGrid() {
  for (const c of VERCEL_CRONS) {
    let hits = 0;
    for (let t = 0; t < 1440; t++) { const at = new Date(Date.UTC(2026, 0, 1, 0, t)); if (cronMatches(c.schedule, at)) { if (t % 5) throw Error('Off-grid cron ' + c.path); hits++; } }
    if (!hits) throw Error('Never-firing cron ' + c.path);
  }
}

type CronEnv = { CF_CRON_MODE?: string; CF_CRON_ORIGIN?: string; CRON_SECRET?: string };
export async function runWorkerCron(scheduledTime: number, env: CronEnv, appFetch: (request: Request) => Promise<Response>) {
  if (env.CF_CRON_MODE !== 'enabled') return [];
  const origin = env.CF_CRON_ORIGIN ?? '', secret = env.CRON_SECRET ?? '';
  if (!/^https:\/\/[a-z0-9.-]+$/.test(origin) || secret.length < 16) throw Error('Cron configuration unavailable');
  // Round to the trigger minute so a slightly late start still matches.
  const at = new Date(Math.floor(scheduledTime / 60000) * 60000), results: { path: string; status: number }[] = [];
  for (const c of VERCEL_CRONS) {
    if (!cronMatches(c.schedule, at)) continue;
    const response = await appFetch(new Request(origin + c.path, { method: 'GET', headers: { Authorization: `Bearer ${secret}`, 'User-Agent': 'cloudflare-cron/1' } })).catch(() => new Response(null, { status: 599 }));
    results.push({ path: c.path, status: response.status });
    await response.body?.cancel().catch(() => undefined);
  }
  return results;
}
