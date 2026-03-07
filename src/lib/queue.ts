import { Queue } from 'bullmq';
import { getRedisConnection } from './redis';

export const QUEUE_NAMES = {
  MORNING_PROMPT: 'morning-prompt',
  CHECKIN_REMINDER: 'checkin-reminder',
  EXPIRATION: 'expiration',
  FOLLOWUP_CHECKIN: 'followup-checkin',
  EVENING_REFLECTION: 'evening-reflection',
  WEEKLY_SUMMARY: 'weekly-summary',
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
    eveningReflection: new Queue(QUEUE_NAMES.EVENING_REFLECTION, { connection }),
    weeklySummary: new Queue(QUEUE_NAMES.WEEKLY_SUMMARY, { connection }),
  };

  console.log('[QUEUE] All queues initialized');
  return queues;
}
