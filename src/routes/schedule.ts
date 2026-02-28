import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { scheduleMorningPrompt } from '../workers/morningPrompt';

export default async function scheduleRoutes(fastify: FastifyInstance) {
  // POST /schedule/morning — Called during onboarding to kick off the daily cycle
  fastify.post('/schedule/morning', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;

    // Get user's morning time and timezone
    const { data: settings, error } = await supabaseAdmin
      .from('companion_user_settings')
      .select('morning_time, timezone')
      .eq('user_id', userId)
      .single();

    if (error || !settings?.morning_time) {
      return reply.status(400).send({ error: 'Morning time not configured' });
    }

    const timezone = settings.timezone || 'America/New_York';

    await scheduleMorningPrompt(userId, settings.morning_time, timezone);

    return reply.send({
      success: true,
      morningTime: settings.morning_time,
      timezone,
    });
  });
}
