import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { getRedis } from '../lib/redis';
import { getQueues } from '../lib/queue';
import type { HealthResponse } from '../types';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, _reply) => {
    // Check Redis status
    let redisStatus: HealthResponse['services']['redis'] = 'not_configured';
    const redis = getRedis();
    if (redis) {
      redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';
    }

    // Check Supabase status
    let supabaseStatus: HealthResponse['services']['supabase'] = 'error';
    try {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .limit(1);
      supabaseStatus = error ? 'error' : 'connected';
    } catch {
      supabaseStatus = 'error';
    }

    // Check queue status
    let queueStatus = 'not_available';
    if (redis) {
      try {
        const queues = getQueues();
        const waiting = await queues.morningPrompt.getWaitingCount();
        const delayed = await queues.morningPrompt.getDelayedCount();
        queueStatus = `ok (${waiting} waiting, ${delayed} delayed)`;
      } catch {
        queueStatus = 'error';
      }
    }

    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      services: {
        redis: redisStatus,
        supabase: supabaseStatus,
        queues: queueStatus,
      },
    };

    return response;
  });
}
