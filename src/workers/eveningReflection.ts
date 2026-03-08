import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue';
import { supabaseAdmin } from '../lib/supabase';
import { sendPushNotification } from '../lib/push';

interface EveningReflectionJob {
  userId: string;
  taskDate: string;
}

function getEveningBody(archetype: string, task: any): string {
  const shortTask = task.task_text?.length > 40
    ? task.task_text.substring(0, 40) + '...'
    : task.task_text;

  if (task.status === 'done') {
    const doneMessages: Record<string, string[]> = {
      structured_achiever: [
        `You shipped "${shortTask}" today. How many items left on your list?`,
        `"${shortTask}" is done. Was today a full clear or partial?`,
      ],
      anxious_perfectionist: [
        `You finished "${shortTask}." How do you feel — relieved or still worried it's not good enough?`,
        `"${shortTask}" is done. Can you let it be done, or is your brain still editing it?`,
      ],
      chaotic_creative: [
        `"${shortTask}" — done. Did the energy last or did you push through the end?`,
        `You finished "${shortTask}." Was it a flow state or a grind?`,
      ],
      novelty_seeker: [
        `"${shortTask}" is complete. Already thinking about the next thing?`,
        `You finished "${shortTask}." What's pulling your curiosity now?`,
      ],
      strategic_planner: [
        `"${shortTask}" shipped. Did you execute or did you over-plan and rush at the end?`,
        `You delivered "${shortTask}." How much time was execution vs planning today?`,
      ],
      flexible_improviser: [
        `"${shortTask}" done. Did your energy match the task today?`,
        `You finished "${shortTask}." Was today a high-energy day or did you push through low?`,
      ],
      adaptive_generalist: [
        `"${shortTask}" complete. Was today's mode the right one?`,
        `You shipped "${shortTask}." Did you stay in one mode or switch mid-day?`,
      ],
    };
    const pool = doneMessages[archetype] || doneMessages['adaptive_generalist'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (task.status === 'working') {
    return `"${shortTask}" is still in progress. What got in the way of finishing?`;
  }

  if (task.status === 'not_started') {
    const notStartedMessages: Record<string, string[]> = {
      anxious_perfectionist: [
        `"${shortTask}" didn't happen today. Was it the task that was wrong, or the day?`,
      ],
      strategic_planner: [
        `"${shortTask}" didn't ship. Did you plan instead of execute?`,
      ],
      chaotic_creative: [
        `"${shortTask}" didn't land today. Did the energy just not show up?`,
      ],
    };
    const pool = notStartedMessages[archetype] ||
      [`"${shortTask}" didn't happen today. What got in the way?`];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Fallback
  return 'How was today overall?';
}

async function processEveningReflection(job: Job<EveningReflectionJob>) {
  const { userId, taskDate } = job.data;
  console.log(`[EVENING] Processing for user ${userId}, date: ${taskDate}`);

  // 1. Fetch today's task
  const { data: task } = await supabaseAdmin
    .from('companion_daily_tasks')
    .select('id, task_text, status, is_rest_day, evening_sent_at, followup_status')
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

  // 6. Fetch push token and archetype in parallel
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
    console.warn(`[EVENING] No push token for user ${userId}, skipping`);
    return;
  }

  const archetype = quizResult.data?.archetype || 'adaptive_generalist';

  // 7. Build archetype-specific notification body based on task outcome
  const body = getEveningBody(archetype, task);

  const result = await sendPushNotification({
    pushToken: settingsResult.data.expo_push_token,
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
