import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import type { PushTokenBody } from '../types';

export default async function pushTokenRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: PushTokenBody }>(
    '/push-token',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { token, platform } = request.body;
      const userId = request.userId;

      if (!token || !platform) {
        return reply.code(400).send({ error: 'Missing token or platform' });
      }

      if (platform !== 'ios' && platform !== 'android') {
        return reply.code(400).send({ error: 'Platform must be "ios" or "android"' });
      }

      // Upsert the push token for this user
      const { error } = await supabaseAdmin
        .from('push_tokens')
        .upsert(
          {
            user_id: userId,
            token,
            platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );

      if (error) {
        fastify.log.error({ error }, '[PUSH] Failed to save push token');
        return reply.code(500).send({ error: 'Failed to save push token' });
      }

      return { success: true };
    },
  );
}
