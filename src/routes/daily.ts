import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

export default async function dailyRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/daily',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;

      // 1. Fetch user settings first (needed for timezone)
      const settingsResult = await supabaseAdmin
        .from('companion_user_settings')
        .select('morning_time, evening_time, timezone, directiveness, weekend_mode')
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

      // Compute today's date in the user's timezone
      const tz = settings.timezone || 'UTC';
      const today = new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD

      // 2. Fetch archetype + today's daily log in parallel
      const [archetypeResult, dailyResult] = await Promise.all([
        supabaseAdmin
          .from('quiz_results')
          .select('archetype_result')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single(),
        supabaseAdmin
          .from('companion_daily_log')
          .select('current_state, task_text, task_set_at, checkin_response')
          .eq('user_id', userId)
          .eq('log_date', today)
          .single(),
      ]);

      // Build today object — null if no daily log exists
      let todayData = null;
      if (dailyResult.data) {
        todayData = {
          date: today,
          state: dailyResult.data.current_state,
          task_text: dailyResult.data.task_text,
          task_set_at: dailyResult.data.task_set_at,
          checkin_response: dailyResult.data.checkin_response,
        };
      }

      // Build user object
      const archetype = archetypeResult.data?.archetype_result ?? null;

      return {
        today: todayData,
        user: {
          archetype,
          morning_time: settings.morning_time,
          timezone: settings.timezone,
        },
      };
    },
  );
}
