import { Queue, type ConnectionOptions } from 'bullmq';
import { getRedis } from './redis';

// Queue names — these match the job types in the technical architecture
export const QUEUE_NAMES = {
  MORNING_PROMPT: 'morning-prompt',
  CHECKIN_REMINDER: 'checkin-reminder',
  EVENING_REFLECTION: 'evening-reflection',
  FOLLOW_UP: 'follow-up',
} as const;

let morningQueue: Queue | null = null;
let checkinQueue: Queue | null = null;

export function getQueues() {
  const redis = getRedis();
  if (!redis) return null;

  if (!morningQueue) {
    const opts = { connection: redis as unknown as ConnectionOptions };
    morningQueue = new Queue(QUEUE_NAMES.MORNING_PROMPT, opts);
    checkinQueue = new Queue(QUEUE_NAMES.CHECKIN_REMINDER, opts);
    console.log('[QUEUE] Queues initialized');
  }

  return { morningQueue, checkinQueue };
}
