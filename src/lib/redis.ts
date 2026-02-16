import IORedis from 'ioredis';

let redis: IORedis | null = null;

export function getRedis(): IORedis | null {
  if (!process.env.REDIS_URL) {
    console.warn('[REDIS] No REDIS_URL set — queue features disabled');
    return null;
  }

  if (!redis) {
    redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
    });
    redis.on('connect', () => console.log('[REDIS] Connected'));
    redis.on('error', (err) => console.error('[REDIS] Error:', err.message));
  }

  return redis;
}

export function closeRedis(): Promise<void> {
  if (redis) {
    return redis.quit().then(() => {
      redis = null;
    });
  }
  return Promise.resolve();
}
