import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { supabaseAdmin } from '../lib/supabase';
import { QUEUE_NAMES } from '../lib/queue';

interface ExpirationJob {
  userId: string;
  type: 'morning' | 'checkin';
  taskId?: string;
  date: string;
}

async function processExpiration(job: Job<ExpirationJob>) {
  const { userId, type, taskId, date } = job.data;
  console.log(`[EXPIRATION] Processing ${type} for user ${userId}`);

  if (type === 'morning') {
    // Check if user already set a task for today
    const { data: task } = await supabaseAdmin
      .from('companion_daily_tasks')
      .select('task_text, status')
      .eq('user_id', userId)
      .eq('task_date', date)
      .single();

    // If task_text is empty, user never responded to morning prompt
    if (task && (!task.task_text || task.task_text === '')) {
      await supabaseAdmin
        .from('companion_daily_tasks')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('task_date', date);

      console.log(`[EXPIRATION] Morning expired for user ${userId}`);
    } else {
      console.log(`[EXPIRATION] User ${userId} already set task, skipping`);
    }
  }

  if (type === 'checkin' && taskId) {
    // Check if user already responded
    const { data: task } = await supabaseAdmin
      .from('companion_daily_tasks')
      .select('status, checkin_responded_at')
      .eq('id', taskId)
      .single();

    if (task && !task.checkin_responded_at && task.status === 'pending') {
      await supabaseAdmin
        .from('companion_daily_tasks')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', taskId);

      console.log(`[EXPIRATION] Checkin expired for user ${userId}`);
    } else {
      console.log(`[EXPIRATION] User ${userId} already responded, skipping`);
    }
  }
}

export function startExpirationWorker() {
  const connection = getRedisConnection() as any;
  const worker = new Worker<ExpirationJob>(
    QUEUE_NAMES.EXPIRATION,
    processExpiration,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => console.log(`[EXPIRATION] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[EXPIRATION] Job ${job?.id} failed:`, err.message));

  console.log('[EXPIRATION] Worker started');
  return worker;
}
