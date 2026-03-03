import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';

interface FollowupCheckinJob {
  userId: string;
  taskId: string;
  originalStatus: string;
  taskText: string;
}

async function processFollowupCheckin(job: Job<FollowupCheckinJob>) {
  const { userId, taskId, originalStatus, taskText } = job.data;
  console.log(`[FOLLOWUP] Processing for user ${userId}, original status: ${originalStatus}`);

  // 1. Fetch the task
  const { data: task } = await supabaseAdmin
    .from('companion_daily_tasks')
    .select('status, followup_responded_at, is_rest_day')
    .eq('id', taskId)
    .single();

  if (!task) {
    console.log(`[FOLLOWUP] Task ${taskId} not found, skipping`);
    return;
  }

  // 2. Guard: already responded to follow-up
  if (task.followup_responded_at) {
    console.log(`[FOLLOWUP] Already responded for user ${userId}, skipping`);
    return;
  }

  // 3. Guard: task completed since check-in
  if (task.status === 'done') {
    console.log(`[FOLLOWUP] Task already done for user ${userId}, skipping`);
    return;
  }

  // 4. Guard: rest day
  if (task.is_rest_day) {
    console.log(`[FOLLOWUP] Rest day for user ${userId}, skipping`);
    return;
  }

  // 5. Update followup_sent_at
  await supabaseAdmin
    .from('companion_daily_tasks')
    .update({ followup_sent_at: new Date().toISOString() })
    .eq('id', taskId);

  // 6. Fetch push token
  const { data: settings } = await supabaseAdmin
    .from('companion_user_settings')
    .select('expo_push_token')
    .eq('user_id', userId)
    .single();

  if (!settings?.expo_push_token) {
    console.warn(`[FOLLOWUP] No push token for user ${userId}, skipping`);
    return;
  }

  // 7. Send push notification
  const body = originalStatus === 'working'
    ? `Still working on ${taskText}? How's it looking?`
    : `Any progress on ${taskText}?`;

  const result = await sendPushNotification({
    pushToken: settings.expo_push_token,
    title: 'Quick check',
    body,
    categoryId: 'followup_checkin',
    data: { type: 'followup', taskId },
  });

  if (result.success) {
    console.log(`[FOLLOWUP] Sent to user ${userId}: "${body}"`);
  } else {
    console.error(`[FOLLOWUP] Failed to send to user ${userId}:`, result.error);
  }
}

export function startFollowupWorker() {
  const connection = getRedisConnection() as any;
  const worker = new Worker<FollowupCheckinJob>(
    QUEUE_NAMES.FOLLOWUP_CHECKIN,
    processFollowupCheckin,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => console.log(`[FOLLOWUP] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[FOLLOWUP] Job ${job?.id} failed:`, err.message));

  console.log('[FOLLOWUP] Worker started');
  return worker;
}
