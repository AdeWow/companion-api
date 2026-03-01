import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getArchetypeConfig } from '../config/archetypeConfig';

export default async function dailyRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/daily',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;

      // 1. Fetch user settings (needed for timezone)
      const settingsResult = await supabaseAdmin
        .from('companion_user_settings')
        .select('morning_time, timezone, directiveness')
        .eq('user_id', userId)
        .single();

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        fastify.log.error({ error: settingsResult.error }, '[DAILY] Failed to fetch user settings');
        return reply.code(500).send({ error: 'Failed to fetch user settings' });
      }

      if (!settingsResult.data) {
        return reply.code(404).send({ error: 'User settings not found' });
      }

      const settings = settingsResult.data;
      const tz = settings.timezone || 'America/New_York';
      const today = new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD

      // 2. Fetch archetype + today's daily task in parallel
      const [archetypeResult, taskResult] = await Promise.all([
        supabaseAdmin
          .from('quiz_results')
          .select('archetype')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single(),
        supabaseAdmin
          .from('companion_daily_tasks')
          .select('id, task_text, task_date, status, morning_sent_at, checkin_sent_at, checkin_responded_at, energy_level, is_rest_day, context_mode, task_2_text, task_2_status, task_3_text, task_3_status, created_at')
          .eq('user_id', userId)
          .eq('task_date', today)
          .single(),
      ]);

      // Build task object — null if no task row exists for today
      let task = null;
      let morningSent = false;

      if (taskResult.data) {
        const t = taskResult.data;
        morningSent = !!t.morning_sent_at;
        task = {
          id: t.id,
          taskText: t.task_text || '',
          taskDate: t.task_date,
          status: t.status,
          morningSentAt: t.morning_sent_at || null,
          checkinSentAt: t.checkin_sent_at || null,
          checkinRespondedAt: t.checkin_responded_at || null,
          energyLevel: t.energy_level || null,
          isRestDay: t.is_rest_day || false,
          task2Text: t.task_2_text || null,
          task2Status: t.task_2_status || null,
          task3Text: t.task_3_text || null,
          task3Status: t.task_3_status || null,
          contextMode: t.context_mode || null,
        };
      }

      const archetype = archetypeResult.data?.archetype ?? null;
      const config = getArchetypeConfig(archetype);

      console.log('[DAILY] archetype:', archetype, 'config:', JSON.stringify({
        maxTasks: config.maxTasks,
        morningStyle: config.morningStyle,
        taskFraming: config.taskFraming,
        taskSizeCheck: config.taskSizeCheck,
        checkinLabels: config.checkinLabels,
        postCompletion: config.postCompletion,
        lowEnergyOptOut: config.lowEnergyOptOut,
        idleAllowsNewTask: config.idleAllowsNewTask,
      }));

      return {
        today: {
          date: today,
          task,
          morningSent,
        },
        user: {
          archetype,
          morningTime: settings.morning_time,
          timezone: settings.timezone,
          config: {
            maxTasks: config.maxTasks,
            morningStyle: config.morningStyle,
            taskFraming: config.taskFraming,
            taskSizeCheck: config.taskSizeCheck,
            checkinLabels: config.checkinLabels,
            postCompletion: config.postCompletion,
            lowEnergyOptOut: config.lowEnergyOptOut,
            idleAllowsNewTask: config.idleAllowsNewTask,
            dailySummaryStyle: config.dailySummaryStyle,
          },
        },
      };
    },
  );
}
