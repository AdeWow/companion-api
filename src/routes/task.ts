import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { getQueues } from '../lib/queue';

export default async function taskRoutes(fastify: FastifyInstance) {
  // POST /task — User sets their daily task
  fastify.post('/task', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const { taskText, checkinOffsetHours, energyLevel, isRestDay } = request.body as {
      taskText?: string;
      checkinOffsetHours?: number; // Hours from now until check-in (default: 4)
      energyLevel?: string; // 'high', 'medium', 'low'
      isRestDay?: boolean;
    };

    // Validate energyLevel if provided
    if (energyLevel && !['high', 'medium', 'low'].includes(energyLevel)) {
      return reply.status(400).send({ error: 'energyLevel must be high, medium, or low' });
    }

    // taskText is required unless it's a rest day
    if (!isRestDay && (!taskText || taskText.trim().length === 0)) {
      return reply.status(400).send({ error: 'taskText is required' });
    }

    // Fetch user's timezone so task_date matches GET /daily
    const { data: settings } = await supabaseAdmin
      .from('companion_user_settings')
      .select('timezone')
      .eq('user_id', userId)
      .single();

    const tz = settings?.timezone || 'America/New_York';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const offsetHours = checkinOffsetHours || 4;

    // --- Rest day flow ---
    if (isRestDay) {
      const { data: task, error } = await supabaseAdmin
        .from('companion_daily_tasks')
        .upsert({
          user_id: userId,
          task_date: today,
          task_text: null,
          status: 'rest',
          energy_level: energyLevel || null,
          is_rest_day: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,task_date' })
        .select()
        .single();

      if (error) {
        console.error('[TASK] Rest day upsert failed:', JSON.stringify({
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          payload: { user_id: userId, task_date: today, status: 'rest', energy_level: energyLevel || null, is_rest_day: true },
        }));
        return reply.status(500).send({ error: 'Failed to save rest day' });
      }

      // Do NOT schedule a check-in job for rest days
      // Remove any existing check-in job in case task was previously set
      try {
        const queues = getQueues();
        const jobId = `checkin-${userId}-${today}`;
        const existing = await queues.checkinReminder.getJob(jobId);
        if (existing) await existing.remove();
      } catch (queueErr) {
        console.error('[TASK] Failed to remove existing check-in job:', queueErr);
      }

      console.log(`[TASK] Rest day set for user ${userId}`);

      return reply.send({
        success: true,
        restDay: true,
        message: 'Rest day locked in.',
      });
    }

    // --- Normal task flow ---
    const { data: task, error } = await supabaseAdmin
      .from('companion_daily_tasks')
      .upsert({
        user_id: userId,
        task_date: today,
        task_text: taskText!.trim(),
        status: 'pending',
        energy_level: energyLevel || null,
        is_rest_day: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,task_date' })
      .select()
      .single();

    if (error) {
      console.error('[TASK] Upsert failed:', error);
      return reply.status(500).send({ error: 'Failed to save task' });
    }

    // Schedule check-in reminder
    try {
      const queues = getQueues();
      const checkinDelay = offsetHours * 60 * 60 * 1000;
      const jobId = `checkin-${userId}-${today}`;

      // Remove existing check-in job if task is being updated
      const existing = await queues.checkinReminder.getJob(jobId);
      if (existing) await existing.remove();

      await queues.checkinReminder.add(
        jobId,
        {
          userId,
          taskId: task.id,
          taskText: taskText!.trim(),
          date: today,
        },
        {
          delay: checkinDelay,
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        }
      );

      console.log(`[TASK] Task set for user ${userId}, check-in in ${offsetHours}h`);
    } catch (queueErr) {
      // Queue failure shouldn't break task creation
      console.error('[TASK] Failed to schedule check-in:', queueErr);
    }

    return reply.send({
      success: true,
      task: {
        id: task.id,
        taskText: task.task_text,
        taskDate: task.task_date,
        status: task.status,
      },
    });
  });
}
