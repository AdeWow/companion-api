import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { selectMessage } from '../config/messagePools';
import { maybeGetInsight } from '../config/insightLines';
import { computePatterns } from '../lib/patternEngine';
import { generateOutcomeMessage } from '../lib/personalMessages';

const VALID_RESPONSES = ['good', 'okay', 'tough'];

function getEveningResponse(
  archetype: string,
  response: string,
  taskStatus: string
): string {
  if (response === 'good' && taskStatus === 'done') {
    const messages: Record<string, string[]> = {
      structured_achiever: [
        "Good day, task shipped. That's the formula. Keep running it.",
        "Productive and satisfied. Your system is working.",
      ],
      anxious_perfectionist: [
        "A good day AND you finished something. Sit with that. It's real.",
        "Today was good. Your brain will try to minimize it. Don't let it.",
      ],
      strategic_planner: [
        "Good day. Execution happened. That's what matters most for your type.",
        "Planned less, shipped more, felt good. That's the pattern to repeat.",
      ],
      chaotic_creative: [
        "Good day. The energy was there and you used it. That's your best case.",
        "When the spark and the finish align — that's a Chaotic Creative at peak.",
      ],
    };
    const pool = messages[archetype] || ["Good day. Carry that into tomorrow."];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (response === 'tough' && taskStatus === 'not_started') {
    const messages: Record<string, string[]> = {
      anxious_perfectionist: [
        "Tough day, nothing started. That's the anxiety talking, not you. Tomorrow is separate.",
        "The resistance won today. It doesn't win the week. Be gentle tonight.",
      ],
      strategic_planner: [
        "Tough day. Did planning eat the execution time? Be honest in the morning.",
        "Nothing shipped and it feels bad. Use that feeling tomorrow — ship early.",
      ],
      chaotic_creative: [
        "No spark today. That's not a character flaw — it's a battery cycle. Recharge.",
        "Tough day. Your brain processes in the background. Tomorrow might surprise you.",
      ],
    };
    const pool = messages[archetype] || ["Tough days happen. Tomorrow's a reset."];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (response === 'okay') {
    return "Steady days add up. Consistency isn't exciting but it's powerful.";
  }

  if (response === 'tough') {
    return "Tough day. You got through it. That counts for something.";
  }

  if (response === 'good') {
    return "Good day. Carry that into tomorrow.";
  }

  return "Day's done. See you in the morning.";
}

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

    // Compute patterns and try personal + contextual message first
    const patterns = await computePatterns(supabaseAdmin, userId);
    const personalMessage = generateOutcomeMessage(patterns, archetype, response, task.task_text || '');
    const contextualMessage = getEveningResponse(archetype, response, task.status || 'pending');
    const responseText = personalMessage || contextualMessage;
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
