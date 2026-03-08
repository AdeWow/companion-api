import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { getQueues } from '../lib/queue';
import { getArchetypeConfig } from '../config/archetypeConfig';

export default async function taskRoutes(fastify: FastifyInstance) {
  // POST /task — User sets their daily task(s)
  fastify.post('/task', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const body = request.body as {
      taskText?: string;
      tasks?: string[];
      checkinOffsetHours?: number;
      energyLevel?: string;
      isRestDay?: boolean;
      contextMode?: string;
      taskCategory?: string;
      shippingIntensity?: string;
    };

    const { checkinOffsetHours, energyLevel, isRestDay, contextMode, taskCategory, shippingIntensity } = body;

    // Validate energyLevel if provided
    if (energyLevel && !['high', 'medium', 'low'].includes(energyLevel)) {
      return reply.status(400).send({ error: 'energyLevel must be high, medium, or low' });
    }

    // Validate contextMode if provided
    if (contextMode && !['execution', 'creative', 'planning', 'low_energy'].includes(contextMode)) {
      return reply.status(400).send({ error: 'contextMode must be execution, creative, planning, or low_energy' });
    }

    // Validate taskCategory if provided
    if (taskCategory && !['personal', 'professional', 'side_project'].includes(taskCategory)) {
      return reply.status(400).send({ error: 'taskCategory must be personal, professional, or side_project' });
    }

    // Validate shippingIntensity if provided
    if (shippingIntensity && !['light', 'medium', 'heavy'].includes(shippingIntensity)) {
      return reply.status(400).send({ error: 'shippingIntensity must be light, medium, or heavy' });
    }

    // Normalize tasks array (backward compatible)
    let tasks: string[];
    if (Array.isArray(body.tasks)) {
      tasks = body.tasks.map(t => t.trim()).filter(t => t.length > 0);
    } else if (body.taskText) {
      tasks = [body.taskText.trim()].filter(t => t.length > 0);
    } else {
      tasks = [];
    }

    // taskText/tasks is required unless it's a rest day
    if (!isRestDay && tasks.length === 0) {
      return reply.status(400).send({ error: 'taskText is required' });
    }

    // Fetch user's timezone and archetype in parallel
    const [settingsRes, quizRes] = await Promise.all([
      supabaseAdmin
        .from('companion_user_settings')
        .select('timezone')
        .eq('user_id', userId)
        .single(),
      supabaseAdmin
        .from('quiz_results')
        .select('archetype')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const tz = settingsRes.data?.timezone || 'America/New_York';
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
          task_2_text: null,
          task_3_text: null,
          status: 'rest',
          task_2_status: null,
          task_3_status: null,
          energy_level: energyLevel || null,
          is_rest_day: true,
          context_mode: contextMode || null,
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

      // Do NOT schedule check-in or mid-day jobs for rest days
      try {
        const queues = getQueues();
        const jobId = `checkin-${userId}-${today}`;
        const existing = await queues.checkinReminder.getJob(jobId);
        if (existing) await existing.remove();

        // Also remove any pending mid-day encouragement
        if (task?.id) {
          const midDayJobId = `midday-${task.id}`;
          const existingMidDay = await queues.midDayEncouragement.getJob(midDayJobId);
          if (existingMidDay) await existingMidDay.remove();
        }
      } catch (queueErr) {
        console.error('[TASK] Failed to remove existing jobs:', queueErr);
      }

      console.log(`[TASK] Rest day set for user ${userId}`);

      return reply.send({
        success: true,
        restDay: true,
        message: 'Rest day locked in.',
      });
    }

    // --- Normal task flow ---

    // Validate task count against archetype maxTasks
    const archetype = quizRes.data?.archetype || null;
    const config = getArchetypeConfig(archetype);

    if (tasks.length > config.maxTasks) {
      return reply.status(400).send({
        error: `Your archetype supports up to ${config.maxTasks} tasks`,
      });
    }

    // Upsert today's task(s)
    const { data: task, error } = await supabaseAdmin
      .from('companion_daily_tasks')
      .upsert({
        user_id: userId,
        task_date: today,
        task_text: tasks[0],
        task_2_text: tasks[1] || null,
        task_3_text: tasks[2] || null,
        status: 'pending',
        task_2_status: tasks[1] ? 'pending' : null,
        task_3_status: tasks[2] ? 'pending' : null,
        energy_level: energyLevel || null,
        is_rest_day: false,
        context_mode: contextMode || null,
        task_category: taskCategory || null,
        shipping_intensity: shippingIntensity || null,
        task_set_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,task_date' })
      .select()
      .single();

    if (error) {
      console.error('[TASK] Upsert failed:', error);
      return reply.status(500).send({ error: 'Failed to save task' });
    }

    // Schedule check-in reminder (one check-in for all tasks)
    try {
      const queues = getQueues();
      const checkinDelay = offsetHours * 60 * 60 * 1000;
      const jobId = `checkin-${userId}-${today}`;

      const existing = await queues.checkinReminder.getJob(jobId);
      if (existing) await existing.remove();

      await queues.checkinReminder.add(
        jobId,
        {
          userId,
          taskId: task.id,
          taskText: tasks[0],
          date: today,
        },
        {
          delay: checkinDelay,
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        }
      );

      // Schedule mid-day encouragement at the midpoint (only if check-in is 2+ hours away)
      const midDayJobId = `midday-${task.id}`;
      const existingMidDay = await queues.midDayEncouragement.getJob(midDayJobId);
      if (existingMidDay) await existingMidDay.remove();

      if (offsetHours >= 2) {
        const midpointDelayMs = Math.floor(checkinDelay / 2);
        const checkinTime = new Date(Date.now() + checkinDelay).toISOString();

        await queues.midDayEncouragement.add(
          'midday-encouragement',
          {
            userId,
            taskId: task.id,
            taskText: tasks[0],
            checkinTime,
          },
          {
            delay: midpointDelayMs,
            jobId: midDayJobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }
        );
        console.log(`[TASK] Mid-day encouragement scheduled for user ${userId} in ${offsetHours / 2}h`);
      }

      console.log(`[TASK] ${tasks.length} task(s) set for user ${userId}, check-in in ${offsetHours}h`);
    } catch (queueErr) {
      console.error('[TASK] Failed to schedule check-in:', queueErr);
    }

    return reply.send({
      success: true,
      task: {
        id: task.id,
        taskText: task.task_text,
        task2Text: task.task_2_text || null,
        task3Text: task.task_3_text || null,
        taskDate: task.task_date,
        status: task.status,
      },
    });
  });
}
