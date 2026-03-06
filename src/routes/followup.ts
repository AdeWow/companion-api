import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { selectMessage } from '../config/messagePools';
import { maybeGetInsight } from '../config/insightLines';

const VALID_FOLLOWUP_STATUSES = ['done', 'still_going', 'calling_it'];

export default async function followupRoutes(fastify: FastifyInstance) {
  // POST /followup — User responds to follow-up check-in
  fastify.post('/followup', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const userId = request.userId;
    const { taskId, status } = request.body as {
      taskId: string;
      status: 'done' | 'still_going' | 'calling_it';
    };

    if (!taskId || !status) {
      return reply.status(400).send({ error: 'taskId and status are required' });
    }

    if (!VALID_FOLLOWUP_STATUSES.includes(status)) {
      return reply.status(400).send({
        error: `status must be one of: ${VALID_FOLLOWUP_STATUSES.join(', ')}`,
      });
    }

    // Build update fields
    const updateFields: Record<string, any> = {
      followup_status: status,
      followup_responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update main status based on follow-up response
    if (status === 'done') {
      updateFields.status = 'done';
    }
    // 'calling_it' and 'still_going' don't change the main status

    // Update task
    const { data: task, error } = await supabaseAdmin
      .from('companion_daily_tasks')
      .update(updateFields)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Fetch archetype for message selection
    const { data: quiz } = await supabaseAdmin
      .from('quiz_results')
      .select('archetype')
      .eq('user_id', userId)
      .single();

    const archetype = quiz?.archetype || 'universal';
    const responseText = selectMessage('followup_outcome', archetype, status);
    const insight = maybeGetInsight(archetype, `post_${status}`);

    return reply.send({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        followupStatus: task.followup_status,
      },
      response: {
        text: responseText,
      },
      insight,
    });
  });
}
