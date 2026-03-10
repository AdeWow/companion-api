import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { aiPrioritize, aiChat, AIContext } from '../lib/ai';
import { computePatterns } from '../lib/patternEngine';
import { getArchetypeConfig } from '../config/archetypeConfig';

// Simple in-memory rate limiter (resets on server restart)
const aiUsage = new Map<string, { count: number; date: string }>();
const MAX_AI_CALLS_PER_DAY = 10;

function checkRateLimit(userId: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  const usage = aiUsage.get(userId);

  if (!usage || usage.date !== today) {
    aiUsage.set(userId, { count: 1, date: today });
    return true;
  }

  if (usage.count >= MAX_AI_CALLS_PER_DAY) return false;

  usage.count++;
  return true;
}

async function buildContext(userId: string): Promise<AIContext> {
  const [patterns, archetypeResult, recentTasksResult, settingsResult] =
    await Promise.all([
      computePatterns(supabaseAdmin, userId),
      supabaseAdmin
        .from('quiz_results')
        .select('archetype')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
      supabaseAdmin
        .from('companion_daily_tasks')
        .select('task_text, status, task_date')
        .eq('user_id', userId)
        .order('task_date', { ascending: false })
        .limit(7),
      supabaseAdmin
        .from('companion_user_settings')
        .select('timezone')
        .eq('user_id', userId)
        .single(),
    ]);

  const archetype = archetypeResult.data?.archetype || 'adaptive_generalist';
  const config = getArchetypeConfig(archetype);
  const tz = settingsResult.data?.timezone || 'America/New_York';

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', {
    timeZone: tz,
    weekday: 'long',
  });
  const hour = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: 'numeric' }),
    10
  );

  return {
    archetype,
    archetypeLabel: config.label,
    patterns: {
      completionRate: patterns.completionRate,
      currentStreak: patterns.currentStreak,
      totalCompleted: patterns.totalTasksCompleted,
      bestDay: patterns.bestDayOfWeek,
      trend: patterns.completionTrend,
      daysActive: patterns.daysActive,
    },
    recentTasks: (recentTasksResult.data || []).map((t) => ({
      text: t.task_text || '',
      status: t.status,
      date: t.task_date,
    })),
    dayOfWeek,
    timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
    isWeekend: dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday',
  };
}

export default async function aiRoutes(fastify: FastifyInstance) {
  // Brain dump prioritization
  fastify.post(
    '/ai/prioritize',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;

      const { items } = request.body as { items: string[] };

      if (!items || !Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({ error: 'Items array required' });
      }

      if (items.length > 20) {
        return reply.status(400).send({ error: 'Maximum 20 items' });
      }

      if (!checkRateLimit(userId)) {
        return reply.status(429).send({ error: 'Daily AI limit reached (10 calls/day)' });
      }

      try {
        const context = await buildContext(userId);
        const result = await aiPrioritize(items, context);
        return { success: true, ...result };
      } catch (error: any) {
        console.error('[AI] Prioritize error:', error.message);
        return reply.status(500).send({ error: 'AI unavailable' });
      }
    }
  );

  // Conversational chat
  fastify.post(
    '/ai/chat',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.userId;

      const { message, history } = request.body as {
        message: string;
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      };

      if (!message || typeof message !== 'string') {
        return reply.status(400).send({ error: 'Message required' });
      }

      if (!checkRateLimit(userId)) {
        return reply.status(429).send({ error: 'Daily AI limit reached (10 calls/day)' });
      }

      try {
        const context = await buildContext(userId);
        const response = await aiChat(message, history || [], context);
        return { success: true, message: response };
      } catch (error: any) {
        console.error('[AI] Chat error:', error.message);
        return reply.status(500).send({ error: 'AI unavailable' });
      }
    }
  );
}
