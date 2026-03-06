import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';

interface EveningReflectionJob {
  userId: string;
  taskDate: string;
}

async function processEveningReflection(job: Job<EveningReflectionJob>) {
  const { userId, taskDate } = job.data;
  console.log(`[EVENING] Processing for user ${userId}, date: ${taskDate}`);

  // 1. Fetch today's task
  const { data: task } = await supabaseAdmin
    .from('companion_daily_tasks')
    .select('id, task_text, status, is_rest_day, evening_sent_at')
    .eq('user_id', userId)
    .eq('task_date', taskDate)
    .single();

  // 2. Guard: no task today
  if (!task) {
    console.log(`[EVENING] No task for user ${userId} on ${taskDate}, skipping`);
    return;
  }

  // 3. Guard: already sent
  if (task.evening_sent_at) {
    console.log(`[EVENING] Already sent for user ${userId}, skipping`);
    return;
  }

  // 4. Guard: rest day
  if (task.is_rest_day) {
    console.log(`[EVENING] Rest day for user ${userId}, skipping`);
    return;
  }

  // 5. Update evening_sent_at
  await supabaseAdmin
    .from('companion_daily_tasks')
    .update({ evening_sent_at: new Date().toISOString() })
    .eq('id', task.id);

  // 6. Fetch push token
  const { data: settings } = await supabaseAdmin
    .from('companion_user_settings')
    .select('expo_push_token')
    .eq('user_id', userId)
    .single();

  if (!settings?.expo_push_token) {
    console.warn(`[EVENING] No push token for user ${userId}, skipping`);
    return;
  }

  // 7. Build notification body based on task outcome
  const taskText = task.task_text || 'your task';
  let body: string;

  if (task.status === 'done') {
    body = `You shipped ${taskText} today. How do you feel about it?`;
  } else if (task.status === 'working') {
    body = `${taskText} is still in progress. That's okay — how was today overall?`;
  } else {
    body = `Today didn't go as planned. What got in the way?`;
  }

  const result = await sendPushNotification({
    pushToken: settings.expo_push_token,
    title: "Day's end",
    body,
    categoryId: 'evening_reflection',
    data: { type: 'evening_reflection', taskId: task.id },
  });

  if (result.success) {
    console.log(`[EVENING] Sent to user ${userId}: "${body}"`);
  } else {
    console.error(`[EVENING] Failed to send to user ${userId}:`, result.error);
  }
}

export function startEveningWorker() {
  const connection = getRedisConnection() as any;
  const worker = new Worker<EveningReflectionJob>(
    QUEUE_NAMES.EVENING_REFLECTION,
    processEveningReflection,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => console.log(`[EVENING] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[EVENING] Job ${job?.id} failed:`, err.message));

  console.log('[EVENING] Worker started');
  return worker;
}
