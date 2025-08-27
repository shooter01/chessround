// src/presence-cleanup.ts
import type { Redis } from 'ioredis';

export const STARTUP_LOCK_KEY = 'presence:startup:lock';
export const STARTUP_LOCK_TTL = 15; // сек

export function waitRedisReady(client: Redis) {
  if ((client as any).status === 'ready') return Promise.resolve();
  return new Promise<void>((resolve) =>
    client.once('ready', () => resolve())
  );
}

export async function withStartupLock(
  pub: Redis,
  fn: () => Promise<void>
): Promise<void> {
  // SET NX EX — берём короткий lock, чтобы чистка выполнилась один раз при множественных экземплярах
  const ok = await pub.set(
    STARTUP_LOCK_KEY,
    String(process.pid),
    'NX',
    'EX',
    STARTUP_LOCK_TTL
  );
  if (!ok) return;
  try {
    await fn();
  } finally {
    // best-effort снятие локa
    await pub.del(STARTUP_LOCK_KEY).catch(() => {});
  }
}

export async function purgePresenceNamespace(
  pub: Redis,
  pattern = 'lobby:*'
) {
  let cursor = '0';
  do {
    const [next, keys] = await pub.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      500
    );
    cursor = next;
    if (keys.length) {
      const pipe = pub.pipeline();
      // UNLINK — неблокирующее удаление, быстрее на больших ключах
      keys.forEach((k) => pipe.unlink(k));
      await pipe.exec();
    }
  } while (cursor !== '0');
  console.log(`[presence] purged keys by pattern: ${pattern}`);
}
