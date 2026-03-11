import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

export default async function thoughtRoutes(fastify: FastifyInstance) {
  // Save brain dump items as thoughts
  fastify.post(
    '/thoughts/dump',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;
      const { items, aiPrioritization } = request.body as {
        items: string[];
        aiPrioritization?: { prioritized: string[]; reasoning: string };
      };

      if (!items || !Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({ error: 'Items required' });
      }

      const thoughts = items.map((item) => ({
        user_id: userId,
        content: item.trim(),
        source: 'brain_dump',
        status: 'active',
        metadata: aiPrioritization
          ? {
              wasPrioritized: aiPrioritization.prioritized.some((p) =>
                p.toLowerCase().includes(item.toLowerCase().substring(0, 20))
              ),
              aiReasoning: aiPrioritization.reasoning,
            }
          : {},
      }));

      const { error } = await supabaseAdmin
        .from('companion_thoughts')
        .insert(thoughts);

      if (error) {
        console.error('[THOUGHTS] Dump save failed:', error);
        return reply.status(500).send({ error: 'Failed to save thoughts' });
      }

      return { success: true, saved: items.length };
    }
  );

  // Save chat exchanges
  fastify.post(
    '/thoughts/chat',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;
      const { userMessage, proliResponse, context } = request.body as {
        userMessage: string;
        proliResponse: string;
        context?: string;
      };

      if (!userMessage || typeof userMessage !== 'string') {
        return reply.status(400).send({ error: 'userMessage required' });
      }

      const { error } = await supabaseAdmin
        .from('companion_thoughts')
        .insert({
          user_id: userId,
          content: userMessage,
          source: 'chat',
          status: 'active',
          metadata: {
            proliResponse,
            context,
            date: new Date().toISOString().split('T')[0],
          },
        });

      if (error) {
        console.error('[THOUGHTS] Chat save failed:', error);
        return reply.status(500).send({ error: 'Failed to save thought' });
      }

      return { success: true };
    }
  );

  // Get unaddressed thoughts
  fastify.get(
    '/thoughts/active',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;

      const { data, error } = await supabaseAdmin
        .from('companion_thoughts')
        .select('id, content, source, created_at, metadata')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[THOUGHTS] Fetch active failed:', error);
        return reply.status(500).send({ error: 'Failed to fetch thoughts' });
      }

      return { thoughts: data || [] };
    }
  );

  // Mark thought as addressed or dismissed
  fastify.patch(
    '/thoughts/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;
      const { id } = request.params as { id: string };
      const { status } = request.body as {
        status: 'addressed' | 'dismissed';
      };

      if (!status || !['addressed', 'dismissed'].includes(status)) {
        return reply.status(400).send({ error: 'Status must be addressed or dismissed' });
      }

      const { error } = await supabaseAdmin
        .from('companion_thoughts')
        .update({
          status,
          addressed_date:
            status === 'addressed'
              ? new Date().toISOString().split('T')[0]
              : null,
        })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('[THOUGHTS] Update failed:', error);
        return reply.status(500).send({ error: 'Failed to update thought' });
      }

      return { success: true };
    }
  );
}
