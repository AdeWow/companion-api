import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';

interface MidDayEncouragementJob {
  userId: string;
  taskId: string;
  taskText: string;
  checkinTime: string; // ISO timestamp of expected check-in
}

function getMidDayMessage(archetype: string, taskText: string): { title: string; body: string } {
  const shortTask = taskText.length > 40 ? taskText.substring(0, 40) + '...' : taskText;

  const messages: Record<string, string[]> = {
    structured_achiever: [
      `Halfway point. "${shortTask}" — how's the progress?`,
      `Quick pulse check on "${shortTask}." Ticking along?`,
      `"${shortTask}" is still on the board. You tend to finish what you start.`,
    ],
    anxious_perfectionist: [
      `Just a gentle nudge about "${shortTask}." Any progress counts.`,
      `"${shortTask}" doesn't have to be perfect. Just touched.`,
      `Hey — no pressure on "${shortTask}." Even 10 minutes of work counts.`,
    ],
    chaotic_creative: [
      `Still riding the wave on "${shortTask}"?`,
      `"${shortTask}" — still got your attention, or did something else pull you?`,
      `Creative check: is "${shortTask}" flowing or stuck?`,
    ],
    novelty_seeker: [
      `"${shortTask}" — still interesting, or ready to switch?`,
      `Midway check on "${shortTask}." The novelty might be fading — push through.`,
      `Quick pulse: "${shortTask}" still has your attention?`,
    ],
    strategic_planner: [
      `"${shortTask}" — are you executing or replanning?`,
      `Midway check: is "${shortTask}" getting done, or getting planned more?`,
      `"${shortTask}" ships today. Not next week. Today.`,
    ],
    flexible_improviser: [
      `How's the energy holding up? "${shortTask}" still on track?`,
      `Midway on "${shortTask}." Energy check: still got fuel?`,
      `"${shortTask}" — flowing or forcing? Adjust if needed.`,
    ],
    adaptive_generalist: [
      `"${shortTask}" — how's it going in your current mode?`,
      `Midway check on "${shortTask}." Right mode for this task?`,
      `Quick pulse: "${shortTask}" progressing?`,
    ],
  };

  const pool = messages[archetype] || messages['adaptive_generalist'];
  const body = pool[Math.floor(Math.random() * pool.length)];

  return { title: 'Proli', body };
}

async function processMidDayEncouragement(job: Job<MidDayEncouragementJob>) {
  const { userId, taskId, taskText } = job.data;
  console.log(`[MIDDAY] Processing encouragement for user ${userId}, task: ${taskText}`);

  // 1. Fetch the task and verify it's still pending
  const { data: task } = await supabaseAdmin
    .from('companion_daily_tasks')
    .select('status, is_rest_day, checkin_sent_at')
    .eq('id', taskId)
    .single();

  // Guard: task doesn't exist
  if (!task) {
    console.log(`[MIDDAY] Task ${taskId} not found, skipping`);
    return;
  }

  // Guard: task already completed or checked in
  if (task.status !== 'pending') {
    console.log(`[MIDDAY] Task ${taskId} status is '${task.status}', skipping`);
    return;
  }

  // Guard: rest day
  if (task.is_rest_day) {
    console.log(`[MIDDAY] Task ${taskId} is a rest day, skipping`);
    return;
  }

  // Guard: check-in already sent
  if (task.checkin_sent_at) {
    console.log(`[MIDDAY] Check-in already sent for task ${taskId}, skipping`);
    return;
  }

  // 2. Fetch user's push token and archetype in parallel
  const [settingsResult, quizResult] = await Promise.all([
    supabaseAdmin
      .from('companion_user_settings')
      .select('expo_push_token')
      .eq('user_id', userId)
      .single(),
    supabaseAdmin
      .from('quiz_results')
      .select('archetype')
      .eq('user_id', userId)
      .single(),
  ]);

  if (!settingsResult.data?.expo_push_token) {
    console.warn(`[MIDDAY] No push token for user ${userId}, skipping`);
    return;
  }

  const pushToken = settingsResult.data.expo_push_token;
  const archetype = quizResult.data?.archetype || 'adaptive_generalist';

  // 3. Select a contextual message based on archetype and task text
  const { title, body } = getMidDayMessage(archetype, taskText);

  // 4. Send push notification (informational — no action buttons)
  const result = await sendPushNotification({
    pushToken,
    title,
    body,
    categoryId: 'midday_encouragement',
    data: { type: 'midday_encouragement', taskId },
  });

  if (result.success) {
    console.log(`[MIDDAY] Sent encouragement to user ${userId}: "${body}"`);
  } else {
    console.error(`[MIDDAY] Failed to send to user ${userId}:`, result.error);
  }
}

export function startMidDayWorker() {
  const connection = getRedisConnection() as any;
  const worker = new Worker<MidDayEncouragementJob>(
    QUEUE_NAMES.MIDDAY_ENCOURAGEMENT,
    processMidDayEncouragement,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => console.log(`[MIDDAY] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[MIDDAY] Job ${job?.id} failed:`, err.message));

  console.log('[MIDDAY] Worker started');
  return worker;
}
