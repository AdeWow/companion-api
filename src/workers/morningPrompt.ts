import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { getQueues, QUEUE_NAMES } from '../lib/queue';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';
import { selectMessage, renderMessage, logMessage, getRecentMessageIds } from '../lib/messages';

interface MorningPromptJob {
  userId: string;
  morningTime: string; // "08:00"
  timezone: string;
}

async function processMorningPrompt(job: Job<MorningPromptJob>) {
  const { userId, morningTime, timezone } = job.data;
  console.log(`[MORNING] Processing for user ${userId}`);

  // 1. Fetch user's push token, archetype, and directiveness
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
    console.warn(`[MORNING] No push token for user ${userId}, skipping`);
    return;
  }

  const pushToken = settingsResult.data.expo_push_token;
  const archetype = quizResult.data?.archetype_result || 'universal';
  const directiveness = settingsResult.data.directiveness || 'gentle';

  // 2. Select a message
  const recentIds = await getRecentMessageIds(userId, 'morning_opening');
  const template = selectMessage('morning_opening', archetype, directiveness, recentIds);
  const messageText = renderMessage(template, {});

  // 3. Send push notification
  const result = await sendPushNotification({
    pushToken,
    title: 'Good morning',
    body: messageText,
    data: { type: 'morning_prompt', messageId: template.id },
    categoryId: 'morning_prompt',
  });

  if (result.success) {
    // 4. Log the message
    await logMessage(userId, template.id, 'morning_opening');

    // 5. Create a placeholder daily task row
    const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
    await supabaseAdmin
      .from('companion_daily_tasks')
      .upsert({
        user_id: userId,
        task_date: today,
        status: 'pending',
        morning_sent_at: new Date().toISOString(),
      }, { onConflict: 'user_id,task_date' });

    // 6. Schedule expiration (if user doesn't respond within 3 hours)
    try {
      const queues = getQueues();
      const expirationJobId = `morning-expire-${userId}-${today}`;
      await queues.expiration.add(
        expirationJobId,
        { userId, type: 'morning', date: today },
        {
          delay: 3 * 60 * 60 * 1000, // 3 hours
          jobId: expirationJobId,
          attempts: 1,
        }
      );
    } catch (err) {
      console.error('[MORNING] Failed to schedule expiration:', err);
    }

    console.log(`[MORNING] Sent to user ${userId}: "${messageText}"`);
  } else {
    console.error(`[MORNING] Failed to send to user ${userId}:`, result.error);
  }

  // 7. Schedule next morning prompt (tomorrow at the same time)
  await scheduleMorningPrompt(userId, morningTime, timezone);
}

/**
 * Schedule a morning prompt for a user.
 * Calculates the delay until the next occurrence of morningTime in the user's timezone.
 */
export async function scheduleMorningPrompt(
  userId: string,
  morningTime: string,
  timezone: string,
): Promise<void> {
  const queues = getQueues();
  const jobId = `morning-${userId}`;

  // Remove existing job if rescheduling
  const existing = await queues.morningPrompt.getJob(jobId);
  if (existing) await existing.remove();

  // Calculate delay until next morning time
  const [hours, minutes] = morningTime.split(':').map(Number);
  const now = new Date();

  // Create a date in the user's timezone for today's morning time
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
  const targetLocal = new Date(`${todayStr}T${morningTime}:00`);

  // Convert to the user's local time perspective
  const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  let delayMs: number;

  if (targetLocal > nowInTz) {
    // Morning time hasn't passed today
    delayMs = targetLocal.getTime() - nowInTz.getTime();
  } else {
    // Morning time already passed — schedule for tomorrow
    const tomorrowTarget = new Date(targetLocal);
    tomorrowTarget.setDate(tomorrowTarget.getDate() + 1);
    delayMs = tomorrowTarget.getTime() - nowInTz.getTime();
  }

  await queues.morningPrompt.add(
    jobId,
    { userId, morningTime, timezone },
    {
      delay: delayMs,
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
    }
  );

  const delayHours = (delayMs / (1000 * 60 * 60)).toFixed(1);
  console.log(`[MORNING] Scheduled for user ${userId} in ${delayHours}h`);
}

export function startMorningWorker() {
  const connection = getRedisConnection() as any;
  const worker = new Worker<MorningPromptJob>(
    QUEUE_NAMES.MORNING_PROMPT,
    processMorningPrompt,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => console.log(`[MORNING] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[MORNING] Job ${job?.id} failed:`, err.message));

  console.log('[MORNING] Worker started');
  return worker;
}
