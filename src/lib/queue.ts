import { Queue } from 'bullmq';
import { getRedisConnection } from './redis';

export const QUEUE_NAMES = {
  MORNING_PROMPT: 'morning-prompt',
  CHECKIN_REMINDER: 'checkin-reminder',
  EXPIRATION: 'expiration',
  FOLLOWUP_CHECKIN: 'followup-checkin',
} as const;

let queues: Record<string, Queue> | null = null;

export function getQueues() {
  if (queues) return queues;

  const connection = getRedisConnection() as any;

  queues = {
    morningPrompt: new Queue(QUEUE_NAMES.MORNING_PROMPT, { connection }),
    checkinReminder: new Queue(QUEUE_NAMES.CHECKIN_REMINDER, { connection }),
    expiration: new Queue(QUEUE_NAMES.EXPIRATION, { connection }),
    followupCheckin: new Queue(QUEUE_NAMES.FOLLOWUP_CHECKIN, { connection }),
  };

  console.log('[QUEUE] All queues initialized');
  return queues;
}
