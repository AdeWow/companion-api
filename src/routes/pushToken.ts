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

      if (!token) {
        return reply.code(400).send({ error: 'Missing token' });
      }

      if (platform) {
        fastify.log.info({ platform }, '[PUSH] Platform received (not stored yet)');
      }

      // Upsert expo_push_token on companion_user_settings
      const { error } = await supabaseAdmin
        .from('companion_user_settings')
        .update({ expo_push_token: token })
        .eq('user_id', userId);

      if (error) {
        fastify.log.error({ error }, '[PUSH] Failed to save push token');
        return reply.code(500).send({ error: 'Failed to save push token' });
      }

      return { success: true };
    },
  );
}
