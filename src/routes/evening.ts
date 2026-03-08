import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { selectMessage } from '../config/messagePools';
import { maybeGetInsight } from '../config/insightLines';
import { computePatterns } from '../lib/patternEngine';
import { generateOutcomeMessage } from '../lib/personalMessages';

const VALID_RESPONSES = ['good', 'okay', 'tough'];

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

    // Fetch archetype for message selection
    const { data: quiz } = await supabaseAdmin
      .from('quiz_results')
      .select('archetype')
      .eq('user_id', userId)
      .single();

    const archetype = quiz?.archetype || 'universal';

    // Compute patterns and try personal message first
    const patterns = await computePatterns(supabaseAdmin, userId);
    const personalMessage = generateOutcomeMessage(patterns, archetype, response, task.task_text || '');
    const responseText = personalMessage || selectMessage('evening_outcome', archetype, response);
    const insight = maybeGetInsight(archetype, 'evening', patterns.daysActive);

    return reply.send({
      success: true,
      task: {
        id: task.id,
        eveningResponse: task.evening_response,
      },
      response: {
        text: responseText,
      },
      insight,
      patterns: {
        completionRate: patterns.completionRate,
        currentStreak: patterns.currentStreak,
        totalCompleted: patterns.totalTasksCompleted,
        trend: patterns.completionTrend,
      },
    });
  });
}
