import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { getQueues, QUEUE_NAMES } from '../lib/queue';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';
import { selectMessage, renderMessage, logMessage, getRecentMessageIds } from '../lib/messages';

interface CheckinReminderJob {
  userId: string;
  taskId: string;
  taskText: string;
  date: string;
}

async function processCheckinReminder(job: Job<CheckinReminderJob>) {
  const { userId, taskId, taskText, date } = job.data;
  console.log(`[CHECKIN] Processing for user ${userId}, task: ${taskText}`);

  // 1. Verify the task still exists and is pending
  const { data: task } = await supabaseAdmin
    .from('companion_daily_tasks')
    .select('status, checkin_responded_at')
    .eq('id', taskId)
    .single();

  if (!task || task.checkin_responded_at || task.status !== 'pending') {
    console.log(`[CHECKIN] Task already resolved for user ${userId}, skipping`);
    return;
  }

  // 2. Fetch user's push token, archetype, and directiveness
  const [settingsResult, quizResult] = await Promise.all([
    supabaseAdmin
      .from('companion_user_settings')
      .select('expo_push_token, directiveness')
      .eq('user_id', userId)
      .single(),
    supabaseAdmin
      .from('quiz_results')
      .select('archetype_result')
      .eq('user_id', userId)
      .single(),
  ]);

  if (!settingsResult.data?.expo_push_token) {
    console.warn(`[CHECKIN] No push token for user ${userId}, skipping`);
    return;
  }

  const pushToken = settingsResult.data.expo_push_token;
  const archetype = quizResult.data?.archetype_result || 'universal';
  const directiveness = settingsResult.data.directiveness || 'gentle';

  // 3. Select a message
  const recentIds = await getRecentMessageIds(userId, 'checkin_notification');
  const template = selectMessage('checkin_notification', archetype, directiveness, recentIds);
  const messageText = renderMessage(template, { taskText });

  // 4. Send push notification with check-in action buttons
  const result = await sendPushNotification({
    pushToken,
    title: 'Check-in time',
    body: messageText,
    data: { type: 'checkin', taskId, messageId: template.id },
    categoryId: 'checkin',
  });

  if (result.success) {
    // 5. Log the message and update task
    await logMessage(userId, template.id, 'checkin_notification');

    await supabaseAdmin
      .from('companion_daily_tasks')
      .update({ checkin_sent_at: new Date().toISOString() })
      .eq('id', taskId);

    // 6. Schedule expiration (if user doesn't respond within 2 hours)
    try {
      const queues = getQueues();
      const expirationJobId = `checkin-expire-${userId}-${date}`;
      await queues.expiration.add(
        expirationJobId,
        { userId, type: 'checkin', taskId, date },
        {
          delay: 2 * 60 * 60 * 1000, // 2 hours
          jobId: expirationJobId,
          attempts: 1,
        }
      );
    } catch (err) {
      console.error('[CHECKIN] Failed to schedule expiration:', err);
    }

    console.log(`[CHECKIN] Sent to user ${userId}: "${messageText}"`);
  } else {
    console.error(`[CHECKIN] Failed to send to user ${userId}:`, result.error);
  }
}

export function startCheckinWorker() {
  const connection = getRedisConnection() as any;
  const worker = new Worker<CheckinReminderJob>(
    QUEUE_NAMES.CHECKIN_REMINDER,
    processCheckinReminder,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => console.log(`[CHECKIN] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[CHECKIN] Job ${job?.id} failed:`, err.message));

  console.log('[CHECKIN] Worker started');
  return worker;
}
