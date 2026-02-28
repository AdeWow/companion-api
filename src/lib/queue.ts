import { Queue } from 'bullmq';
import { getRedisConnection } from './redis';

export const QUEUE_NAMES = {
  MORNING_PROMPT: 'morning-prompt',
  CHECKIN_REMINDER: 'checkin-reminder',
  EXPIRATION: 'expiration',
} as const;

let queues: Record<string, Queue> | null = null;

export function getQueues() {
  if (queues) return queues;

  const connection = getRedisConnection() as any;

  queues = {
    morningPrompt: new Queue(QUEUE_NAMES.MORNING_PROMPT, { connection }),
    checkinReminder: new Queue(QUEUE_NAMES.CHECKIN_REMINDER, { connection }),
    expiration: new Queue(QUEUE_NAMES.EXPIRATION, { connection }),
  };

  console.log('[QUEUE] All queues initialized');
  return queues;
}
