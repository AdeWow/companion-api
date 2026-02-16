import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

export default async function dailyRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/daily',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Fetch user profile + settings in parallel with today's daily log
      const [userResult, dailyResult] = await Promise.all([
        supabaseAdmin
          .from('companion_user_settings')
          .select('archetype, companion_name, wake_time, timezone')
          .eq('user_id', userId)
          .single(),
        supabaseAdmin
          .from('daily_logs')
          .select('state, task_text, task_set_at, checkin_response')
          .eq('user_id', userId)
          .eq('date', today)
          .single(),
      ]);

      if (userResult.error && userResult.error.code !== 'PGRST116') {
        fastify.log.error({ error: userResult.error }, '[DAILY] Failed to fetch user settings');
        return reply.code(500).send({ error: 'Failed to fetch user settings' });
      }

      // Build today object — null if no daily log exists (morning not yet triggered)
      let todayData = null;
      if (dailyResult.data) {
        todayData = {
          date: today,
          state: dailyResult.data.state,
          task_text: dailyResult.data.task_text,
          task_set_at: dailyResult.data.task_set_at,
          checkin_response: dailyResult.data.checkin_response,
        };
      }

      // Build user object
      const userData = userResult.data
        ? {
            archetype: userResult.data.archetype,
            companion_name: userResult.data.companion_name,
            wake_time: userResult.data.wake_time,
            timezone: userResult.data.timezone,
          }
        : null;

      return {
        today: todayData,
        user: userData,
      };
    },
  );
}
