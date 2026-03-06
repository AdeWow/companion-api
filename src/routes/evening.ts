import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';

const VALID_RESPONSES = ['good', 'okay', 'tough'];

const EVENING_MESSAGES: Record<string, string> = {
  good: 'Nice. Carry that into tomorrow.',
  okay: 'Steady days add up. See you in the morning.',
  tough: "Tough days happen. Tomorrow's a reset.",
};

export default async function eveningRoutes(fastify: FastifyInstance) {
  // POST /evening — User responds to evening reflection
  fastify.post('/evening', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const { taskId, response } = request.body as {
      taskId: string;
      response: 'good' | 'okay' | 'tough';
    };

    if (!taskId || !response) {
      return reply.status(400).send({ error: 'taskId and response are required' });
    }

    if (!VALID_RESPONSES.includes(response)) {
      return reply.status(400).send({
        error: `response must be one of: ${VALID_RESPONSES.join(', ')}`,
      });
    }

    const { data: task, error } = await supabaseAdmin
      .from('companion_daily_tasks')
      .update({
        evening_response: response,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const responseText = EVENING_MESSAGES[response] || 'Got it.';

    return reply.send({
      success: true,
      task: {
        id: task.id,
        eveningResponse: task.evening_response,
      },
      response: {
        text: responseText,
      },
    });
  });
}
