import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';

interface WeeklySummaryJob {
  userId: string;
}

async function processWeeklySummary(job: Job<WeeklySummaryJob>) {
  const { userId } = job.data;
  console.log(`[WEEKLY] Processing for user ${userId}`);

  // 1. Fetch user settings
  const { data: settings } = await supabaseAdmin
    .from('companion_user_settings')
    .select('expo_push_token, timezone')
    .eq('user_id', userId)
    .single();

  if (!settings?.expo_push_token) {
    console.warn(`[WEEKLY] No push token for user ${userId}, skipping`);
    return;
  }

  const tz = settings.timezone || 'America/New_York';

  // 2. Calculate Monday–Sunday of the current week
  const now = new Date();
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const todayDate = new Date(todayStr + 'T00:00:00');
  const dayOfWeek = todayDate.getDay(); // 0 = Sunday
  // Monday = today - ((dayOfWeek + 6) % 7) days
  const mondayOffset = (dayOfWeek + 6) % 7;
  const monday = new Date(todayDate);
  monday.setDate(monday.getDate() - mondayOffset);
  const mondayStr = monday.toISOString().split('T')[0];

  // 3. Fetch all tasks for this week
  const { data: weekTasks } = await supabaseAdmin
    .from('companion_daily_tasks')
    .select('status, is_rest_day, task_date, task_2_status, task_3_status')
    .eq('user_id', userId)
    .gte('task_date', mondayStr)
    .lte('task_date', todayStr);

  // 4. Calculate stats
  const totalDays = weekTasks?.length || 0;
  const restDays = weekTasks?.filter(t => t.is_rest_day).length || 0;

  const completedDays = weekTasks?.filter(t => {
    if (t.status === 'done') return true;
    // Partial: at least one sub-task done
    if (t.task_2_status === 'done' || t.task_3_status === 'done') return true;
    return false;
  }).length || 0;

  // 5. Build summary message
  let body: string;

  if (totalDays === 0) {
    body = "Quiet week. Proli's here when you're ready.";
  } else if (completedDays >= 5) {
    body = `Perfect week. ${completedDays} days, all shipped.`;
  } else if (completedDays === 4) {
    body = `Strong week. ${completedDays} out of 5 weekdays completed.`;
  } else if (completedDays === 3) {
    body = `Solid week. ${completedDays} shipped${restDays > 0 ? `, ${restDays} rest day${restDays > 1 ? 's' : ''} taken` : ''}.`;
  } else {
    body = `Lighter week. ${completedDays} completed. Fresh start Monday.`;
  }

  // 6. Send push notification
  const result = await sendPushNotification({
    pushToken: settings.expo_push_token,
    title: 'Your week',
    body,
    categoryId: 'weekly_summary',
    data: { type: 'weekly_summary' },
  });

  if (result.success) {
    console.log(`[WEEKLY] Sent to user ${userId}: "${body}"`);
  } else {
    console.error(`[WEEKLY] Failed to send to user ${userId}:`, result.error);
  }
}

export function startWeeklySummaryWorker() {
  const connection = getRedisConnection() as any;
  const worker = new Worker<WeeklySummaryJob>(
    QUEUE_NAMES.WEEKLY_SUMMARY,
    processWeeklySummary,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => console.log(`[WEEKLY] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[WEEKLY] Job ${job?.id} failed:`, err.message));

  console.log('[WEEKLY] Worker started');
  return worker;
}
