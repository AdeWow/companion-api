import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { getQueues, QUEUE_NAMES } from '../lib/queue';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';
import { getArchetypeConfig } from '../config/archetypeConfig';

interface MorningPromptJob {
  userId: string;
}

async function processMorningPrompt(job: Job<MorningPromptJob>) {
  const { userId } = job.data;
  console.log(`[MORNING] Processing for user ${userId}`);

  // 1. Fetch user's settings and archetype
  const [settingsResult, quizResult] = await Promise.all([
    supabaseAdmin
      .from('companion_user_settings')
      .select('expo_push_token, morning_time, timezone, evening_time')
      .eq('user_id', userId)
      .single(),
    supabaseAdmin
      .from('quiz_results')
      .select('archetype')
      .eq('user_id', userId)
      .single(),
  ]);

  if (!settingsResult.data?.expo_push_token) {
    console.warn(`[MORNING] No push token for user ${userId}, skipping`);
    return;
  }

  const { expo_push_token: pushToken, morning_time: morningTime, timezone, evening_time: eveningTimePref } = settingsResult.data;
  const archetype = quizResult.data?.archetype || null;

  // 2. Select a message from archetype prompt pool
  const config = getArchetypeConfig(archetype);
  const promptPool = config.morningPromptPool;
  const messageText = promptPool[Math.floor(Math.random() * promptPool.length)];

  const tz = timezone || 'America/New_York';

  // 3. Send push notification
  const result = await sendPushNotification({
    pushToken,
    title: 'Good morning',
    body: messageText,
    data: { type: 'morning_prompt' },
    categoryId: 'morning_prompt',
  });

  if (result.success) {

    // 5. Create a placeholder daily task row
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
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

  // 7. Schedule evening reflection for today at 8pm user local time
  try {
    const queues = getQueues();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const eveningJobId = `evening-${userId}-${today}`;

    // Calculate delay until 8pm in user's timezone
    const nowUtc = new Date();
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const tzParts = tzFormatter.formatToParts(nowUtc);
    const getTzPart = (type: string) => parseInt(tzParts.find(p => p.type === type)?.value || '0');
    const nowTzMinutes = getTzPart('hour') * 60 + getTzPart('minute');
    const eveningTimeStr = eveningTimePref || '20:00:00';
    const [eveningHour, eveningMinute] = eveningTimeStr.split(':').map(Number);
    const eveningTzMinutes = eveningHour * 60 + (eveningMinute || 0);

    let eveningDelayMinutes = eveningTzMinutes - nowTzMinutes;
    if (eveningDelayMinutes > 0) {
      const eveningDelayMs = eveningDelayMinutes * 60 * 1000;

      const existing = await queues.eveningReflection.getJob(eveningJobId);
      if (existing) await existing.remove();

      await queues.eveningReflection.add(
        eveningJobId,
        { userId, taskDate: today },
        {
          delay: eveningDelayMs,
          jobId: eveningJobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
      const eveningDelayHours = (eveningDelayMs / (1000 * 60 * 60)).toFixed(1);
      console.log(`[MORNING] Evening reflection scheduled for user ${userId} in ${eveningDelayHours}h`);
    }
  } catch (err) {
    console.error('[MORNING] Failed to schedule evening reflection:', err);
  }

  // 8. Schedule weekly summary on Sundays at 7pm user local time
  try {
    const dayName = new Date().toLocaleDateString('en-US', {
      timeZone: tz,
      weekday: 'long',
    });

    if (dayName === 'Sunday') {
      const queues = getQueues();
      const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      const summaryJobId = `weekly-${userId}-${today}`;

      // Calculate delay until 7pm in user's timezone
      const nowUtc = new Date();
      const tzFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const tzParts = tzFormatter.formatToParts(nowUtc);
      const getP = (type: string) => parseInt(tzParts.find(p => p.type === type)?.value || '0');
      const nowMinutes = getP('hour') * 60 + getP('minute');
      const summaryMinutes = 19 * 60; // 7pm

      let summaryDelay = summaryMinutes - nowMinutes;
      if (summaryDelay > 0) {
        const summaryDelayMs = summaryDelay * 60 * 1000;

        const existing = await queues.weeklySummary.getJob(summaryJobId);
        if (existing) await existing.remove();

        await queues.weeklySummary.add(
          summaryJobId,
          { userId },
          {
            delay: summaryDelayMs,
            jobId: summaryJobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }
        );
        const summaryDelayHours = (summaryDelayMs / (1000 * 60 * 60)).toFixed(1);
        console.log(`[MORNING] Weekly summary scheduled for user ${userId} in ${summaryDelayHours}h`);
      }
    }
  } catch (err) {
    console.error('[MORNING] Failed to schedule weekly summary:', err);
  }

  // 9. Schedule next morning prompt (tomorrow at the same time)
  if (morningTime) {
    await scheduleMorningPrompt(userId, morningTime, tz);
  }
}

export async function scheduleMorningPrompt(
  userId: string,
  morningTime: string,
  timezone: string,
): Promise<void> {
  const queues = getQueues();

  const [hours, minutes] = morningTime.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.error(`[MORNING] Invalid morning_time format: "${morningTime}" for user ${userId}`);
    return;
  }

  // Use Intl.DateTimeFormat to get the current time in the user's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

  const nowInTzHours = getPart('hour');
  const nowInTzMinutes = getPart('minute');
  const nowInTzTotalMinutes = nowInTzHours * 60 + nowInTzMinutes;
  const targetTotalMinutes = hours * 60 + minutes;

  // Calculate minutes until next occurrence
  let minutesUntil = targetTotalMinutes - nowInTzTotalMinutes;
  if (minutesUntil <= 0) {
    minutesUntil += 24 * 60; // Tomorrow
  }

  const delayMs = minutesUntil * 60 * 1000;

  // Safety check
  if (!isFinite(delayMs) || delayMs < 0) {
    console.error(`[MORNING] Invalid delay calculated: ${delayMs}ms for user ${userId}`);
    return;
  }

  const tomorrow = new Date(now.getTime() + delayMs);
  const jobId = `morning-${userId}-${tomorrow.toISOString().split('T')[0]}`;

  // Remove any existing job to avoid duplicates
  const existing = await queues.morningPrompt.getJob(jobId);
  if (existing) {
    await existing.remove();
  }

  await queues.morningPrompt.add(
    jobId,
    { userId },
    {
      delay: delayMs,
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
    }
  );

  const delayHours = (delayMs / (1000 * 60 * 60)).toFixed(1);
  console.log(`[MORNING] Scheduled for user ${userId} in ${delayHours}h (${morningTime} ${timezone})`);
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
